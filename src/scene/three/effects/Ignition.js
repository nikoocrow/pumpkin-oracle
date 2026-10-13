import * as THREE from 'three'
import { IGNITION } from '../config.js'

const worldX = (mesh) => mesh.getWorldPosition(new THREE.Vector3()).x

// Encendido tipo "boom" de las llamas.
// Cada objetivo { mesh, light?, kind } recibe por frame:
//   - escala de la llama: crece de golpe, se pasa (overshoot) y rebota hasta 1
//   - target.lit   (0 → 1): cuánto está encendida
//   - target.flash (>1 → 1): fogonazo que sube la luz de la vela
// Debe ejecutarse DESPUÉS del mixer y del parpadeo, porque multiplica lo que ellos dejan.
export class Ignition {
  constructor(targets) {
    this.targets = targets
    this.time = 0
    for (const t of targets) {
      t.start = Infinity // apagada hasta que se encienda
      t.mode = 'off'
      t.strength = 1
      t.lit = 0
      t.flash = 0
    }
  }

  // Enciende todo desde cero, vela por vela (izquierda → derecha) y luego ojos y lengua
  igniteAll() {
    const candles = this.targets
      .filter((t) => t.kind === 'candle')
      .sort((a, b) => worldX(a.mesh) - worldX(b.mesh))
    candles.forEach((t, i) => this.#schedule(t, 'ignite', i * IGNITION.stagger))
    const eyesAt = candles.length * IGNITION.stagger + IGNITION.eyesDelay
    this.targets
      .filter((t) => t.kind !== 'candle')
      .forEach((t) => this.#schedule(t, 'ignite', eyesAt))
  }

  // Fogonazo sobre llamas ya encendidas (p. ej. al cambiar de estado)
  flare(kinds, strength = IGNITION.stateFlare) {
    const list = [].concat(kinds)
    for (const t of this.targets) {
      if (list.includes(t.kind) && t.mode !== 'off') this.#schedule(t, 'flare', 0, strength)
    }
  }

  #schedule(target, mode, delay, strength = 1) {
    // Si aún no se ha encendido, un "flare" no debe adelantar el encendido
    if (mode === 'flare' && target.mode === 'pending') return
    target.mode = mode === 'ignite' ? 'pending' : 'flare'
    target.start = this.time + delay
    target.strength = strength
  }

  // Curva de escala: subida casi instantánea + rebote amortiguado
  static envelope(t, strength) {
    const over = (IGNITION.overshoot - 1) * strength
    const damp = Math.exp(-t * (6 / IGNITION.duration))
    const bounce = 1 + over * damp * Math.cos(t * 12)
    const flash = 1 + (IGNITION.flash - 1) * strength * Math.exp(-t * (5 / IGNITION.duration))
    return { bounce, flash }
  }

  update(delta) {
    this.time += delta

    for (const target of this.targets) {
      const t = this.time - target.start

      if (target.mode === 'off' || (target.mode === 'pending' && t < 0)) {
        target.lit = 0
        target.flash = 0
        target.mesh.scale.multiplyScalar(0.001)
        if (target.light) target.light.intensity = 0
        continue
      }

      let scale = 1
      if (target.mode === 'pending') {
        // Encendido desde apagada
        const rise = 1 - Math.exp(-t * 30)
        const { bounce, flash } = Ignition.envelope(t, target.strength)
        scale = rise * bounce
        target.lit = rise
        target.flash = flash
        if (t > IGNITION.duration * 2) target.mode = 'on'
      } else if (target.mode === 'flare' && t >= 0) {
        const { bounce, flash } = Ignition.envelope(t, target.strength)
        scale = bounce
        target.lit = 1
        target.flash = flash
        if (t > IGNITION.duration * 2) target.mode = 'on'
      } else {
        target.lit = 1
        target.flash = 1
      }

      target.mesh.scale.multiplyScalar(Math.max(scale, 0.001))
      if (target.light) target.light.intensity *= target.lit * (1 + (target.flash - 1) * 0.5)
    }
  }
}
