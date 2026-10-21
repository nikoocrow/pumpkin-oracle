import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { DAILY_GREETINGS, spend, takeVoice, visitorId } from './_lib/candles.js'
import { kv } from './_lib/kv.js'

// Convierte la respuesta del oráculo en voz con ElevenLabs.
// Corre en el servidor: las keys se leen de las variables de entorno.
// Nunca pone voz a un texto que mande el navegador: solo a lo que guardó /api/oracle (por su id)
// y al saludo, que se escribe aquí.
const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/text-to-speech'
const MAX_CHARS = 900

// Saludo: el mismo texto que muestra la interfaz (locales), con el nombre del jugador
const require = createRequire(import.meta.url)
const GREETINGS = {
  en: require('../src/i18n/locales/en.json').greeting,
  es: require('../src/i18n/locales/es.json').greeting,
  fr: require('../src/i18n/locales/fr.json').greeting,
  ko: require('../src/i18n/locales/ko.json').greeting,
}

function greetingText(language, userName) {
  const greeting = Object.hasOwn(GREETINGS, language) ? GREETINGS[language] : GREETINGS.en
  const name = typeof userName === 'string' ? userName.trim().slice(0, 40) : ''
  return name ? greeting.named.replaceAll('{{name}}', name) : greeting.nameless
}

// El saludo se repite igual (mismo texto por idioma y nombre): el audio generado se
// guarda en Redis y se reutiliza, gratis. La clave es el hash del texto, así que si el texto
// cambia se genera de nuevo. El tope diario solo se gasta cuando de verdad hay que generarlo
const CACHE_SECONDS = 30 * 24 * 60 * 60
const cacheKey = (kind, text) =>
  `tts:${kind}:${createHash('sha256').update(text).digest('hex').slice(0, 32)}`

async function fromCache(key) {
  const [value] = await kv(['GET', key])
  return value ? JSON.parse(value) : null
}

// Sin caché (Redis caído) se sigue funcionando: solo se pierde el ahorro
const remember = (key, speech) =>
  kv(['SET', key, JSON.stringify(speech), 'EX', CACHE_SECONDS]).catch((error) =>
    console.error(error),
  )

// Audio cacheado si existe; si no, gasta una del cupo diario, lo genera y lo guarda.
// Devuelve la Response que toca
async function cachedSpeech(key, { visitor, bucket, max, synthesize }) {
  const hit = await fromCache(key)
  if (hit) return Response.json(hit)
  if (!(await spend(visitor, bucket, max)).allowed) return tooMany()
  const speech = await synthesize()
  if (!speech) return lostVoice()
  await remember(key, speech)
  return Response.json(speech)
}

// Voz con los tiempos de cada letra (para el lip-sync): { audio, alignment }, o null si falla
async function synthesize(voiceId, text) {
  // /with-timestamps devuelve el audio + en qué segundo suena cada letra (para sincronizar)
  const response = await fetch(`${ELEVENLABS_URL}/${voiceId}/with-timestamps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2' }),
  })

  if (!response.ok) {
    console.error('[speak] ElevenLabs', response.status, await response.text())
    return null
  }

  const { audio_base64, alignment } = await response.json()
  return { audio: audio_base64, alignment }
}

function tooMany() {
  return Response.json({ error: 'The oracle needs to rest' }, { status: 429 })
}
function lostVoice(status = 502) {
  return Response.json({ error: 'The oracle lost its voice' }, { status })
}

// Qué puede pedir el navegador:
//   { voice }                              → la respuesta del oráculo con ese id (una sola vez)
//   { kind: 'greeting', language, userName } → el saludo (cacheado; máx. DAILY_GREETINGS nuevos al día)
export async function POST(request) {
  const { voice, kind, language, userName } = await request.json()
  const voiceId = process.env.ELEVENLABS_VOICE_ID
  const visitor = visitorId(request)

  try {
    if (kind === 'greeting') {
      const text = greetingText(language, userName)
      return await cachedSpeech(cacheKey('greeting', text), {
        visitor,
        bucket: 'greetings',
        max: DAILY_GREETINGS,
        synthesize: () => synthesize(voiceId, text),
      })
    }
  } catch (error) {
    console.error(error)
    return lostVoice()
  }

  let text
  try {
    text = await takeVoice(voice)
  } catch (error) {
    console.error(error) // Redis caído: sin poder comprobar, no se gasta
    return lostVoice(503)
  }

  // ElevenLabs cobra por carácter: solo textos cortos. Las respuestas caben de sobra
  // en 400; la lectura de las tres cartas (≤ 90 palabras) ronda 450–650, de ahí el margen
  if (typeof text !== 'string' || !text.trim() || text.length > MAX_CHARS) {
    return Response.json({ error: 'Invalid text' }, { status: 400 })
  }

  try {
    const speech = await synthesize(voiceId, text)
    return speech ? Response.json(speech) : lostVoice()
  } catch (error) {
    console.error(error) // se ve en los logs de Vercel, nunca en el navegador
    return lostVoice()
  }
}
