import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { MODEL_URLS } from '../config.js'

// Luces que Blender coloca dentro de la calabaza (ojos y boca). No se usan.
const INTERIOR_LIGHTS = ['Candle_Light_L', 'Candle_Light_R', 'Mouth_Light']

// Carga el GLB y devuelve la escena + referencias a las piezas que animan los efectos.
export async function loadModel(onProgress) {
  const loader = new GLTFLoader()
  let gltf
  let lastError
  // En la versión "standalone" (un solo HTML) el GLB viene incrustado como data URL
  const urls = window.__ORACLE_MODEL__ ? [window.__ORACLE_MODEL__] : MODEL_URLS
  for (const url of urls) {
    try {
      gltf = await loader.loadAsync(url, (e) => {
        if (e.lengthComputable) onProgress?.(e.loaded / e.total)
      })
      break
    } catch (err) {
      lastError = err
    }
  }
  if (!gltf) throw lastError

  const root = gltf.scene
  const refs = {
    camera: gltf.cameras[0] ?? null,
    bodyMeshes: [], // mallas con morph targets (MouthOpen, BrowsAngry, BrowsUp)
    candleLights: [],
    candleFlames: [],
    eyeFlames: [], // llamas de los ojos (Eye_L, Eye_R)
    tongue: null, // lengua de fuego
    mouthAnchor: null, // empty Smoke_Mouth de Blender: origen de las chispas
    lights: [],
  }

  const interior = []
  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true
      obj.receiveShadow = true
      if (obj.morphTargetDictionary && 'MouthOpen' in obj.morphTargetDictionary)
        refs.bodyMeshes.push(obj)
      if (/^Candle_.*_Flame$/.test(obj.name)) refs.candleFlames.push(obj)
      if (obj.name === 'Eye_L' || obj.name === 'Eye_R') refs.eyeFlames.push(obj)
      if (obj.name === 'Tongue') refs.tongue = obj
      // Las llamas y el fuego emiten luz: no deben proyectar sombra
      if (/Flame|Fire/.test(obj.material?.name ?? '')) obj.castShadow = false
    }

    if (obj.isLight) {
      if (INTERIOR_LIGHTS.includes(obj.name)) {
        interior.push(obj) // sin iluminación dentro de la calabaza
        return
      }
      refs.lights.push(obj)
      if (/^Candle_[LR]\d_Light$/.test(obj.name)) refs.candleLights.push(obj)
    }

    if (obj.name === 'Smoke_Mouth') refs.mouthAnchor = obj
  })

  interior.forEach((light) => light.removeFromParent())

  const ground = root.getObjectByName('Ground')
  if (ground)
    ground.traverse((o) => {
      if (o.isMesh) o.castShadow = false
    })

  return { gltf, root, animations: gltf.animations, refs }
}
