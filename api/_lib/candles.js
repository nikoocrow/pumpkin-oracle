import { createHash, randomUUID } from 'node:crypto'
import { kv } from './kv.js'

// Las velas de la calabaza: cada pregunta o lectura de cartas gasta una. Al gastar la primera
// empieza un plazo de 24 h; al cumplirse vuelven las tres. Se cuentan aquí, en el servidor:
// lo que guarde el navegador se puede borrar.
export const MAX_CANDLES = 3
const DAY_SECONDS = 24 * 60 * 60

// Lo que no gasta velas también tiene un tope diario (cada voz cuesta en ElevenLabs)
export const DAILY_GREETINGS = 10
export const DAILY_LAUGHS = 10

// Quién pregunta: su IP. En Vercel, x-forwarded-for la pone el propio Vercel (no se puede
// falsear desde el navegador). Se guarda su hash, no la IP
export function visitorId(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'local'
  return createHash('sha256').update(ip).digest('hex').slice(0, 32)
}

// Gasta una unidad del cupo `bucket` del visitante.
// Devuelve { allowed, left, resetAt }: resetAt es cuándo vuelve el cupo entero (ms)
export async function spend(visitor, bucket, max) {
  const key = `${bucket}:${visitor}`
  // El plazo solo se fija al crear la clave (NX): las siguientes no lo alargan
  const [, used, ttl] = await kv(
    ['SET', key, 0, 'EX', DAY_SECONDS, 'NX'],
    ['INCR', key],
    ['PTTL', key],
  )
  return { allowed: used <= max, left: Math.max(0, max - used), resetAt: Date.now() + ttl }
}

// Devuelve la unidad gastada (si el oráculo no llegó a responder)
export async function refund(visitor, bucket) {
  await kv(['DECR', `${bucket}:${visitor}`])
}

// Cuántas quedan, sin gastar ninguna. resetAt es null si aún no ha gastado ninguna
export async function remaining(visitor, bucket, max) {
  const key = `${bucket}:${visitor}`
  const [used, ttl] = await kv(['GET', key], ['PTTL', key])
  return {
    left: Math.max(0, max - Number(used ?? 0)),
    resetAt: ttl > 0 ? Date.now() + ttl : null,
  }
}

// Voz de un solo uso: /api/oracle guarda su respuesta y le da al navegador un id;
// /api/speak solo pone voz a textos guardados así, y cada uno una sola vez. Así nadie puede
// usar /api/speak para generar su propio audio con nuestra cuenta de ElevenLabs.
const VOICE_SECONDS = 10 * 60
const VOICE_ID = /^[0-9a-f-]{36}$/

export async function saveForVoice(text) {
  const id = randomUUID()
  await kv(['SET', `voice:${id}`, text, 'EX', VOICE_SECONDS])
  return id
}

// El texto guardado con ese id (y se borra), o null si no existe, caducó o ya se usó
export async function takeVoice(id) {
  if (typeof id !== 'string' || !VOICE_ID.test(id)) return null
  const [text] = await kv(['GETDEL', `voice:${id}`])
  return text
}
