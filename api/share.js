import { visitorId } from './_lib/candles.js'
import { kv } from './_lib/kv.js'

// Contador de "compartir": cuántas veces se ha pulsado cada botón de red social.
// Las redes no avisan de si alguien llegó a publicar, así que se cuentan los clics.
// Para que no se pueda inflar a base de clics, cada visitante cuenta una vez por red y por día.
const NETWORKS = ['linkedin', 'facebook', 'tiktok', 'instagram']
const DAY_SECONDS = 24 * 60 * 60

async function counts() {
  const values = await kv(['MGET', ...NETWORKS.map((network) => `shares:${network}`)])
  return Object.fromEntries(values[0].map((value, i) => [NETWORKS[i], Number(value ?? 0)]))
}

// { linkedin, facebook, tiktok, instagram }: totales de todos los visitantes
export async function GET() {
  try {
    return Response.json(await counts())
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'The shares cannot be counted' }, { status: 503 })
  }
}

// { network }: suma uno (si este visitante no lo había compartido hoy) y devuelve los totales
export async function POST(request) {
  const { network } = await request.json()
  if (!NETWORKS.includes(network)) {
    return Response.json({ error: 'Invalid network' }, { status: 400 })
  }

  try {
    const [first] = await kv([
      'SET',
      `shared:${network}:${visitorId(request)}`,
      1,
      'EX',
      DAY_SECONDS,
      'NX',
    ])
    if (first === 'OK') await kv(['INCR', `shares:${network}`])
    return Response.json(await counts())
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'The shares cannot be counted' }, { status: 503 })
  }
}
