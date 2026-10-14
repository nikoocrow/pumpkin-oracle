import * as THREE from 'three'
import Experience from '../Experience.js'
import { colors } from '@/theme/colors'

// Fondo, niebla y luz general (ambiente + luna). Las luces de la calabaza vienen en su GLB
// y las de la mesa (foco cenital) en Table.js
export default class Environment {
  constructor() {
    this.experience = new Experience()
    this.scene = this.experience.scene

    this.setBackground()
    this.setLights()
  }

  setBackground() {
    this.scene.background = new THREE.Color(colors.void)
    // near/far los ajusta la cámara según el ancho de la pantalla (Camera.update)
    this.scene.fog = new THREE.Fog(colors.void, 16, 34)
  }

  setLights() {
    this.ambientLight = new THREE.AmbientLight(colors.ambientCalm, 0.3)
    this.moonLight = new THREE.DirectionalLight(colors.moonlight, 0.8)
    this.moonLight.position.set(-3, 3, -2)
    this.scene.add(this.ambientLight, this.moonLight)
  }
}
