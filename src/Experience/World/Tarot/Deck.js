import * as THREE from 'three'
import Experience from '../../Experience.js'
import { CARDS, POSITIONS } from './cardsData.js'
import { createSlotTexture } from './textures.js'
import { createHudBridge } from './hudBridge.js'
import { tween, ease, wait } from '../../Utils/tween.js'

export const MAX_SELECTED = 3
const CARD_H = 1.76
const CARD_W = 1.26

// Las cartas están acostadas sobre la mesa, formando un arco frente a la cámara.
// El centro de la mesa, dentro del arco, es para la calabaza.
const FAN = {
  center: new THREE.Vector3(0, 0, -0.7),
  radius: 3.6,
  spread: THREE.MathUtils.degToRad(124),
}
const TABLE_Y = 0.012
// Mazo inicial y al barajar: delante de la calabaza
const PILE = { x: 0, z: 2.0 }

// Huecos de la lectura: debajo del abanico (más cerca del jugador), centrados.
const SLOT_SCALE = 1.0
const SLOT_TILT = 1.0 // radianes: inclinadas hacia la cámara
const SLOTS = [-1.8, 0, 1.8].map((x) => new THREE.Vector3(x, 0.82, 4.75))
// Al revelarse, la carta se planta justo delante de la cámara, de frente, antes de ir a su hueco.
// fill: parte del alto de pantalla que ocupa (en pantallas estrechas manda el ancho: fillWidth)
const REVEAL = { scale: 1.35, fill: 0.62, fillWidth: 0.82, hold: 1.2, glow: 1 }
// Brillo propio de la ilustración (sobre la mesa). Al revelarse sube a REVEAL.glow: delante de
// la cámara la carta queda fuera del foco y se vería oscura
const FACE_GLOW = 0.55

const shuffled = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Baraja de tarot sobre la mesa. Se crea oculta y vacía; World.loadTarot le pasa las cartas
// cargadas (build) y la prepara en la GPU (warmUp); reveal() la muestra y la reparte.
// `ui` es el puente con React (hudBridge, en options.ui de la Experience): setBusy, setSelection,
// showLabel, positionLabel y toast para TarotHud, y readingComplete cuando hay tres cartas.
export default class Deck {
  constructor() {
    this.experience = new Experience()
    this.scene = this.experience.scene
    this.camera = this.experience.camera.instance
    this.canvas = this.experience.canvas
    this.renderer = this.experience.renderer.instance
    this.ui = this.experience.options.ui ?? createHudBridge() // sin interfaz: llamadas mudas
    this.cards = []
    this.slots = [null, null, null]
    this.hovered = null
    this.busy = true
    this.locked = false // bloqueada desde fuera (el oráculo está pensando): sin hover ni clics
    this.pointer = new THREE.Vector2(10, 10)
    this.pointerMoved = false // el raycast solo se repite cuando el ratón se mueve
    this.picked = null
    this.cursor = ''
    this.labelPoint = new THREE.Vector3()
    this.raycaster = new THREE.Raycaster()
    this.group = new THREE.Group()
    this.group.name = 'Tarot_Deck'
    this.group.visible = false // oculta hasta que el jugador pide leer el tarot (reveal)
    this.scene.add(this.group)

    this.listeners = {
      pointermove: (e) => this.setPointer(e),
      pointerleave: () => {
        this.pointer.set(10, 10)
        this.pointerMoved = true
      },
      pointerdown: (e) => (this.downAt = [e.clientX, e.clientY]),
      pointerup: (e) => this.onPointerUp(e),
    }
    for (const [type, fn] of Object.entries(this.listeners)) this.canvas.addEventListener(type, fn)
  }

  // items: recursos de tarotSources (Sources.js): el modelo de la carta, el reverso y las caras
  setResources(items) {
    this.template = items.cardModel.scene
    const anisotropy = this.renderer.capabilities.getMaxAnisotropy()
    const prepare = (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      texture.flipY = false // convención glTF para las UV del modelo
      texture.anisotropy = anisotropy
      texture.needsUpdate = true
      return texture
    }
    this.faceTextures = new Map(CARDS.map((card) => [card, prepare(items[`card_${card.id}`])]))
    this.backMat = new THREE.MeshStandardMaterial({
      map: prepare(items.cardBack),
      roughness: 0.42,
      metalness: 0.2,
    })
    this.build()
    this.buildSlotMarkers()
  }

