import { FLICKER } from '../config.js'

// Parpadeo de las velas: intensidad de luz + escala de la llama.
// Cada vela tiene su propia fase para que no parpadeen al unísono.
export class CandleFlicker {
  constructor(lights, flames) {
    this.lights = lights.map((light, i) => ({ light, seed: i * 17.3 }))
    this.flames = flames.map((mesh, i) => ({
      mesh,
      seed: i * 11.7 + 3,
      base: mesh.scale.clone(),
    }))
    this.time = 0
  }

  static noise(t, seed) {
    // Suma de senos: barato y suficientemente "orgánico"
    return (
      Math.sin(t * 1.0 + seed) * 0.5 +
      Math.sin(t * 2.3 + seed * 1.7) * 0.3 +
      Math.sin(t * 5.1 + seed * 0.3) * 0.2
    )
  }

  update(delta) {
    this.time += delta * FLICKER.speed
    const t = this.time

    for (const { light, seed } of this.lights) {
      const n = CandleFlicker.noise(t, seed)
      light.intensity = light.userData.baseIntensity * (1 + n * FLICKER.lightAmount)
    }

    for (const { mesh, seed, base } of this.flames) {
      const n = CandleFlicker.noise(t * 1.3, seed)
      const s = FLICKER.flameAmount
      mesh.scale.set(base.x * (1 - n * s * 0.5), base.y * (1 + n * s), base.z * (1 - n * s * 0.5))
    }
  }
}
