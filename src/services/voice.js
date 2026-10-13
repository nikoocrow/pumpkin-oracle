// Pide a nuestro servidor (/api/speak) la voz del oráculo para un texto.
// Este archivo corre en el navegador: nunca debe tener API keys.
export async function fetchSpeech(text) {
  const response = await fetch('/api/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
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
