import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ExperienceCanvas from '@/components/ExperienceCanvas'
import QuestionInput from '@/components/overlay/QuestionInput'
import OracleAnswer from '@/components/overlay/OracleAnswer'
import TarotHud from '@/components/overlay/TarotHud'
import CandleCountdown from '@/components/overlay/CandleCountdown'
import { createHudBridge } from '@/Experience/World/Tarot/hudBridge'
import { askOracle, readCards, fetchCandles } from '@/services/oracle'
import { fetchSpeech, fetchLaugh, playLaugh } from '@/services/voice'
import { connectLipSync, stopLipSync } from '@/services/lipSync'
import { voiceAudio } from '@/services/audioUnlock'
import { setBusy } from '@/services/busy'
import './OracleScreen.css'

// Duración del clip 'reir': lo que dura la risa si no hay audio
const LAUGH_CLIP_MS = 4000

// Tiempo que falta (ms) como "14 h 32 min" / "8 min"
function formatWait(ms) {
  const minutes = Math.max(1, Math.ceil(ms / 60000))
  const hours = Math.floor(minutes / 60)
  return hours ? `${hours} h ${minutes % 60} min` : `${minutes} min`
}

// Cuenta atrás hasta que vuelven las velas: se actualiza al cambiar resetAt y cada 30 s.
// Al cumplirse llama a onDone
function useWait(resetAt, onDone) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!resetAt) return
    const tick = () => setNow(Date.now())
    const first = setTimeout(tick)
    const timer = setInterval(tick, 30000)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [resetAt])
  const left = resetAt ? resetAt - now : 0
  const done = Boolean(resetAt) && left <= 0
  useEffect(() => {
    if (done) onDone()
  }, [done, onDone])
  return left
}

