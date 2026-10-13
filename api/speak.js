// Convierte la respuesta del oráculo en voz con ElevenLabs.
// Corre en el servidor: las keys se leen de las variables de entorno.
const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/text-to-speech'

export async function POST(request) {
  const { text } = await request.json()

  // ElevenLabs cobra por carácter: solo aceptamos textos cortos
  if (typeof text !== 'string' || !text.trim() || text.length > 400) {
    return Response.json({ error: 'Invalid text' }, { status: 400 })
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID

  try {
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
      return Response.json({ error: 'The oracle lost its voice' }, { status: 502 })
    }

    const { audio_base64, alignment } = await response.json()
    return Response.json({ audio: audio_base64, alignment })
  } catch (error) {
    console.error(error) // se ve en los logs de Vercel, nunca en el navegador
    return Response.json({ error: 'The oracle lost its voice' }, { status: 502 })
  }
}
