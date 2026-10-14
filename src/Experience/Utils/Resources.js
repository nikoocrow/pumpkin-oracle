import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import EventEmitter from './EventEmitter.js'

// Carga los recursos de Sources.js. Avisa con 'ready' cuando están los iniciales, y load()
// sirve para cargar más después (la baraja se carga cuando la cámara ya llegó a la calabaza).
// Cada archivo se pide una sola vez: Resources.preload() lo adelanta (durante la intro) y
// lo reutiliza la Experience que se cree después.

const loaders = {
  gltfModel: new GLTFLoader(),
  texture: new THREE.TextureLoader(),
}
const cache = new Map() // path → Promise del archivo

function loadSource(source) {
  if (!cache.has(source.path)) cache.set(source.path, loaders[source.type].loadAsync(source.path))
  return cache.get(source.path)
}

export default class Resources extends EventEmitter {
  static preload(sources) {
    sources.forEach((source) => loadSource(source).catch(() => {})) // el error lo verá load()
  }

  constructor(sources) {
    super()

    this.items = {}
    this.load(sources)
      .then(() => this.trigger('ready'))
      .catch((error) => console.error('[resources]', error))
  }

  // Carga varias fuentes y las deja en items[name]; devuelve items
  async load(sources) {
    await Promise.all(
      sources.map(async (source) => {
        this.items[source.name] = await loadSource(source)
      }),
    )
    return this.items
  }
}
