import * as THREE from 'three'
import Experience from '../Experience.js'
import { QUALITY } from '../Utils/device.js'
import { LIGHTS, FIRE, LOOK_AT, MODEL_OFFSET_Y } from '../config.js'
import { setupMoodTint, applyMoodTint } from './MoodTint.js'
import { getMouthTarget, LIP_SYNC, MOUTH_SHAPES } from '@/services/lipSync'

// Luces que Blender coloca dentro de la calabaza (ojos y boca). No se usan.
const INTERIOR_LIGHTS = ['Candle_Light_L', 'Candle_Light_R', 'Mouth_Light']

// Superficie de la mesa (y = 0): la calabaza mira dónde cae el cursor sobre ella
const TABLE_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)

const CROSS_FADE = 0.4 // segundos de mezcla entre clips

// Las tres velas son las preguntas que le quedan al jugador. Se apagan de fuera hacia dentro:
// las últimas en apagarse son las que están junto a la calabaza
const CANDLE_ORDER = ['Candle_R2', 'Candle_L1', 'Candle_R1']
// El modelo trae cinco velas; las de los extremos no se usan
const UNUSED_CANDLES = ['Candle_R3', 'Candle_L2']
const CANDLE_SPEED = 2.5 // rapidez del fundido al apagarse o encenderse

const OVER_HEAD_MARGIN = 0.25 // espacio entre el tallo y lo que flota encima (la cuenta atrás)

// La calabaza oráculo con sus velas (pumpkin_oracle.glb).
// - animation: clip del GLB ('idle', 'hablar', 'reir'); cada uno se repite mientras dure su estado
// - gaze: hacia dónde mira
//     'free'   → conversación: en idle los ojos siguen al cursor (y la cabeza si LOOK_AT.head)
//     'table'  → cartas en la mesa: cabeza y ojos miran el punto de la mesa bajo el cursor
//     'camera' → interpretando la tirada: la cabeza mira a la cámara y los ojos al frente
export default class Pumpkin {
  constructor() {
    this.experience = new Experience()
    this.scene = this.experience.scene
    this.resources = this.experience.resources
    this.time = this.experience.time
    this.camera = this.experience.camera
    this.debug = this.experience.debug

    this.resource = this.resources.items.pumpkinModel
    this.animationName = 'idle'
    this.gaze = 'free'

    this.setModel()
    this.setCandleFlames()
    this.setAnimation()
    this.setMouth()
    this.setLook()
    this.setDebug()
  }

  setModel() {
    this.model = this.resource.scene
    prepareModel(this.model)
    this.moodLights = this.model.userData.moodLights
    this.scene.add(this.model)
  }

  // Llama y luz de cada vela, en el orden en que se apagan. level: 1 encendida, 0 apagada
  setCandleFlames() {
    for (const name of UNUSED_CANDLES) {
      const candle = this.model.getObjectByName(name)
      if (candle) candle.visible = false
    }
    this.candles = CANDLE_ORDER.map((name) => {
      const flame = this.model.getObjectByName(`${name}_Flame`)
      const light = this.model.getObjectByName(`${name}_Light`)
      // Tamaño original (el modelo se reutiliza si la Experience se recrea): se guarda una vez
      if (flame) flame.userData.baseScale ??= flame.scale.clone()
      return { flame, light, level: 1, target: 1 }
    }).filter((candle) => candle.flame)
    this.candles.forEach(applyCandle)
  }

  // Deja encendidas `lit` velas. instant: sin fundido (al entrar)
  setCandles(lit, instant = false) {
    this.candles.forEach((candle, i) => {
      candle.target = i < this.candles.length - lit ? 0 : 1
      if (instant) {
        candle.level = candle.target
        applyCandle(candle)
      }
    })
  }

  updateCandles() {
    const t = 1 - Math.exp(-CANDLE_SPEED * this.time.delta)
    for (const candle of this.candles) {
      if (candle.level === candle.target) continue
      candle.level += (candle.target - candle.level) * t
      if (Math.abs(candle.target - candle.level) < 0.01) candle.level = candle.target
      applyCandle(candle)
    }
  }