  destroy() {
    for (const [type, fn] of Object.entries(this.listeners))
      this.canvas.removeEventListener(type, fn)
    this.canvas.style.cursor = ''
    this.group.removeFromParent()
    this.group.traverse((obj) => {
      if (!obj.isMesh) return
      obj.material.map?.dispose()
      obj.material.dispose()
    })
    this.faceTextures?.forEach((tex) => tex.dispose())
    this.disposed = true
  }

  // Sube las texturas a la GPU y compila los shaders mientras la baraja está oculta,
  // para que al revelarla no haya un tirón. Una textura por fotograma.
  async warmUp() {
    const { renderer, scene } = this
    const nextFrame = () => new Promise((r) => requestAnimationFrame(r))
    const textures = [this.backMat.map, ...this.faceTextures.values()]
    for (const tex of textures) {
      if (this.disposed) return
      renderer.initTexture(tex)
      await nextFrame()
    }
    // compileAsync prepara los programas al llamarla; la baraja vuelve a ocultarse
    // antes de que se dibuje ningún fotograma
    this.group.visible = true
    const compiled = renderer.compileAsync(this.group, this.camera, scene)
    this.group.visible = false
    await compiled
    if (this.disposed) return

    // Los shaders de sombra solo se compilan al dibujar: dos fotogramas con el mazo escondido
    // dentro del faldón de la mesa (tablero arriba, paredes alrededor: no se ve desde ningún
    // encuadre). Los círculos de los huecos no proyectan sombra y quedan fuera.
    this.markers.forEach((m) => (m.visible = false))
    this.group.position.y = -1
    this.group.visible = true
    await nextFrame()
    await nextFrame()
    this.group.visible = false
    this.group.position.y = 0
    this.markers.forEach((m) => (m.visible = true))
  }

  setLocked(locked) {
    this.locked = locked
  }

  // Cartas elegidas por hueco: [{ position: 'past', card }, …] (sin los huecos vacíos)
  reading() {
    return this.slots
      .map((c, i) => c && { position: POSITIONS[i], card: c.userData.data })
      .filter(Boolean)
  }

  // ---------- construcción ----------

  build() {
    const order = shuffled(CARDS)
    for (let i = 0; i < CARDS.length; i++) {
      const card = new THREE.Group()
      // YXZ: primero el volteo (z), luego la inclinación (x) y por último el giro sobre la mesa (y)
      card.rotation.order = 'YXZ'
      const model = this.template.clone(true) // en el .glb la carta está acostada, dorso hacia arriba
      card.add(model)

      // La cara tiene algo de brillo propio para que la ilustración se lea aunque la luz sea tenue.
      const frontMat = new THREE.MeshStandardMaterial({
        roughness: 0.5,
        metalness: 0.05,
        emissive: 0xffffff,
        emissiveIntensity: FACE_GLOW,
      })
      model.traverse((o) => {
        if (!o.isMesh) return
        o.material = o.material.name === 'Card_Back' ? this.backMat : frontMat
        o.castShadow = true
        o.receiveShadow = true
        o.userData.card = card
      })

      card.userData = {
        index: i,
        model,
        frontMat,
        data: null,
        selected: false,
        slot: -1,
        animating: false,
        seed: Math.random() * 10,
      }
      this.setFace(card, order[i])
      card.position.set(PILE.x, TABLE_Y + i * 0.01, PILE.z) // empiezan como mazo frente a la calabaza
      this.group.add(card)
      this.cards.push(card)
    }
  }