export default function OracleScreen({ userName }) {
  const { t, i18n } = useTranslation()
  // status: 'idle' | 'thinking' | 'speaking' | 'answered' | 'error' | 'exhausted' (sin velas)
  const [status, setStatus] = useState('idle')
  // Velas que quedan: { left, resetAt } (las cuenta el servidor). null hasta saberlo
  const [candles, setCandles] = useState(null)
  const outOfCandles = candles?.left === 0
  // La cuenta atrás flota sobre la calabaza: la escena la coloca a través de esta ref
  const countdownRef = useRef(null)
  // Al terminar cada frase la calabaza se ríe (clip 'reir', una vez); el texto sigue en pantalla
  const [laughing, setLaughing] = useState(false)
  // Interpretando la tirada: desde que se completa hasta que acaba la risa final.
  // Mientras, la calabaza mira a la cámara; el resto del tarot, al cursor sobre la mesa
  const [interpreting, setInterpreting] = useState(false)
  const [answer, setAnswer] = useState('')
  // 'reading' cuando el texto en pantalla es la lectura de las cartas (más largo)
  const [answerKind, setAnswerKind] = useState('answer')
  const audioRef = useRef(null)
  const busyRef = useRef(false) // true mientras saluda, piensa o habla: una cosa a la vez
  const greetedRef = useRef(false)
  // Tras el saludo, el oráculo ofrece leer el tarot; al aceptar, la cámara pasa a la mesa
  // Tras el saludo el jugador elige: hablar con el oráculo o que le lea el tarot.
  // mode: null (eligiendo) | 'chat' (barra de preguntas) | 'tarot' (la mesa, sin chat)
  const [greeted, setGreeted] = useState(false)
  const [mode, setMode] = useState(null)
  const tarotActive = mode === 'tarot'
  // En la mesa, tras la primera lectura aparece "Hablar con el oráculo"; al pulsarlo, la barra
  // de preguntas (sin salir de la mesa: las preguntas tienen en cuenta las cartas)
  const [cardsRead, setCardsRead] = useState(false)
  const [tarotChat, setTarotChat] = useState(false)

  // Mesa de tarot: la baraja (Three.js) habla con su interfaz (TarotHud) por este puente
  const [tarotUi] = useState(createHudBridge)
  const deckRef = useRef(null)

  // Mientras piensa, toda la interfaz cambia al ánimo violeta de tokens.css y se bloquea:
  // botones, idioma, barra de preguntas y cartas (hasta que llega la respuesta)
  const thinking = status === 'thinking'
  useEffect(() => {
    if (!thinking) return
    document.documentElement.dataset.mood = 'thinking'
    setBusy(true)
    const deck = deckRef.current
    deck?.setLocked(true)
    return () => {
      delete document.documentElement.dataset.mood
      setBusy(false)
      deck?.setLocked(false)
    }
  }, [thinking])

  // Al entrar (y cuando se cumple el plazo) se pregunta al servidor cuántas velas quedan
  const loadCandles = useCallback(() => {
    fetchCandles()
      .then(setCandles)
      .catch((error) => console.warn('[candles]', error.message))
  }, [])
  useEffect(loadCandles, [loadCandles])
  const wait = useWait(candles?.resetAt, loadCandles)
  const waitText = t('candles.out', { time: formatWait(wait) })

  // La risa suena con la misma voz. Se precarga al entrar (y al cambiar de idioma)
  // para que empiece a la vez que la animación
  const language = i18n.resolvedLanguage
  useEffect(() => {
    fetchLaugh(language)
  }, [language])

  // La risa dura lo que dure su audio (la animación 'reir' se repite mientras tanto); sin audio,
  // lo que dura el clip. Al acabar termina también la interpretación de las cartas.
  // Si empieza a pensar otra respuesta, se corta
  useEffect(() => {
    if (!laughing) return
    let stop = null
    let timer = null
    let cancelled = false
    const finish = () => {
      setLaughing(false)
      setInterpreting(false)
    }
    fetchLaugh(language).then((src) => {
      if (cancelled) return
      if (src) stop = playLaugh(src, finish)
      else timer = setTimeout(finish, LAUGH_CLIP_MS)
    })
    return () => {
      cancelled = true
      clearTimeout(timer)
      stop?.()
    }
  }, [laughing, language])

  // Si se sale de la pantalla a mitad de frase, la voz se calla
  useEffect(
    () => () => {
      audioRef.current?.pause()
      stopLipSync()
    },
    [],
  )

  // Reproduce la voz; la promesa termina cuando el oráculo deja de hablar.
  // speech: qué pedirle a /api/speak (ver fetchSpeech)
  const speak = async (speech) => {
    const { src, alignment } = await fetchSpeech(speech)
    // Siempre el mismo <audio>, desbloqueado en el primer clic: Safari bloquea uno nuevo
    const audio = voiceAudio
    audio.src = src
    audioRef.current = audio
    // Los tiempos de cada letra moverán la boca; si falla, se oye igual con el clip 'hablar'
    await connectLipSync(audio, alignment).catch((error) => console.warn('[lip-sync]', error))
    try {
      await new Promise((resolve, reject) => {
        audio.onended = resolve
        audio.onerror = reject
        audio.onplay = () => setStatus('speaking') // el clip 'hablar' empieza con el sonido
        audio.play().catch(reject)
      })
    } finally {
      stopLipSync()
    }
  }

  // Muestra el texto y lo dice en voz alta; si falla la voz (o no hay), se queda solo el texto
  const say = async (text, speech, kind = 'answer') => {
    setAnswer(text)
    setAnswerKind(kind)
    try {
      if (speech) await speak(speech)
    } catch (error) {
      console.error('[voice] error:', error.message ?? error)
    }
    setStatus('answered')
    setLaughing(true)
  }

  // Al entrar, el oráculo se presenta (una sola vez, aunque StrictMode monte dos veces)
  useEffect(() => {
    if (greetedRef.current) return
    greetedRef.current = true
    busyRef.current = true
    const greeting = userName ? t('greeting.named', { name: userName }) : t('greeting.nameless')
    // La voz del saludo la escribe el servidor (el mismo texto): solo se le pasa idioma y nombre
    const speech = { kind: 'greeting', language: i18n.resolvedLanguage, userName }
    say(greeting, speech).finally(() => {
      busyRef.current = false
      setGreeted(true)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, [])

  // Tirada para el servidor: id de cada carta (para su descripción) y el nombre que ve el jugador
  const toSpread = (reading) =>
    reading.map(({ position, card }) => ({
      position,
      id: card.id,
      name: t(`cards.${card.id}.name`),
    }))

  // Con las tres cartas en la mesa, la calabaza lee su significado y el futuro que anuncian.
  // Si está ocupada (hablando o pensando) no interrumpe; cambiar una carta vuelve a pedir lectura.
  // Preguntar y leer las cartas gastan una vela. Sin velas, se muestra cuándo vuelven
  const hear = async (reply, kind) => {
    setCandles(reply.candles)
    await say(reply.answer, reply.voice && { voice: reply.voice }, kind)
  }
  const failed = (error) => {
    console.error('[oracle] error:', error.message)
    if (error.candles) setCandles(error.candles)
    setStatus(error.code === 'no_candles' ? 'exhausted' : 'error')
  }

  const handleReading = async (reading) => {
    if (busyRef.current) return
    if (outOfCandles) return setStatus('exhausted')
    busyRef.current = true
    setLaughing(false)
    setInterpreting(true)
    setStatus('thinking')

    try {
      await hear(await readCards(toSpread(reading), userName, i18n.resolvedLanguage), 'reading')
      setCardsRead(true)
    } catch (error) {
      setInterpreting(false)
      failed(error)
    } finally {
      busyRef.current = false
    }
  }

  // La baraja avisa por el puente; se vuelve a suscribir en cada render para usar el idioma actual
  useEffect(() => tarotUi.onReading(handleReading))

  // Al pasar a la mesa se retira el último texto (el saludo o una respuesta): la calabaza ya
  // terminó de hablar y la carta revelada ocupa el centro de la pantalla
  const startTarot = () => {
    setMode('tarot')
    if (!busyRef.current) setStatus('idle')
  }

  const handleAsk = async (question) => {
    if (busyRef.current) return
    if (outOfCandles) return setStatus('exhausted')
    busyRef.current = true
    setLaughing(false)
    setStatus('thinking')

    try {
      // Las cartas elegidas viajan con la pregunta
      const cards = toSpread(deckRef.current?.reading() ?? [])
      await hear(await askOracle(question, userName, i18n.resolvedLanguage, cards))
    } catch (error) {
      failed(error)
    } finally {
      busyRef.current = false
    }
  }

  const questionInput = (autoFocus = false) => (
    <QuestionInput
      autoFocus={autoFocus}
      onAsk={handleAsk}
      disabled={thinking || outOfCandles}
      notice={outOfCandles ? waitText : null}
    />
  )

  return (
    <section className="oracle">
      <ExperienceCanvas
        animation={status === 'speaking' ? 'hablar' : laughing ? 'reir' : 'idle'}
        mood={status === 'thinking' ? 'thinking' : 'calm'}
        ui={tarotUi}
        deckRef={deckRef}
        overPumpkinRef={countdownRef}
        tarotActive={tarotActive}
        gaze={tarotActive ? (interpreting ? 'camera' : 'table') : 'free'}
        candles={candles?.left}
      />
      {tarotActive && (
        <TarotHud
          bridge={tarotUi}
          onShuffle={() => deckRef.current?.shuffle()}
          // La calabaza narra las cartas: sus etiquetas se apartan para dejar sitio a la lectura
          hideLabels={answerKind === 'reading' && !thinking}
          locked={thinking}
        />
      )}
      {outOfCandles && candles.resetAt && (
        <CandleCountdown resetAt={candles.resetAt} anchorRef={countdownRef} />
      )}
      <OracleAnswer
        status={status}
        answer={status === 'exhausted' ? waitText : answer}
        kind={answerKind}
      />
      {/* Las velas de la escena son el contador; para lectores de pantalla, también en texto */}
      {candles && (
        <p className="oracle__candles" aria-live="polite">
          {t('candles.left', { count: candles.left })}
        </p>
      )}

      {/* Mientras saluda no hay interfaz; al terminar, las dos opciones donde irá la barra */}
      {greeted && mode === null && (
        <div className="oracle__choices" role="group" aria-label={t('choice.label')}>
          <button className="oracle__choice" type="button" onClick={() => setMode('chat')}>
            {t('choice.chat')}
          </button>
          <button className="oracle__choice" type="button" onClick={startTarot}>
            {t('tarot.offer')}
          </button>
        </div>
      )}

      {/* Hablando, el tarot sigue a mano arriba por si después quiere las cartas */}
      {mode === 'chat' && (
        <>
          <button className="oracle__tarot" type="button" onClick={startTarot} disabled={thinking}>
            {t('tarot.offer')}
          </button>
          {questionInput()}
        </>
      )}

      {tarotActive &&
        cardsRead &&
        (tarotChat ? (
          questionInput(true)
        ) : (
          <div className="oracle__choices">
            <button className="oracle__choice" type="button" onClick={() => setTarotChat(true)}>
              {t('choice.chat')}
            </button>
          </div>
        ))}
    </section>
  )
}