  setAnimation() {
    this.mixer = new THREE.AnimationMixer(this.model)
    this.actions = Object.fromEntries(
      this.resource.animations.map((clip) => [clip.name, this.mixer.clipAction(clip)]),
    )
    this.actions[this.animationName]?.play()
  }

  // Cambia de clip con un fundido
  setAnimationName(name) {
    if (name === this.animationName) return
    this.actions[this.animationName]?.fadeOut(CROSS_FADE)
    this.actions[name]?.reset().fadeIn(CROSS_FADE).play()
    this.animationName = name
  }

  // Mallas con el morph MouthOpen (la boca tallada)
  setMouth() {
    this.mouths = []
    this.model.traverse((obj) => {
      const index = obj.morphTargetDictionary?.MouthOpen
      if (index !== undefined) this.mouths.push({ mesh: obj, index })
    })
    this.mouthLevel = 0
  }

  setLook() {
    this.head = this.model.getObjectByName('Pumpkin')
    this.eyes = ['Eye_L', 'Eye_R'].map((name) => this.model.getObjectByName(name)).filter(Boolean)
    // Posición de reposo: el clip no anima su posición, así que la guardamos una vez
    this.eyes.forEach((eye) => (eye.userData.basePosition ??= eye.position.clone()))

    this.look = {
      yaw: 0,
      pitch: 0,
      eyeX: 0,
      eyeY: 0,
      euler: new THREE.Euler(0, 0, 0, 'YXZ'), // primero gira a los lados, luego cabecea
      quat: new THREE.Quaternion(),
      target: new THREE.Vector3(),
      ndc: new THREE.Vector2(),
      raycaster: new THREE.Raycaster(),
    }

    // Mirar al cursor: se usa window (no el canvas) para seguirlo también sobre la interfaz
    this.pointer = { x: 0, y: 0 }
    this.onPointerMove = (e) => {
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1 // -1 izquierda, 1 derecha
      this.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1) // -1 abajo, 1 arriba
    }
    window.addEventListener('pointermove', this.onPointerMove)
  }

  // Punto (en el mundo) justo encima de la cabeza: sigue a la calabaza cuando el clip la mueve.
  // Lo que sobresale la cabeza (con el tallo) sobre su centro se mide una vez
  topPoint() {
    if (!this.head) return null
    if (this.headTop === undefined) {
      this.model.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(this.head)
      this.headTop = box.max.y - this.head.getWorldPosition(this.look.target).y
    }
    const point = this.head.getWorldPosition((this.topVector ??= new THREE.Vector3()))
    point.y += this.headTop + OVER_HEAD_MARGIN
    return point
  }

  // Ánimo: el fuego y las velas se funden hacia el color del ánimo (lo calcula World)
  applyMood(mix, color) {
    applyMoodTint(this.moodLights, mix, color)
  }

  update() {
    this.restoreClipPose()
    this.mixer.update(this.time.delta)
    // Después del mixer: leen lo que dejó el clip y suman encima
    this.updateMouth()
    this.updateLook()
    this.updateCandles()
  }

  // Deshace lo que la mirada y el lip-sync sumaron al clip en el fotograma anterior.
  // El mixer solo reescribe un valor si cambió desde el fotograma anterior: al empezar cada
  // bucle (los clips arrancan en 0.042 s) hay fotogramas iguales, y sin esto el giro de la
  // mirada se sumaba dos veces y la cabeza daba un salto
  restoreClipPose() {
    if (this.look.clipQuat) this.head.quaternion.copy(this.look.clipQuat)
    this.mouths.forEach((mouth) => {
      if (mouth.clipWeight === undefined) return
      mouth.mesh.morphTargetInfluences[mouth.index] = mouth.clipWeight
      mouth.clipWeight = undefined
    })
  }

  // Lip-sync: mientras habla, la boca sigue las letras de la voz encima del clip 'hablar'
  updateMouth() {
    const target = LIP_SYNC.enabled && this.animationName === 'hablar' ? getMouthTarget() : null
    if (target === null) {
      this.mouthLevel = 0
      return // fuera de 'hablar' (o sin datos de la voz), la boca es solo del clip
    }
    // Suavizado con delta: se mueve igual de rápido a 60 que a 120 fps
    const rate = target > this.mouthLevel ? LIP_SYNC.attack : LIP_SYNC.release
    this.mouthLevel += (target - this.mouthLevel) * (1 - Math.exp(-rate * this.time.delta))

    // Apertura 0–1 → rango del morph (cerrada en silencio, abierta en las vocales)
    const voiceWeight = LIP_SYNC.closed + this.mouthLevel * (LIP_SYNC.open - LIP_SYNC.closed)
    this.mouths.forEach((mouth) => {
      const { mesh, index } = mouth
      const clipWeight = (mouth.clipWeight = mesh.morphTargetInfluences[index])
      mesh.morphTargetInfluences[index] = clipWeight + (voiceWeight - clipWeight) * LIP_SYNC.mix
    })
  }

  // 'free': solo en idle; al hablar, reír o pensar vuelve suavemente al centro.
  // 'table' y 'camera' se aplican en cualquier estado
  updateLook() {
    const { head, look: l, pointer, gaze } = this
    if (!head) return
    const camera = this.camera.instance
    const delta = this.time.delta

    // Ojos al cursor: en idle (conversación) o siempre con las cartas; al frente si mira a cámara
    const following =
      LOOK_AT.enabled && gaze !== 'camera' && (gaze === 'table' || this.animationName === 'idle')
    const headFollowing = following && gaze === 'free' && LOOK_AT.head
    let targetYaw = headFollowing ? pointer.x * LOOK_AT.maxYaw : 0
    let targetPitch = headFollowing ? -pointer.y * LOOK_AT.maxPitch : 0

    // Ángulos (giro lateral y cabeceo) de la cabeza hacia un punto del mundo, en el espacio
    // de su padre, que es donde se aplica el giro
    const anglesTo = (point) => {
      const d = head.parent.worldToLocal(point).sub(head.position)
      return [Math.atan2(d.x, d.z), -Math.atan2(d.y, Math.hypot(d.x, d.z))]
    }

    if (gaze === 'camera') {
      const [yaw, pitch] = anglesTo(l.target.copy(camera.position))
      targetYaw = yaw * LOOK_AT.cameraAmount
      targetPitch = pitch * LOOK_AT.cameraAmount
    } else if (gaze === 'table' && LOOK_AT.enabled) {
      // Parte de mirar a la cámara (para que se le vea la cara desde arriba) y gira a medias
      // hacia el punto de la mesa bajo el cursor: la carta que señala
      const [camYaw, camPitch] = anglesTo(l.target.copy(camera.position))
      targetYaw = camYaw
      targetPitch = camPitch
      l.raycaster.setFromCamera(l.ndc.set(pointer.x, pointer.y), camera)
      if (l.raycaster.ray.intersectPlane(TABLE_PLANE, l.target)) {
        const [yaw, pitch] = anglesTo(l.target)
        const clampedYaw = THREE.MathUtils.clamp(yaw, -LOOK_AT.tableMaxYaw, LOOK_AT.tableMaxYaw)
        targetYaw += (clampedYaw - camYaw) * LOOK_AT.tableAmount
        targetPitch += (pitch - camPitch) * LOOK_AT.tableAmount
      }
    }

    const t = 1 - Math.exp(-LOOK_AT.smoothing * delta)
    l.yaw += (targetYaw - l.yaw) * t
    l.pitch += (targetPitch - l.pitch) * t

    l.quat.setFromEuler(l.euler.set(l.pitch, l.yaw, 0))
    l.clipQuat ??= new THREE.Quaternion()
    l.clipQuat.copy(head.quaternion) // la pose del clip, sin la mirada (ver restoreClipPose)
    head.quaternion.premultiply(l.quat)

    // Ojos: van hacia el cursor dentro de su cuenca, más rápido que la cabeza
    const targetEyeX = following ? pointer.x * LOOK_AT.eyeOffsetX : 0
    const targetEyeY = following ? pointer.y * LOOK_AT.eyeOffsetY : 0
    const te = 1 - Math.exp(-LOOK_AT.eyeSmoothing * delta)
    l.eyeX += (targetEyeX - l.eyeX) * te
    l.eyeY += (targetEyeY - l.eyeY) * te
    this.eyes.forEach((eye) => {
      const base = eye.userData.basePosition
      eye.position.set(base.x + l.eyeX, base.y + l.eyeY, base.z)
    })
  }

  // Paneles de #debug: mirada y lip-sync. Los valores se leen en cada fotograma,
  // así que los cambios se ven al instante
  setDebug() {
    this.debug.addFolder('Mirar al cursor', (look) => {
      look.add(LOOK_AT, 'enabled').name('Activado')
      look.add(LOOK_AT, 'head').name('Girar la cabeza')
      look.add(LOOK_AT, 'maxYaw', 0, 1, 0.01).name('Giro lateral máx.')
      look.add(LOOK_AT, 'maxPitch', 0, 0.6, 0.01).name('Giro vertical máx.')
      look.add(LOOK_AT, 'smoothing', 0.5, 15, 0.1).name('Velocidad')
      look.add(LOOK_AT, 'eyeOffsetX', 0, 0.2, 0.005).name('Ojos: lateral máx.')
      look.add(LOOK_AT, 'eyeOffsetY', 0, 0.2, 0.005).name('Ojos: vertical máx.')
      look.add(LOOK_AT, 'eyeSmoothing', 0.5, 30, 0.5).name('Ojos: velocidad')
      look.add(LOOK_AT, 'tableAmount', 0, 1, 0.01).name('Tarot: mirar al cursor')
      look.add(LOOK_AT, 'tableMaxYaw', 0, 1.6, 0.01).name('Tarot: giro lateral máx.')
      look.add(LOOK_AT, 'cameraAmount', 0, 1, 0.01).name('Tarot: mirar a cámara')
    })

    // 'Activado' y 'Volumen' se aplican a partir de la siguiente frase (al conectar el audio)
    this.debug.addFolder('Lip-sync', (lips) => {
      lips.add(LIP_SYNC, 'enabled').name('Activado')
      lips.add(LIP_SYNC, 'mix', 0, 1, 0.01).name('Mezcla (clip → voz)')
      lips.add(LIP_SYNC, 'lead', -0.1, 0.2, 0.005).name('Adelanto (s)')
      lips.add(LIP_SYNC, 'attack', 5, 80, 1).name('Apertura (attack)')
      lips.add(LIP_SYNC, 'release', 5, 80, 1).name('Cierre (release)')
      lips.add(LIP_SYNC, 'closed', -1.5, 0, 0.01).name('Boca cerrada')
      lips.add(LIP_SYNC, 'open', 0, 2, 0.01).name('Boca abierta')
      lips.add(LIP_SYNC, 'volume', 0, 1, 0.01).name('Volumen (modula)')
      lips.add(LIP_SYNC, 'gain', 1, 15, 0.1).name('Volumen: ganancia')
      lips.add(LIP_SYNC, 'noiseFloor', 0, 0.15, 0.005).name('Volumen: umbral')
      lips.add(LIP_SYNC, 'curve', 0.5, 3, 0.05).name('Volumen: curva')

      const shapes = lips.addFolder('Apertura por sonido').close()
      shapes.add(MOUTH_SHAPES, 'a', 0, 1, 0.01).name('a')
      shapes.add(MOUTH_SHAPES, 'o', 0, 1, 0.01).name('o')
      shapes.add(MOUTH_SHAPES, 'e', 0, 1, 0.01).name('e')
      shapes.add(MOUTH_SHAPES, 'i', 0, 1, 0.01).name('i / y')
      shapes.add(MOUTH_SHAPES, 'u', 0, 1, 0.01).name('u')
      shapes.add(MOUTH_SHAPES, 'labial', 0, 1, 0.01).name('m b p')
      shapes.add(MOUTH_SHAPES, 'labiodental', 0, 1, 0.01).name('f v')
      shapes.add(MOUTH_SHAPES, 'consonant', 0, 1, 0.01).name('otras consonantes')
    })
  }

  destroy() {
    window.removeEventListener('pointermove', this.onPointerMove)
    this.mixer.stopAllAction()
    this.model.removeFromParent()
  }
}

