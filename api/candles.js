import { MAX_CANDLES, remaining, visitorId } from './_lib/candles.js'

// Cuántas velas le quedan a quien visita (al entrar, para encender las que toquen)
export async function GET(request) {
  try {
    return Response.json(await remaining(visitorId(request), 'candles', MAX_CANDLES))
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'The candles cannot be counted' }, { status: 503 })
  }
}
