// Le habla al oráculo a través de nuestro servidor (/api/oracle).
// Este archivo corre en el navegador: nunca debe tener API keys.
// cards: tirada de la mesa, [{ position: 'past' | 'present' | 'future', id, name }].
// El servidor busca la descripción de cada carta por su id; name es el nombre que ve el jugador.
//
// Devuelve { answer, voice, candles }:
//   voice   → id de un solo uso para pedir la voz de la respuesta (fetchSpeech)
//   candles → { left, resetAt }: velas que quedan y cuándo vuelven (ms)
// Si falla, el error lleva candles (si el servidor las mandó) y, sin velas, code 'no_candles'
async function callOracle(body) {
  const response = await fetch('/api/oracle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await response.json()

  if (!response.ok) {
    const error = new Error(data.error ?? 'The oracle is silent')
    error.candles = data.candles
    if (response.status === 429) error.code = 'no_candles'
    throw error
  }

  return data
}

// Pregunta libre; si hay cartas en la mesa, tiñen la respuesta
export function askOracle(question, userName, language, cards = []) {
  return callOracle({ question, userName, language, cards })
}

// Lectura de las tres cartas: el significado de cada una y el futuro que anuncian
export function readCards(cards, userName, language) {
  return callOracle({ mode: 'reading', cards, userName, language })
}

// Velas que le quedan a este jugador: { left, resetAt } (resetAt null si no ha gastado ninguna)
export async function fetchCandles() {
  const response = await fetch('/api/candles')
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? 'The candles cannot be counted')
  return data
}