// Ajusta el GLB una sola vez (Resources reutiliza el mismo modelo si la Experience se recrea)
function prepareModel(model) {
  if (model.userData.prepared) return
  model.userData.prepared = true

  const lights = []
  const interior = []
  model.traverse((obj) => {
    if (obj.isLight) (INTERIOR_LIGHTS.includes(obj.name) ? interior : lights).push(obj)
  })
  interior.forEach((light) => light.removeFromParent())

  // Sin suelo: la calabaza y sus velas se apoyan en la mesa de tarot (y = 0, igual que el suelo)
  model.getObjectByName('Ground')?.removeFromParent()

  // Sombras sobre la mesa. Las llamas y el fuego emiten luz: no proyectan sombra
  model.traverse((obj) => {
    if (!obj.isMesh) return
    obj.castShadow = !/Flame|Fire/.test(obj.material?.name ?? '')
    obj.receiveShadow = true
  })

  // Sube solo la calabaza (no las velas). Su posición la anima el clip, así que
  // va dentro de un grupo elevado: el clip mueve la calabaza y el grupo le suma la altura
  const pumpkin = model.getObjectByName('Pumpkin')
  if (pumpkin) {
    const lift = new THREE.Group()
    lift.name = 'Pumpkin_Lift'
    lift.position.y = MODEL_OFFSET_Y
    pumpkin.parent.add(lift)
    lift.add(pumpkin)
  }

  setupLights(lights)
  setupFire(model)
  model.userData.moodLights = setupMoodTint(model)
}

