import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import { getVoiceLevel, LIP_SYNC } from '@/services/lipSync'
import { moods, DEFAULT_MOOD } from '@/theme/moods'
import { setupLights } from './three/world/setupLights'
import { setupFire } from './three/world/setupFire'
import { setupMoodTint, applyMoodTint } from './three/effects/MoodTint'
import { LOOK_AT } from './three/config'

const MODEL_URL = '/models/pumpkin_oracle.glb'

// Luces que Blender coloca dentro de la calabaza (ojos y boca). No se usan.
const INTERIOR_LIGHTS = ['Candle_Light_L', 'Candle_Light_R', 'Mouth_Light']

// Las luces del GLB vienen en candelas (vatios de Blender × 683) y queman la imagen:
// se convierten una sola vez, porque useGLTF reutiliza la misma escena entre montajes.
function prepareScene(scene) {
  if (scene.userData.prepared) return
  scene.userData.prepared = true

  const lights = []
  const interior = []
  scene.traverse((obj) => {
    if (obj.isLight) (INTERIOR_LIGHTS.includes(obj.name) ? interior : lights).push(obj)
  })
  interior.forEach((light) => light.removeFromParent())

  setupLights(lights)
  setupFire(scene)
  scene.userData.moodLights = setupMoodTint(scene)
}

export default function Pumpkin({ animation = 'idle', mood = DEFAULT_MOOD }) {
  const { scene, animations } = useGLTF(MODEL_URL)
  const { actions } = useAnimations(animations, scene)

  useLayoutEffect(() => prepareScene(scene), [scene])

  useEffect(() => {
    const action = actions[animation]
    action?.reset().fadeIn(0.4).play()
    return () => action?.fadeOut(0.4)
  }, [actions, animation])

  // Mallas con el morph MouthOpen (la boca tallada)
  const mouths = useMemo(() => {
    const found = []
    scene.traverse((obj) => {
      const index = obj.morphTargetDictionary?.MouthOpen
      if (index !== undefined) found.push({ mesh: obj, index })
    })
    return found
  }, [scene])

  // Lip-sync combinado: mientras habla, la boca mezcla el clip 'hablar' con el volumen de la voz.
  // Se registra después de useAnimations, así corre justo tras el mixer y lee lo que dejó el clip.
  const voiceLevel = useRef(0)
  useFrame(() => {
    if (!LIP_SYNC.enabled || animation !== 'hablar') {
      voiceLevel.current = 0
      return // fuera de 'hablar', la boca es solo del clip
    }
    const target = getVoiceLevel()
    const speed = target > voiceLevel.current ? LIP_SYNC.attack : LIP_SYNC.release
    voiceLevel.current += (target - voiceLevel.current) * speed

    // Nivel 0–1 → rango del morph (cerrada en silencio, abierta en los golpes de voz)
    const voiceWeight = LIP_SYNC.closed + voiceLevel.current * (LIP_SYNC.open - LIP_SYNC.closed)
    mouths.forEach(({ mesh, index }) => {
      const clipWeight = mesh.morphTargetInfluences[index]
      mesh.morphTargetInfluences[index] = clipWeight + (voiceWeight - clipWeight) * LIP_SYNC.mix
    })
  })

  // Ánimo: el fuego y las velas se funden hacia el color del ánimo (violeta al pensar).
  // Usa los tiempos de entrada/salida de moods.js, igual que la interfaz en tokens.css.
  const moodMix = useRef(0)
  const moodTint = useRef(moods.calm.colors.light)
  useFrame((_, delta) => {
    const entering = mood !== DEFAULT_MOOD
    if (entering) moodTint.current = moods[mood].colors.light // al salir conserva el último tinte
    const target = entering ? 1 : 0
    if (moodMix.current === target) return

    const { transition } = moods[entering ? mood : DEFAULT_MOOD]
    const duration = (entering ? transition.in : transition.out) / 1000
    moodMix.current += (target - moodMix.current) * (1 - Math.exp((-3 * delta) / duration))
    if (Math.abs(target - moodMix.current) < 0.001) moodMix.current = target
    applyMoodTint(scene.userData.moodLights, moodMix.current, moodTint.current)
  })

  // Mirar al cursor: se usa window (no el canvas) para seguirlo también sobre la barra de pregunta
  const pointer = useRef({ x: 0, y: 0 })
  useEffect(() => {
    const onMove = (e) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1 // -1 izquierda, 1 derecha
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1) // -1 abajo, 1 arriba
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  // Solo en idle: al hablar o pensar vuelve suavemente al centro.
  // Corre tras el mixer y suma el giro encima del que puso el clip.
  const head = useMemo(() => scene.getObjectByName('Pumpkin'), [scene])
  const eyes = useMemo(() => {
    const found = ['Eye_L', 'Eye_R'].map((name) => scene.getObjectByName(name)).filter(Boolean)
    // Posición de reposo: el clip no anima su posición, así que la guardamos una vez
    found.forEach((eye) => (eye.userData.basePosition ??= eye.position.clone()))
    return found
  }, [scene])
  const look = useRef({
    yaw: 0,
    pitch: 0,
    eyeX: 0,
    eyeY: 0,
    euler: new THREE.Euler(),
    quat: new THREE.Quaternion(),
  })
  useFrame((_, delta) => {
    if (!head) return
    const following = LOOK_AT.enabled && animation === 'idle'
    const targetYaw = following ? pointer.current.x * LOOK_AT.maxYaw : 0
    const targetPitch = following ? -pointer.current.y * LOOK_AT.maxPitch : 0

    const l = look.current
    const t = 1 - Math.exp(-LOOK_AT.smoothing * delta)
    l.yaw += (targetYaw - l.yaw) * t
    l.pitch += (targetPitch - l.pitch) * t

    l.quat.setFromEuler(l.euler.set(l.pitch, l.yaw, 0))
    head.quaternion.premultiply(l.quat)

    // Ojos: van hacia el cursor dentro de su cuenca, más rápido que la cabeza
    const targetEyeX = following ? pointer.current.x * LOOK_AT.eyeOffsetX : 0
    const targetEyeY = following ? pointer.current.y * LOOK_AT.eyeOffsetY : 0
    const te = 1 - Math.exp(-LOOK_AT.eyeSmoothing * delta)
    l.eyeX += (targetEyeX - l.eyeX) * te
    l.eyeY += (targetEyeY - l.eyeY) * te
    eyes.forEach((eye) => {
      const base = eye.userData.basePosition
      eye.position.set(base.x + l.eyeX, base.y + l.eyeY, base.z)
    })
  })

  return <primitive object={scene} />
}

useGLTF.preload(MODEL_URL)
