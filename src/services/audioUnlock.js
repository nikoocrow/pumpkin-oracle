// Desbloqueo de audio para Safari (y navegadores móviles).
// Safari solo deja sonar un <audio> o un AudioContext si se activan dentro de un clic; la voz
// del oráculo llega segundos después (tras pedirla al servidor), así que fallaría con
// "NotAllowedError: The request is not allowed by the user agent…".
// Solución: en el primer clic se reproduce un silencio en dos <audio> fijos y se activa el
// AudioContext; desde entonces toda la voz y la risa usan esos mismos elementos.
// Se importa en main.jsx para escuchar desde el primer clic (el de la intro).

export const voiceAudio = new Audio() // frases del oráculo
export const laughAudio = new Audio() // risa (amplificada por laughGain)

let context = null
export let laughGain = null // GainNode por el que suena la risa; null si no hay Web Audio

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
  // Web Audio: cada clic lo reanuda (Safari puede suspenderlo, p. ej. al cambiar de pestaña)
  try {
    if (!context) {
      context = new AudioContext()
      laughGain = context.createGain()
      context.createMediaElementSource(laughAudio).connect(laughGain).connect(context.destination)
    }
    context.resume()
  } catch (error) {
    console.warn('[audio] sin Web Audio:', error.message) // la risa sonará sin amplificar
  }

  // Los <audio>, solo la primera vez: después podrían estar sonando y el silencio los cortaría
  if (unlocked) return
  unlocked = true
  const silence = silentWav()
  for (const audio of [voiceAudio, laughAudio]) {
    audio.src = silence
    audio.play().catch(() => {}) // si falla, el siguiente clic no lo reintenta: no hay más que hacer
  }
}

for (const type of ['click', 'touchend', 'keydown']) {
  window.addEventListener(type, unlock, { capture: true, passive: true })
}
