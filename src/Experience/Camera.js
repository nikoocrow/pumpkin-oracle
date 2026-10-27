import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Experience from './Experience.js'
import { tween, ease } from './Utils/tween.js'

// Dos encuadres: la calabaza de cerca (al conversar) y la mesa desde arriba (al leer el tarot).
// parallax: cuánto sigue la cámara al ratón en cada uno
const FRAMES = {
  pumpkin: {
    base: new THREE.Vector3(0, 2.4, 7.2),
    look: new THREE.Vector3(0, 0.85, 0),
    parallax: 0.4,
  },
  // Mesa: la distancia la ajusta TABLE_FIT al ancho de pantalla; look algo hacia la calabaza
  // para que no se suba al título
  table: { base: new THREE.Vector3(0, 8.8, 12.3), look: new THREE.Vector3(0, 0, 2.3), parallax: 1 },
}

// Niebla con la cámara a distancia normal; se aleja con ella en pantallas estrechas
const FOG = { near: 16, far: 34 }

// La mesa llena el ancho de la pantalla: el ancho visible crece con la distancia × aspect,
// así que la distancia (multiplicador sobre table.base, desde look) va con 1 / aspect.
// fit: multiplicador con aspect 1 · min: tope en pantallas muy anchas (si no, se corta arriba y abajo)
const TABLE_FIT = { fit: 1.2, min: 0.65 }

export const INTRO_SECONDS = 3.2 // la cámara baja hasta la calabaza

// Cámara de la escena.
// rig.focus: 0 = calabaza, 1 = mesa (se anima con tween para pasar de uno a otro).
// rig.intro: multiplicador de distancia. Empieza lejos y baja a 1 al entrar: la niebla no lo
// sigue, así la escena aparece entre la oscuridad mientras la cámara se acerca.
// Con #debug la mueven los OrbitControls en vez del rig.
export default class Camera {
  constructor() {
    this.experience = new Experience()
    this.sizes = this.experience.sizes
    this.scene = this.experience.scene
    this.canvas = this.experience.canvas
    this.time = this.experience.time
    this.debug = this.experience.debug

    this.setInstance()
    if (this.debug.active) this.setOrbitControls()
    else this.setRig()
  }

  setInstance() {
    this.instance = new THREE.PerspectiveCamera(42, this.sizes.width / this.sizes.height, 0.1, 60)
    this.instance.position.set(0, 17, 23)
    this.scene.add(this.instance)
  }

  setRig() {
    this.rig = { focus: 1, intro: 1.6, mx: 0, my: 0, tx: 0, ty: 0 }
    this.base = new THREE.Vector3()
    this.look = new THREE.Vector3()
    this.pumpkinBase = new THREE.Vector3()
    this.tableBase = new THREE.Vector3()

    this.onPointerMove = (e) => {
      this.rig.tx = (e.clientX / window.innerWidth) * 2 - 1
      this.rig.ty = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', this.onPointerMove)

    // Entrada: desde lo alto de la mesa, la cámara baja y se acerca a la calabaza
    tween(this.rig, { focus: 0, intro: 1 }, { duration: INTRO_SECONDS, easing: ease.inOutCubic })
  }

  setOrbitControls() {
    this.controls = new OrbitControls(this.instance, this.canvas)
    this.controls.target.set(0, 0.5, 1)
    this.controls.maxDistance = 40
    this.controls.enableDamping = true

    this.debug.addFolder('Cámara', (folder) => {
      const params = { zoom: this.controls.getDistance() }
      // Zoom = distancia de la cámara al centro de los OrbitControls
      const zoom = folder
        .add(params, 'zoom', 0.5, 40, 0.01)
        .name('Zoom (distancia)')
        .onChange((distance) => {
          const { position } = this.instance
          position.sub(this.controls.target).setLength(distance).add(this.controls.target)
        })
      folder.add(this.controls, 'minDistance', 0.5, 40, 0.1).name('Zoom in máximo')
      folder.add(this.controls, 'maxDistance', 0.5, 40, 0.1).name('Zoom out máximo')
      folder
        .add(this.instance, 'fov', 10, 90, 1)
        .name('FOV')
        .onChange(() => this.instance.updateProjectionMatrix())
      // Mantiene el número al día al hacer zoom con la rueda o el trackpad
      this.controls.addEventListener('change', () => {
        params.zoom = this.controls.getDistance()
        zoom.updateDisplay()
      })
    })
  }

  // De cerca a la calabaza (0) a la mesa entera (1)
  showTable() {
    if (this.rig) tween(this.rig, { focus: 1 }, { duration: 2.4, easing: ease.inOutCubic })
  }

  resize() {
    this.instance.aspect = this.sizes.width / this.sizes.height
    this.instance.updateProjectionMatrix()
  }

  update() {
    if (this.controls) {
      this.controls.update()
      return
    }
    const { rig, instance: camera } = this
    const { delta: dt, elapsed: t } = this.time

    // En pantallas estrechas la cámara se aleja para que quepa la calabaza (la mesa: TABLE_FIT)
    const zoom = Math.max(1, Math.pow(1.6 / camera.aspect, 0.7))
    if (this.scene.fog) {
      this.scene.fog.near = FOG.near * zoom
      this.scene.fog.far = FOG.far * zoom
    }
    const { pumpkin, table } = FRAMES
    const tableZoom = Math.max(TABLE_FIT.min, TABLE_FIT.fit / camera.aspect)
    this.pumpkinBase.copy(pumpkin.base).multiplyScalar(zoom)
    this.tableBase.subVectors(table.base, table.look).multiplyScalar(tableZoom).add(table.look)
    this.base.lerpVectors(this.pumpkinBase, this.tableBase, rig.focus)
    this.look.lerpVectors(pumpkin.look, table.look, rig.focus)
    const parallax = THREE.MathUtils.lerp(pumpkin.parallax, table.parallax, rig.focus)

    rig.mx += (rig.tx - rig.mx) * Math.min(1, dt * 2.5)
    rig.my += (rig.ty - rig.my) * Math.min(1, dt * 2.5)
    camera.position.copy(this.base).multiplyScalar(rig.intro)
    camera.position.x += (rig.mx * 1.1 + Math.sin(t * 0.15) * 0.15) * parallax
    camera.position.y += (-rig.my * 0.5 + Math.sin(t * 0.21) * 0.08) * parallax
    camera.lookAt(this.look.x + rig.mx * 0.3 * parallax, this.look.y, this.look.z)
  }

  destroy() {
    window.removeEventListener('pointermove', this.onPointerMove)
    this.controls?.dispose()
  }
}
