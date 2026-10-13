import * as THREE from 'three'
import { RENDER } from '../config.js'

// Escena vacía con el fondo y la niebla del "World" de Blender.
export function createScene() {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(RENDER.background)
  scene.fog = new THREE.Fog(RENDER.background, RENDER.fogNear, RENDER.fogFar)
  return scene
}