  buildSlotMarkers() {
    const geo = new THREE.PlaneGeometry(1.7, 1.7)
    this.markers = SLOTS.map((p, i) => {
      const mat = new THREE.MeshBasicMaterial({
        map: createSlotTexture(['I', 'II', 'III'][i]),
        color: 0xffc77a,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
      const m = new THREE.Mesh(geo, mat)
      m.rotation.x = -Math.PI / 2
      m.position.set(p.x, 0.004, p.z - 0.1)
      this.group.add(m)
      tween(mat, { opacity: 0.35 }, { duration: 1.4, delay: 0.8 + i * 0.2 })
      return m
    })
  }

  setFace(card, data) {
    const mat = card.userData.frontMat
    mat.map = this.faceTextures.get(data)
    mat.emissiveMap = mat.map
    mat.needsUpdate = true
    card.userData.data = data
  }

  // ---------- disposición ----------

  fanPose(i) {
    const n = this.cards.length
    const a = -FAN.spread / 2 + (FAN.spread * i) / (n - 1)
    const dir = { x: Math.sin(a), z: Math.cos(a) }
    return {
      position: {
        x: FAN.center.x + dir.x * FAN.radius,
        y: TABLE_Y + i * 0.006,
        z: FAN.center.z + dir.z * FAN.radius,
      },
      rotation: { x: 0, y: a, z: 0 },
      dir,
    }
  }

  animateTo(card, { position, rotation, scale = 1 }, opts) {
    return Promise.all([
      tween(card.position, position, opts),
      tween(card.rotation, rotation, opts),
      tween(card.scale, { x: scale, y: scale, z: scale }, opts),
    ])
  }

  // Muestra la baraja (mazo frente a la calabaza) y la reparte en abanico
  reveal() {
    this.group.visible = true
    return this.deal()
  }

  async deal() {
    this.busy = true
    this.ui.setBusy(true)
    await Promise.all(
      this.cards.map((card, i) => {
        const pose = this.fanPose(i)
        // Arco: sube y luego cae en su sitio
        tween(card.position, { y: 1.2 + i * 0.03 }, { duration: 0.35, delay: i * 0.06 }).then(() =>
          tween(card.position, { y: pose.position.y }, { duration: 0.45, easing: ease.outCubic }),
        )
        const opts = { duration: 0.8, delay: i * 0.06, easing: ease.inOutCubic }
        return Promise.all([
          tween(card.position, { x: pose.position.x, z: pose.position.z }, opts),
          tween(card.rotation, pose.rotation, opts),
          tween(card.scale, { x: 1, y: 1, z: 1 }, { duration: 0.8, delay: i * 0.06 }),
        ])
      }),
    )
    await wait(0.35)
    this.busy = false
    this.ui.setBusy(false)
  }

  // ---------- interacción ----------

  setPointer(e) {
    const r = this.canvas.getBoundingClientRect()
    this.pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    )
    this.pointerMoved = true
  }

  pick() {
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hit = this.raycaster.intersectObjects(this.cards, true)[0]
    return hit ? hit.object.userData.card : null
  }

  onPointerUp(e) {
    if (!this.downAt) return
    const moved = Math.hypot(e.clientX - this.downAt[0], e.clientY - this.downAt[1])
    this.downAt = null
    if (moved > 8 || this.busy || this.locked) return
    this.setPointer(e)
    const card = this.pick()
    if (!card || card.userData.animating) return
    if (card.userData.selected) this.deselect(card)
    else this.select(card)
  }

  selectedCount() {
    return this.slots.filter(Boolean).length
  }

  async select(card) {
    if (this.selectedCount() >= MAX_SELECTED) {
      this.ui.toast('tarot.full')
      this.nudge(card)
      return
    }
    const slot = this.slots.indexOf(null)
    this.slots[slot] = card
    Object.assign(card.userData, { selected: true, slot, animating: true })
    if (this.hovered === card) this.hovered = null
    this.refreshUI()

    // 1. Se eleva hasta delante de la cámara, se voltea y se queda un momento para verla bien
    const { frontMat } = card.userData
    tween(frontMat, { emissiveIntensity: REVEAL.glow }, { duration: 1 })
    await this.animateTo(card, this.revealPose(), { duration: 1, easing: ease.inOutCubic })
    if (!card.userData.selected) return
    await wait(REVEAL.hold)
    tween(frontMat, { emissiveIntensity: FACE_GLOW }, { duration: 0.8 })

    // 2. Flota hasta su hueco sobre la mesa
    const p = SLOTS[slot]
    await this.animateTo(
      card,
      {
        position: { x: p.x, y: p.y, z: p.z },
        rotation: { x: SLOT_TILT, y: 0, z: Math.PI },
        scale: SLOT_SCALE,
      },
      { duration: 0.8, easing: ease.inOutCubic },
    )
    card.userData.animating = false
    if (card.userData.selected) {
      this.ui.showLabel(slot, card.userData.data)
      tween(this.markers[slot].material, { opacity: 0.9 }, { duration: 0.6 })
    }
    // La tirada está completa cuando la última de las tres cartas se posa en su hueco
    const landed = this.slots.every((c) => c && !c.userData.animating)
    if (landed) this.ui.readingComplete(this.reading())
  }

  // Pose de la carta revelada: en el eje de la cámara, a la distancia justa para que ocupe
  // REVEAL.fill del alto de pantalla (o fillWidth del ancho, lo que quepa), cara a la cámara
  revealPose() {
    const cam = this.camera
    const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) // alto visible a 1 m
    const distance = Math.max(
      (CARD_H * REVEAL.scale) / (viewHeight * REVEAL.fill),
      (CARD_W * REVEAL.scale) / (viewHeight * cam.aspect * REVEAL.fillWidth),
    )
    const position = cam.getWorldDirection(new THREE.Vector3())
    position.multiplyScalar(distance).add(cam.position)

    // Boca arriba (z = π), la normal de la cara es +y: se inclina (x) y se gira (y) hasta
    // apuntar a la cámara
    const toCamera = cam.position.clone().sub(position)
    return {
      position: { x: position.x, y: position.y, z: position.z },
      rotation: {
        x: Math.atan2(Math.hypot(toCamera.x, toCamera.z), toCamera.y),
        y: Math.atan2(toCamera.x, toCamera.z),
        z: Math.PI,
      },
      scale: REVEAL.scale,
    }
  }

