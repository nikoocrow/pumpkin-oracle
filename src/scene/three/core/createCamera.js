import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const TARGET = new THREE.Vector3(0, 0.6, 0) // centro aproximado de la calabaza

// Cámara de la escena. Si el GLB trae la cámara de Blender, copia su encuadre.
export function createCamera(canvas) {
  const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 100)
  camera.position.set(1.1, 1.9, 7.0)

  const controls = new OrbitControls(camera, canvas)
  controls.target.copy(TARGET)
  controls.enableDamping = true
  controls.dampingFactor = 0.06
  controls.enablePan = false
  controls.minDistance = 3
  controls.maxDistance = 11
  controls.maxPolarAngle = Math.PI * 0.49 // no atravesar el suelo
  controls.update()

  function matchBlenderCamera(gltfCamera) {
    if (!gltfCamera) return
    gltfCamera.updateWorldMatrix(true, false)
    gltfCamera.getWorldPosition(camera.position)
    camera.fov = gltfCamera.fov
    camera.updateProjectionMatrix()
    controls.update()
  }

  return { camera, controls, matchBlenderCamera }
}
