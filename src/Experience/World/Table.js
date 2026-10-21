import * as THREE from 'three'
import Experience from '../Experience.js'
import { QUALITY } from '../Utils/device.js'
import { createHaloTexture } from './Tarot/textures.js'

export const TABLE_RADIUS = 6.5
const DUST_COUNT = 420

// Mesa de lectura: mantel (public/textures/mesa.webp), aro dorado, faldón, foco cenital con su
// haz y polvo flotando. Sin suelo ni velas propias: las velas son las del GLB de la calabaza,
// que está en el centro. El mantel llega con los recursos iniciales (setTexture); hasta
// entonces la mesa es terciopelo liso del mismo tono.
export default class Table {
  constructor() {
    this.experience = new Experience()
    this.scene = this.experience.scene
    this.time = this.experience.time

    this.group = new THREE.Group()
    this.group.name = 'Tarot_Table'
    this.scene.add(this.group)

    this.setMeshes()
    this.setLights()
    this.setBeam()
    this.setDust()
    this.setMoodTint()
  }

  setMeshes() {
    this.cloth = new THREE.MeshStandardMaterial({ color: 0x240c30, roughness: 0.92, metalness: 0 })
    const table = new THREE.Mesh(new THREE.CircleGeometry(TABLE_RADIUS, 128), this.cloth)
    table.rotation.x = -Math.PI / 2
    table.receiveShadow = true

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(TABLE_RADIUS, 0.09, 16, 160),
      // Un poco de luz propia: brillo cálido sin llegar a ser una banda plana
      new THREE.MeshStandardMaterial({
        color: 0xc9a25a,
        metalness: 0.9,
        roughness: 0.3,
        emissive: 0xff8a3c,
        emissiveIntensity: 0.45,
      }),
    )
    rim.rotation.x = -Math.PI / 2

    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(TABLE_RADIUS, 6.2, 1.2, 128, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x1a0d22, roughness: 1, side: THREE.DoubleSide }),
    )
    skirt.position.y = -0.6
    this.group.add(table, rim, skirt)
  }

  // La imagen es cuadrada y la mesa la recorta en círculo: arriba de la imagen = el fondo
  // de la mesa (detrás de la calabaza), abajo = el lado de la cámara
  setTexture(texture) {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    this.cloth.map = texture
    this.cloth.color.set(0xffffff)
    this.cloth.needsUpdate = true
  }

  setLights() {
    this.hemiLight = new THREE.HemisphereLight(0x9c88ff, 0x120818, 0.35)

    this.spot = new THREE.SpotLight(0xfff0d6, 160, 22, THREE.MathUtils.degToRad(34), 0.55, 1.6)
    this.spot.position.set(0, 10, 1.5)
    this.spot.target.position.set(0, 0, 0.3)
    this.spot.castShadow = true
    this.spot.shadow.mapSize.setScalar(QUALITY.shadowMapSize)
    this.spot.shadow.bias = -0.0004
    this.spot.shadow.radius = 4
    this.group.add(this.hemiLight, this.spot, this.spot.target)
  }

  // Haz de luz visible
  setBeam() {
    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 5.4, 10, 64, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffe2b0,
        transparent: true,
        opacity: 0.016,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    )
    this.beam.position.set(0, 5, 1)
    this.group.add(this.beam)
  }

  // Polvo flotando en el haz
  setDust() {
    const positions = new Float32Array(DUST_COUNT * 3)
    this.dustSpeed = new Float32Array(DUST_COUNT)
    for (let i = 0; i < DUST_COUNT; i++) {
      const r = Math.sqrt(Math.random()) * 5.5
      const a = Math.random() * Math.PI * 2
      positions[i * 3] = Math.cos(a) * r
      positions[i * 3 + 1] = Math.random() * 7
      positions[i * 3 + 2] = Math.sin(a) * r
      this.dustSpeed[i] = 0.05 + Math.random() * 0.12
    }
    this.dustGeometry = new THREE.BufferGeometry()
    this.dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.dust = new THREE.Points(
      this.dustGeometry,
      new THREE.PointsMaterial({
        map: createHaloTexture(),
        color: 0xffd9a0,
        size: 0.07,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    this.group.add(this.dust)
  }

  // Ánimo: foco, haz y polvo se funden hacia el color del ánimo (violeta al pensar), como las velas
  setMoodTint() {
    this.tinted = [this.spot, this.beam.material, this.dust.material]
    this.tinted.forEach((obj) => (obj.userData.baseColor = obj.color.clone()))
    this.tint = new THREE.Color()
  }

  // mix 0–1 hacia el color `color` (ver stepMoodFade en MoodTint.js)
  applyMood(mix, color) {
    this.tint.set(color)
    this.tinted.forEach((obj) => obj.color.copy(obj.userData.baseColor).lerp(this.tint, mix))
  }

  update() {
    const { delta: dt, elapsed: t } = this.time
    const p = this.dustGeometry.attributes.position.array
    for (let i = 0; i < DUST_COUNT; i++) {
      p[i * 3 + 1] += this.dustSpeed[i] * dt
      p[i * 3] += Math.sin(t * 0.5 + i) * 0.002
      if (p[i * 3 + 1] > 7) p[i * 3 + 1] = 0
    }
    this.dustGeometry.attributes.position.needsUpdate = true
  }

  destroy() {
    this.spot.dispose()
    this.group.removeFromParent() // geometrías y materiales los libera Experience.destroy
  }
}
