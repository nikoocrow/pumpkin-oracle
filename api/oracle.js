import Anthropic from '@anthropic-ai/sdk'

// Sin argumentos: lee ANTHROPIC_API_KEY de las variables de entorno (servidor)
const client = new Anthropic()

const SYSTEM_PROMPT = `You are the Pumpkin Oracle, an ancient and mischievous spirit living inside a carved pumpkin.
Answer every question in 2 short, mysterious sentences (40 words at most), with a playful Halloween tone.
Write plain text only: no markdown, no asterisks, no emojis (your words are shown on screen and spoken aloud).`

// Idiomas de la interfaz: el oráculo responde en el elegido, aunque le escriban en otro
const LANGUAGES = { en: 'English', es: 'Spanish', fr: 'French' }
const REFUSALS = {
  en: 'The spirits refuse to answer that one...',
  es: 'Los espíritus se niegan a responder eso...',
  fr: 'Les esprits refusent de répondre à cela...',
}

// El nombre llega del navegador: se acepta solo si es un texto corto, si no se trata como anónimo
function describeMortal(userName) {
  const name = typeof userName === 'string' ? userName.trim().slice(0, 40) : ''
  return name
    ? `The mortal asking is named "${name}". Call them by their name now and then.`
    : 'The mortal refused to give their name. Tease them now and then as a "nameless soul".'
}

export async function POST(request) {
  const { question, userName, language: requested } = await request.json()
  const language = Object.hasOwn(LANGUAGES, requested) ? requested : 'en'

  // Protección: nunca confíes en lo que llega del navegador
  if (typeof question !== 'string' || !question.trim() || question.length > 300) {
    return Response.json({ error: 'Invalid question' }, { status: 400 })
  }

  try {
    const response = await client.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: `${SYSTEM_PROMPT}\nAlways reply in ${LANGUAGES[language]}, even if the user writes in another language.\n${describeMortal(userName)}`,
      messages: [{ role: 'user', content: question }],
    })

    if (response.stop_reason === 'refusal') {
      return Response.json({ answer: REFUSALS[language] })
    }

    const answer = response.content.find((block) => block.type === 'text')?.text ?? ''
    return Response.json({ answer })
  } catch (error) {
    console.error(error) // se ve en los logs de Vercel, nunca en el navegador
    return Response.json({ error: 'The oracle is silent' }, { status: 502 })
  }
}
