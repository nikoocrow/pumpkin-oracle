// Desbloqueo de audio para Safari (y navegadores móviles).
// Safari solo deja sonar un <audio> o un AudioContext si se activan dentro de un clic; la voz
// del oráculo llega segundos después (tras pedirla al servidor), así que fallaría con
// "NotAllowedError: The request is not allowed by the user agent…".
// Solución: en el primer clic se reproduce un silencio en un <audio> fijo; desde entonces toda
// la voz usa ese mismo elemento.
// Se importa en main.jsx para escuchar desde el primer clic (el de la intro).

export const voiceAudio = new Audio() // frases del oráculo

// WAV de 0.1 s en silencio (8 bits, 8 kHz): no necesita archivo ni red
function silentWav() {
  const samples = 800
  const view = new DataView(new ArrayBuffer(44 + samples))
  const text = (offset, s) => [...s].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))
  text(0, 'RIFF')
  view.setUint32(4, 36 + samples, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true) // tamaño del bloque fmt
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, 8000, true) // muestras por segundo
  view.setUint32(28, 8000, true) // bytes por segundo
  view.setUint16(32, 1, true) // bytes por muestra
  view.setUint16(34, 8, true) // bits por muestra
  text(36, 'data')
  view.setUint32(40, samples, true)
  new Uint8Array(view.buffer, 44).fill(128) // en 8 bits, 128 es silencio
  return URL.createObjectURL(new Blob([view.buffer], { type: 'audio/wav' }))
}

let unlocked = false
function unlock() {
  // Solo la primera vez: después podría estar sonando y el silencio lo cortaría
  if (unlocked) return
  unlocked = true
  voiceAudio.src = silentWav()
  voiceAudio.play().catch(() => {}) // si falla, el siguiente clic no lo reintenta: no hay más que hacer
}

for (const type of ['click', 'touchend', 'keydown']) {
  window.addEventListener(type, unlock, { capture: true, passive: true })
}