  async deselect(card) {
    const { slot } = card.userData
    tween(card.userData.frontMat, { emissiveIntensity: FACE_GLOW }, { duration: 0.6 })
    this.slots[slot] = null
    Object.assign(card.userData, { selected: false, slot: -1, animating: true })
    this.ui.showLabel(slot, null)
    tween(this.markers[slot].material, { opacity: 0.35 }, { duration: 0.6 })
    this.refreshUI()
    const pose = this.fanPose(card.userData.index)
    tween(card.position, { y: 1.6 }, { duration: 0.35 }).then(() =>
      tween(card.position, { y: pose.position.y }, { duration: 0.45, easing: ease.inOutCubic }),
    )
    const opts = { duration: 0.8, easing: ease.inOutCubic }
    await Promise.all([
      tween(card.position, { x: pose.position.x, z: pose.position.z }, opts),
      tween(card.rotation, pose.rotation, opts),
      tween(card.scale, { x: 1, y: 1, z: 1 }, { duration: 0.8 }),
    ])
    card.userData.animating = false
  }

  async nudge(card) {
    const y = card.rotation.y
    await tween(card.rotation, { y: y + 0.05 }, { duration: 0.07 })
    await tween(card.rotation, { y: y - 0.05 }, { duration: 0.1 })
    await tween(card.rotation, { y }, { duration: 0.08 })
  }

  // Con 3 cartas elegidas, el resto se oscurece.
  refreshUI() {
    this.ui.setSelection(this.slots.map((c) => c?.userData.data ?? null))
    const v = this.selectedCount() >= MAX_SELECTED ? 0.35 : 1
    tween(this.backMat.color, { r: v, g: v, b: v }, { duration: 0.5 })
  }

