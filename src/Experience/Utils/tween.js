// Mini motor de tweens: anima propiedades numéricas (Vector3, Euler, Color…).
// Avanza con updateTweens(dt) en cada fotograma (Experience.update).
const tweens = new Set()

export const ease = {
  linear: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
}

// Cancela las animaciones activas sobre las mismas propiedades del mismo objeto.
function cancel(target, keys) {
  for (const t of tweens) {
    if (t.target !== target) continue
    t.keys = t.keys.filter((k) => !keys.includes(k))
    if (!t.keys.length) {
      tweens.delete(t)
      t.resolve()
    }
  }
}

export function tween(target, to, { duration = 0.6, delay = 0, easing = ease.outCubic } = {}) {
  const keys = Object.keys(to)
  cancel(target, keys)
  return new Promise((resolve) => {
    tweens.add({ target, to, keys, from: null, duration, delay, easing, elapsed: 0, resolve })
  })
}

export function updateTweens(dt) {
  for (const t of [...tweens]) {
    t.elapsed += dt
    if (t.elapsed < t.delay) continue
    if (!t.from) {
      t.from = {}
      for (const k of t.keys) t.from[k] = t.target[k]
    }
    const p = Math.min((t.elapsed - t.delay) / t.duration, 1)
    const e = t.easing(p)
    for (const k of t.keys) t.target[k] = t.from[k] + (t.to[k] - t.from[k]) * e
    if (p >= 1) {
      tweens.delete(t)
      t.resolve()
    }
  }
}

export const wait = (s) => new Promise((r) => setTimeout(r, s * 1000))

// Al destruir la Experience: las animaciones pendientes se descartan
export function clearTweens() {
  tweens.clear()
}
