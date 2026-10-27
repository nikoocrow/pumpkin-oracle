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