  updateHover() {
    if (this.pointerMoved) {
      this.picked = this.pick()
      this.pointerMoved = false
    }
    const candidate = this.busy || this.locked ? null : this.picked
    const valid =
      candidate && !candidate.userData.selected && !candidate.userData.animating ? candidate : null
    const full = this.selectedCount() >= MAX_SELECTED
    const cursor = candidate ? (valid && full ? 'not-allowed' : 'pointer') : ''
    if (cursor !== this.cursor) this.canvas.style.cursor = this.cursor = cursor

    if (valid === this.hovered) return
    const prev = this.hovered
    if (prev && !prev.userData.selected && !prev.userData.animating) {
      const pose = this.fanPose(prev.userData.index)
      tween(prev.position, pose.position, { duration: 0.3 })
      tween(prev.rotation, pose.rotation, { duration: 0.3 })
    }
    this.hovered = valid
    if (valid && !full) {
      // Se levanta de la mesa y se inclina hacia el jugador
      const pose = this.fanPose(valid.userData.index)
      tween(
        valid.position,
        {
          x: pose.position.x + pose.dir.x * 0.35,
          y: 0.45,
          z: pose.position.z + pose.dir.z * 0.35,
        },
        { duration: 0.3 },
      )
      tween(valid.rotation, { x: 0.35 }, { duration: 0.3 })
    }
  }

  // ---------- barajar ----------

  async shuffle() {
    if (this.busy) return
    this.busy = true
    this.ui.setBusy(true)
    this.hovered = null
    this.slots.forEach((c, i) => {
      if (!c) return
      this.ui.showLabel(i, null)
      tween(this.markers[i].material, { opacity: 0.35 }, { duration: 0.6 })
    })
    this.slots = [null, null, null]
    this.cards.forEach((c) =>
      Object.assign(c.userData, { selected: false, slot: -1, animating: false }),
    )
    this.refreshUI()

    // 1. Reunir en un mazo boca abajo frente a la calabaza
    const n = this.cards.length
    await Promise.all(
      this.cards.map((card, i) =>
        this.animateTo(
          card,
          {
            position: { x: PILE.x, y: TABLE_Y + i * 0.01, z: PILE.z },
            rotation: { x: 0, y: 0, z: 0 },
          },
          { duration: 0.7, delay: (n - i) * 0.025, easing: ease.inOutCubic },
        ),
      ),
    )

    // 2. Mezcla: se separa en dos mitades que se intercalan en el aire
    for (let pass = 0; pass < 2; pass++) {
      await Promise.all(
        this.cards.map((card, i) => {
          const opts = { duration: 0.28, delay: i * 0.01 }
          return Promise.all([
            tween(card.position, { x: PILE.x + (i % 2 ? 0.9 : -0.9), y: 0.5 + i * 0.012 }, opts),
            tween(card.rotation, { z: i % 2 ? -0.35 : 0.35 }, opts),
          ])
        }),
      )
      await Promise.all(
        this.cards.map((card, i) => {
          const opts = { duration: 0.28, delay: (n - 1 - i) * 0.01 }
          return Promise.all([
            tween(card.position, { x: PILE.x, y: TABLE_Y + i * 0.01 }, opts),
            tween(card.rotation, { z: 0 }, opts),
          ])
        }),
      )
    }

    // 3. Nuevas caras al azar y volver a repartir
    shuffled(CARDS).forEach((data, i) => this.setFace(this.cards[i], data))
    await wait(0.15)
    await this.deal()
  }

  // ---------- por fotograma ----------

  update(t) {
    if (!this.group.visible) return
    this.updateHover()

    // Las cartas elegidas flotan suavemente
    this.cards.forEach((c) => {
      const m = c.userData.model
      m.position.y =
        c.userData.selected && !c.userData.animating
          ? Math.sin(t * 1.6 + c.userData.seed) * 0.05
          : m.position.y * 0.9
    })

    // Etiquetas HTML justo debajo del borde inferior de cada carta flotante
    const half = (CARD_H * SLOT_SCALE) / 2
    SLOTS.forEach((p, i) => {
      const v = this.labelPoint.set(
        p.x,
        p.y - Math.sin(SLOT_TILT) * half - 0.15,
        p.z + Math.cos(SLOT_TILT) * half,
      )
      v.project(this.camera)
      this.ui.positionLabel(
        i,
        ((v.x + 1) / 2) * this.canvas.clientWidth,
        ((1 - v.y) / 2) * this.canvas.clientHeight,
      )
    })
  }
}
