// Lip-sync: decide cuánto abrir la boca de la calabaza en cada instante de la voz del oráculo.
// Lo escribe OracleScreen (al reproducir audio) y lo lee Pumpkin (en cada frame).
//
// La fuente principal es el `alignment` de ElevenLabs: en qué segundo suena cada letra.
// Con audio.currentTime sabemos qué letra suena ahora y le damos su forma de boca.
// Opcionalmente, el volumen real de la voz modula esa apertura (más fuerte = más abierta).

let timeline = null // { audio, shapes, starts, ends } de la frase que suena
let cursor = 0 // última letra encontrada: el tiempo avanza, así casi nunca hay que buscar

let context = null
let analyser = null
let source = null
const sources = new WeakMap() // <audio> → su nodo: un elemento solo admite uno en toda su vida
let samples = null

// Ajustes finos de la boca
export const LIP_SYNC = {
  enabled: true, // false = solo el clip 'hablar', sin sincronizar con la voz
  mix: 1, // 0 = solo el clip 'hablar', 1 = solo la voz
  lead: 0.06, // segundos que la boca se adelanta al sonido (se ve más natural que ir a la par)
  attack: 30, // qué tan rápido abre (por segundo)
  release: 18, // qué tan rápido cierra (por segundo)
  volume: 0, // 0 = solo las letras; 1 = el volumen escala del todo la apertura. Se aplica en la siguiente frase
  noiseFloor: 0.04, // por debajo de este volumen la voz cuenta como silencio
  gain: 8, // sube si con 'volume' la boca abre poco
  curve: 1.2, // > 1 cierra más la boca en sonidos suaves; 1 = lineal
  // En el GLB, MouthOpen va de -1 a 1: -0.85 es la boca cerrada de 'idle', 1 abierta del todo.
  // Pasar de 1 exagera la forma (el morph se extrapola); si la malla se deforma, bájalo a 1
  closed: -1,
  open: 1.35,
}

// Apertura de cada tipo de sonido, de 0 (cerrada) a 1 (abierta del todo)
export const MOUTH_SHAPES = {
  a: 1,
  o: 0.85,
  e: 0.65,
  i: 0.5,
  u: 0.4,
  labial: 0, // m, b, p: los labios se juntan
  labiodental: 0.15, // f, v: dientes sobre el labio
  consonant: 0.3, // el resto de consonantes
}

const SHAPE_OF = { a: 'a', o: 'o', e: 'e', i: 'i', y: 'i', u: 'u' }
for (const c of 'mbp') SHAPE_OF[c] = 'labial'
for (const c of 'fv') SHAPE_OF[c] = 'labiodental'

// Tipo de sonido de una letra (clave de MOUTH_SHAPES); null en espacios y puntuación
function shapeOf(char) {
  const letter = char
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // á → a, ñ → n, ç → c
    .toLowerCase()
  return SHAPE_OF[letter] ?? (/\p{L}/u.test(letter) ? 'consonant' : null)
}

// Prepara la boca para un <audio>. Llamar antes de audio.play()
export async function connectLipSync(audio, alignment) {
  stopLipSync()
  if (!LIP_SYNC.enabled) return

  if (alignment?.characters?.length) {
    timeline = {
      audio,
      shapes: alignment.characters.map(shapeOf),
      starts: alignment.character_start_times_seconds,
      ends: alignment.character_end_times_seconds,
    }
  }

  if (LIP_SYNC.volume > 0) await connectAnalyser(audio)
}

// Al terminar la frase la boca deja de seguir la voz
export function stopLipSync() {
  timeline = null
  cursor = 0
  // Sin desconectar: el <audio> se reutiliza y, una vez capturado por Web Audio, solo suena
  // a través del analizador (que deja pasar el sonido)
  source = null
}

async function connectAnalyser(audio) {
  if (!context) {
    context = new AudioContext()
    analyser = context.createAnalyser()
    analyser.fftSize = 512
    analyser.connect(context.destination) // sin esto el audio no se oiría
    samples = new Uint8Array(analyser.fftSize)
  }
  // Un AudioContext creado sin interacción reciente empieza "suspended" (y mudo)
  await context.resume()

  if (!sources.has(audio)) {
    const node = context.createMediaElementSource(audio)
    node.connect(analyser)
    sources.set(audio, node)
  }
  source = sources.get(audio)
}

// Apertura que toca ahora mismo, de 0 a 1; null si no hay nada que seguir (manda el clip)
export function getMouthTarget() {
  const letters = timelineOpenness()
  const level = source ? getVoiceLevel() : null
  if (letters === null && level === null) return null
  if (letters === null) return level // sin timestamps: solo el volumen
  if (level === null) return letters
  return letters * (1 - LIP_SYNC.volume + LIP_SYNC.volume * level)
}

function timelineOpenness() {
  if (!timeline) return null
  const { audio, shapes, starts, ends } = timeline
  const t = audio.currentTime + LIP_SYNC.lead

  if (cursor >= starts.length || starts[cursor] > t) cursor = 0 // el audio volvió atrás
  while (cursor < starts.length - 1 && ends[cursor] <= t) cursor++

  // Se lee MOUTH_SHAPES en cada frame para que el panel de debug se note al instante
  const shape = starts[cursor] <= t && t < ends[cursor] ? shapes[cursor] : null
  return shape ? MOUTH_SHAPES[shape] : 0
}

// Volumen actual entre 0 (silencio) y 1 (voz fuerte)
function getVoiceLevel() {
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