// Una vela a medio apagar: la llama se encoge hacia la mecha y su luz baja a la vez
function applyCandle({ flame, light, level }) {
  flame.scale.copy(flame.userData.baseScale).multiplyScalar(level)
  flame.visible = level > 0
  if (light) light.intensity = light.userData.baseIntensity * level
}

// Las luces del GLB (KHR_lights_punctual) vienen en candelas (vatios de Blender × 683) y
// queman la imagen. Las luces de área de Blender se exportaron como focos "*_Spot".
function setupLights(lights) {
  for (const light of lights) {
    const isStudio = light.name.endsWith('_Spot')
    light.intensity *= LIGHTS.unitScale * (isStudio ? LIGHTS.studioScale : LIGHTS.practicalScale)
    light.userData.baseIntensity = light.intensity

    const casts = LIGHTS.castShadowsFrom.includes(light.name)
    light.castShadow = casts
    if (casts) {
      light.shadow.mapSize.setScalar(QUALITY.shadowMapSize)
      light.shadow.bias = -0.0004
      light.shadow.normalBias = 0.02
      light.shadow.radius = 4
      light.shadow.camera.near = 0.5
      light.shadow.camera.far = 20
    }
  }
}

// Brillo del fuego: sube la emisión de las llamas (velas + ojos) y de la lengua
function setupFire(model) {
  model.traverse((obj) => {
    if (!obj.isMesh) return
    const m = obj.material
    if (m.name === 'Candle_Flame') m.emissiveIntensity = FIRE.flameEmissive
    if (m.name === 'Tongue_Fire') m.emissiveIntensity = FIRE.tongueEmissive
  })
}
