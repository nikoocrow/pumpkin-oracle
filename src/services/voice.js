import { laughAudio, laughGain } from './audioUnlock'

// Pide a nuestro servidor (/api/speak) la voz del oráculo.
// Este archivo corre en el navegador: nunca debe tener API keys.
// El servidor no pone voz a cualquier texto. request es uno de estos:
//   { voice }                                → la respuesta del oráculo (el id que dio askOracle)
//   { kind: 'greeting', language, userName } → el saludo
export async function fetchSpeech(request) {
  const response = await fetch('/api/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? 'The oracle lost its voice')
  }

  // El audio llega en base64: un data URL lo convierte en algo que <audio> puede reproducir
  return {
    src: `data:audio/mpeg;base64,${data.audio}`,
    alignment: data.alignment,
  }
}

// La risa la genera el servidor (con etiquetas de emoción de ElevenLabs): solo se le pasa el idioma.
// Se pide una vez por idioma y se reutiliza toda la sesión. Si falla, se recuerda el fallo
// (null) para no gastar más llamadas: la calabaza ríe en silencio.
const laughs = new Map()
export function fetchLaugh(language) {
  if (!laughs.has(language)) {
    const speech = fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'laugh', language }),
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'The oracle lost its voice')
        return `data:audio/mpeg;base64,${data.audio}`
      })
      .catch((error) => {
        console.warn('[voice] risa:', error.message)
        return null
      })
    laughs.set(language, speech)
  }
  return laughs.get(language)
}

// Volumen de la risa respecto a la voz: un <audio> no pasa del 100 %, así que se amplifica
// con Web Audio. Por encima de ~2 empieza a saturar
export const LAUGH_GAIN = 1.8

// Reproduce la risa amplificada en el <audio> desbloqueado. onEnd se llama al terminar (o si no
// puede sonar); devuelve una función para cortarla
export function playLaugh(src, onEnd) {
  if (laughGain) laughGain.gain.value = LAUGH_GAIN
  laughAudio.src = src
  laughAudio.onended = onEnd
  laughAudio.onerror = onEnd
  laughAudio.play().catch((error) => {
    console.warn('[voice] risa:', error.message)
    onEnd()
  })
  return () => {
    laughAudio.onended = laughAudio.onerror = null
    laughAudio.pause()
  }
}
