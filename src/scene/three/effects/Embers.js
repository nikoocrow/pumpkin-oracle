import * as THREE from 'three'
import { ParticleSystem } from './ParticleSystem.js'

const tmp = new THREE.Vector3()

// Chispas de fuego que escapan por la boca al hablar o reír.
export class Embers {
  constructor(scene, mouthAnchor) {
    this.anchor = mouthAnchor
    this.rate = 0
    this.acc = 0

    this.particles = new ParticleSystem({
      max: 220,
      color: 0xff7a1a,
      intensity: 2.5,
      blending: THREE.AdditiveBlending,
      softness: 0.45,
      life: [0.7, 1.6],
      size: [0.05, 0.09],
      grow: 0.4,
      drag: 1.2,
      buoyancy: 0.9,
      maxAlpha: 1,
      velocity: () =>
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.9,
          0.3 + Math.random() * 0.6,
          0.4 + Math.random() * 0.6,
        ),
    })

    scene.add(this.particles.points)
  }

  setRate(rate) {
    this.rate = rate
  }

  setViewportHeight(px) {
    this.particles.setViewportHeight(px)
  }

  update(delta) {
    this.acc += delta * this.rate
    while (this.acc >= 1 && this.anchor) {
      this.acc -= 1
      this.particles.spawn(this.anchor.getWorldPosition(tmp))
    }
    this.particles.update(delta)
  }
}
