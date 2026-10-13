// Lip-sync: mide el volumen de la voz del oráculo para mover la boca de la calabaza.
// Lo escribe OracleScreen (al reproducir audio) y lo lee Pumpkin (en cada frame).

let context = null
let analyser = null
let source = null
let samples = null

// Ajustes finos de la boca
export const LIP_SYNC = {
  enabled: false, // false = solo el clip 'hablar', sin analizar la voz
  mix: 0.85, // 0 = solo el clip 'hablar', 1 = solo la voz
  noiseFloor: 0.04, // por debajo de este volumen la voz cuenta como silencio
  gain: 8, // sube si la boca abre poco con la voz
  curve: 1.2, // > 1 cierra más la boca en sonidos suaves; 1 = lineal
  attack: 0.8, // qué tan rápido abre (0–1)
  release: 0.6, // qué tan rápido cierra (0–1)
  // En el GLB, MouthOpen va de -1 a 1: -0.85 es la boca cerrada de 'idle', 1 abierta del todo.
  // Pasar de 1 exagera la forma (el morph se extrapola); si la malla se deforma, bájalo a 1
  closed: -1,
  open: 1.35,
}

// Conecta un <audio> al analizador. Llamar antes de audio.play()
export async function connectLipSync(audio) {
  if (!LIP_SYNC.enabled) return
  if (!context) {
    context = new AudioContext()
    analyser = context.createAnalyser()
    analyser.fftSize = 512
    analyser.connect(context.destination) // sin esto el audio no se oiría
    samples = new Uint8Array(analyser.fftSize)
  }
  // Un AudioContext creado sin interacción reciente empieza "suspended" (y mudo)
  await context.resume()

  source?.disconnect()
  source = context.createMediaElementSource(audio)
  source.connect(analyser)
}

// Volumen actual entre 0 (silencio) y 1 (voz fuerte)
export function getVoiceLevel() {
  if (!analyser) return 0
  analyser.getByteTimeDomainData(samples)

  // RMS: la "energía" de la onda. Las muestras van de 0 a 255 con el silencio en 128
  let sum = 0
  for (const value of samples) {
    const centered = (value - 128) / 128
    sum += centered * centered
  }
  const rms = Math.sqrt(sum / samples.length)

  // La voz hablada ronda 0.02–0.25 de RMS: se estira a 0–1 ignorando el ruido de fondo
  const level = Math.min(Math.max((rms - LIP_SYNC.noiseFloor) * LIP_SYNC.gain, 0), 1)
  // Curva: los sonidos suaves casi no abren la boca, solo los fuertes la abren del todo
  return level ** LIP_SYNC.curve
}
