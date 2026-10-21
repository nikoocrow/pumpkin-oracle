import Anthropic from '@anthropic-ai/sdk'
import { CARDS, POSITIONS } from '../src/Experience/World/Tarot/cardsData.js'
import { MAX_CANDLES, refund, saveForVoice, spend, visitorId } from './_lib/candles.js'

// Sin argumentos: lee ANTHROPIC_API_KEY de las variables de entorno (servidor)
const client = new Anthropic()

const SYSTEM_PROMPT = `You are the Pumpkin Oracle, an ancient and mischievous spirit living inside a carved pumpkin.
Answer every question in 2 short, mysterious sentences (40 words at most), with a playful Halloween tone.
Write plain text only: no markdown, no asterisks, no emojis (your words are shown on screen and spoken aloud).
Never write laughter of any kind (ha ha, ja ja, je je, ji ji, jo jo, muahaha…): it sounds wrong when spoken aloud.`

// Lectura de las tres cartas de la mesa: se dice en voz alta, así que es breve y sin listas
const READING_PROMPT = `You are the Pumpkin Oracle, an ancient and mischievous spirit living inside a carved pumpkin.
The mortal has just drawn three tarot cards: past, present and future. Read them aloud.
For each card, in that order, say its name and what it reveals about the mortal in that position, inspired by the card's description (do not recite the description word for word).
Then close with one or two sentences about the future that awaits them, weaving the three cards together.
Tone: mysterious and playful, warm at heart. Never ominous, cruel or negative: every card is hopeful, or at most an intriguing riddle with a bright way out.
At most 90 words in total. Plain text only: no markdown, no lists, no asterisks, no emojis (your words are shown on screen and spoken aloud).
Never write laughter of any kind (ha ha, ja ja, je je, ji ji, jo jo, muahaha…): it sounds wrong when spoken aloud.`

// Idiomas de la interfaz: el oráculo responde en el elegido, aunque le escriban en otro
const LANGUAGES = { en: 'English', es: 'Spanish', fr: 'French', ko: 'Korean' }
const REFUSALS = {
  en: 'The spirits refuse to answer that one...',
  es: 'Los espíritus se niegan a responder eso...',
  fr: 'Les esprits refusent de répondre à cela...',
  ko: '영혼들이 그 질문에는 답하기를 거부하는구나...',
}

// El nombre llega del navegador: se acepta solo si es un texto corto, si no se trata como anónimo
function describeMortal(userName) {
  const name = typeof userName === 'string' ? userName.trim().slice(0, 40) : ''
  return name
    ? `The mortal asking is named "${name}". Call them by their name now and then.`
    : 'The mortal refused to give their name. Tease them now and then as a "nameless soul".'
}

// Las cartas también llegan del navegador: { position, id, name }. Solo se aceptan posiciones e ids
// conocidos; la descripción sale de cardsData.js, nunca del navegador. El nombre (en el idioma
// de la interfaz) solo sirve para que el oráculo diga el mismo nombre que ve el jugador.
const CARDS_BY_ID = new Map(CARDS.map((card) => [card.id, card]))
function parseCards(cards) {
  if (!Array.isArray(cards)) return []
  return cards
    .slice(0, POSITIONS.length)
    .filter((c) => POSITIONS.includes(c?.position) && CARDS_BY_ID.has(c?.id))
    .map((c) => ({
      position: c.position,
      name: typeof c.name === 'string' && c.name.trim() ? c.name.trim().slice(0, 40) : c.id,
      description: CARDS_BY_ID.get(c.id).description,
    }))
}

const describeCard = (c) => `${c.position}: ${c.name} (${c.description})`

function describeReading(cards) {
  return cards.length
    ? `On the table lies the mortal's tarot reading: ${cards.map(describeCard).join(' ')} Let these cards color your answer.`
    : ''
}

// Pregunta libre (por defecto) o lectura de las tres cartas (mode: 'reading')
function buildRequest({ mode, question, cards }) {
  if (mode === 'reading') {
    // Una carta en cada posición, en orden: pasado, presente, futuro
    const spread = POSITIONS.map((position) => cards.find((c) => c.position === position))
    if (spread.includes(undefined)) return null
    return {
      system: READING_PROMPT,
      content: `My three cards, from the past to the future:\n${spread.map(describeCard).join('\n')}`,
    }
  }
  if (typeof question !== 'string' || !question.trim() || question.length > 300) return null
  return { system: `${SYSTEM_PROMPT}\n${describeReading(cards)}`, content: question }
}

export async function POST(request) {
  const { mode, question, userName, language: requested, cards } = await request.json()
  const language = Object.hasOwn(LANGUAGES, requested) ? requested : 'en'

  // Protección: nunca confíes en lo que llega del navegador
  const prompt = buildRequest({ mode, question, cards: parseCards(cards) })
  if (!prompt) {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  // Cada pregunta o lectura gasta una vela; sin velas, a esperar a que vuelvan.
  // Si no se pueden contar (Redis caído), no se responde: mejor callar que gastar sin control
  const visitor = visitorId(request)
  let candles
  try {
    const { allowed, left, resetAt } = await spend(visitor, 'candles', MAX_CANDLES)
    candles = { left, resetAt }
    if (!allowed) return Response.json({ error: 'No candles left', candles }, { status: 429 })
  } catch (error) {
    console.error(error)
    return Response.json({ error: 'The oracle is silent' }, { status: 503 })
  }

  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: `${prompt.system}\nAlways reply in ${LANGUAGES[language]}, even if the user writes in another language.\n${describeMortal(userName)}`,
      messages: [{ role: 'user', content: prompt.content }],
    })

    const answer =
      response.stop_reason === 'refusal'
        ? REFUSALS[language]
        : (response.content.find((block) => block.type === 'text')?.text ?? '')

    // voice: id de un solo uso para pedir la voz de esta respuesta a /api/speak.
    // Si no se puede guardar, la respuesta llega igual (solo texto)
    const voice = await saveForVoice(answer).catch((error) => (console.error(error), null))
    return Response.json({ answer, voice, candles })
  } catch (error) {
    console.error(error) // se ve en los logs de Vercel, nunca en el navegador
    // El oráculo no respondió: la vela se devuelve
    const refunded = await refund(visitor, 'candles').then(
      () => true,
      (refundError) => (console.error(refundError), false),
    )
    if (refunded) candles = { ...candles, left: candles.left + 1 }
    return Response.json({ error: 'The oracle is silent', candles }, { status: 502 })
  }
}
