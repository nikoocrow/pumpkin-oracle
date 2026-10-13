import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import OracleScene from '@/scene/OracleScene'
import QuestionInput from '@/components/overlay/QuestionInput'
import OracleAnswer from '@/components/overlay/OracleAnswer'
import { askOracle } from '@/services/oracle'
import { fetchSpeech } from '@/services/voice'
import { connectLipSync } from '@/services/lipSync'
import './OracleScreen.css'

export default function OracleScreen({ userName }) {
  const { t, i18n } = useTranslation()
  // status: 'idle' | 'thinking' | 'speaking' | 'answered' | 'error'
  const [status, setStatus] = useState('idle')
  const [answer, setAnswer] = useState('')
  const audioRef = useRef(null)
  const busyRef = useRef(false) // true mientras saluda, piensa o habla: una cosa a la vez
  const greetedRef = useRef(false)

  // Mientras piensa, toda la interfaz cambia al ánimo violeta de tokens.css
  useEffect(() => {
    if (status !== 'thinking') return
    document.documentElement.dataset.mood = 'thinking'
    return () => delete document.documentElement.dataset.mood
  }, [status])

  // Si se sale de la pantalla a mitad de frase, la voz se calla
  useEffect(() => () => audioRef.current?.pause(), [])

  // Reproduce la voz; la promesa termina cuando el oráculo deja de hablar
  const speak = async (text) => {
    const { src } = await fetchSpeech(text)
    const audio = new Audio(src)
    audioRef.current = audio
    // El volumen de esta voz moverá la boca; si falla, se oye igual con el clip 'hablar'
    await connectLipSync(audio).catch((error) => console.warn('[lip-sync]', error))
    await new Promise((resolve, reject) => {
      audio.onended = resolve
      audio.onerror = reject
      audio.onplay = () => setStatus('speaking') // el clip 'hablar' empieza con el sonido
      audio.play().catch(reject)
    })
  }

  // Muestra el texto y lo dice en voz alta; si falla la voz, se queda solo el texto
  const say = async (text) => {
    setAnswer(text)
    try {
      await speak(text)
    } catch (error) {
      console.error('[voice] error:', error.message ?? error)
    }
    setStatus('answered')
  }

  // Al entrar, el oráculo se presenta (una sola vez, aunque StrictMode monte dos veces)
  useEffect(() => {
    if (greetedRef.current) return
    greetedRef.current = true
    busyRef.current = true
    const greeting = userName ? t('greeting.named', { name: userName }) : t('greeting.nameless')
    say(greeting).finally(() => (busyRef.current = false))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al montar
  }, [])

  const handleAsk = async (question) => {
    if (busyRef.current) return
    busyRef.current = true
    setStatus('thinking')

    try {
      await say(await askOracle(question, userName, i18n.resolvedLanguage))
    } catch (error) {
      console.error('[oracle] error:', error.message)
      setStatus('error')
    } finally {
      busyRef.current = false
    }
  }

  return (
    <section className="oracle">
      <OracleScene
        animation={status === 'speaking' ? 'hablar' : 'idle'}
        mood={status === 'thinking' ? 'thinking' : 'calm'}
      />
      <OracleAnswer status={status} answer={answer} />
      <QuestionInput onAsk={handleAsk} />
    </section>
  )
}
