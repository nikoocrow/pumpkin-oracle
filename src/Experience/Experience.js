import * as THREE from 'three'
import Debug from './Utils/Debug.js'
import Sizes from './Utils/Sizes.js'
import Time from './Utils/Time.js'
import Resources from './Utils/Resources.js'
import { updateTweens, clearTweens } from './Utils/tween.js'
import sources from './Sources.js'
import Camera from './Camera.js'
import Renderer from './Renderer.js'
import World from './World/World.js'

let instance = null

// La escena 3D entera: calabaza, mesa de tarot, baraja, cámara y render.
// Singleton (como en la lección 26): cualquier clase hace `new Experience()` y recibe esta misma.
// La interfaz (React) la crea con el canvas y le habla por World:
//   world.setAnimation · world.setGaze · world.setMood · world.startTarot · world.deck
export default class Experience {
  // options.ui: puente con la interfaz del tarot (World/Tarot/hudBridge.js)
  constructor(canvas, options = {}) {
    if (instance) return instance
    instance = this

    // Acceso global para depurar desde la consola
    if (import.meta.env.DEV) window.experience = this

    this.canvas = canvas
    this.options = options

    this.debug = new Debug()
    this.sizes = new Sizes()
    this.time = new Time()
    this.scene = new THREE.Scene()
    this.resources = new Resources(sources)
    this.camera = new Camera()
    this.renderer = new Renderer()
    this.world = new World()

    this.sizes.on('resize', () => this.resize())
    this.time.on('tick', () => this.update())
  }

  resize() {
    this.camera.resize()
    this.renderer.resize()
  }

  update() {
    updateTweens(this.time.delta)
    // Primero la cámara: la calabaza la mira y la baraja proyecta sus etiquetas con ella
    this.camera.update()
    this.world.update()
    this.renderer.update()
  }

  destroy() {
    this.sizes.off('resize')
    this.time.off('tick')
    this.sizes.destroy()
    this.time.destroy()
    clearTweens()

    // Libera geometrías, materiales y texturas de toda la escena (antes de que World la vacíe)
    this.scene.traverse((child) => {
      if (!child.isMesh && !child.isPoints) return
      child.geometry.dispose()
      for (const material of [child.material].flat()) {
        for (const value of Object.values(material)) {
          if (value?.isTexture) value.dispose()
        }
        material.dispose()
      }
    })

    this.world.destroy()
    this.camera.destroy()
    this.renderer.destroy()
    this.debug.destroy()

    if (window.experience === this) delete window.experience
    instance = null
  }
}
