import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import './QuestionInput.css'

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v3" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 7-7 7 7" />
      <path d="M12 19V5" />
    </svg>
  )
}

// Barra para preguntarle al oráculo: escribiendo o dictando con el micrófono.
export default function QuestionInput({ onAsk }) {
  const { t, i18n } = useTranslation()
  const [question, setQuestion] = useState('')
  const speech = useSpeechRecognition(i18n.language)

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = question.trim()
    if (!trimmed) return
    speech.cancel() // si seguía dictando, que no vuelva a escribir en el input ya vacío
    onAsk(trimmed)
    setQuestion('')
  }

  const toggleMic = () => (speech.listening ? speech.stop() : speech.start(setQuestion))

  return (
    <form className="question" onSubmit={handleSubmit}>
      <input
        className="question__input"
        type="text"
        aria-label={t('question.label')}
        placeholder={speech.listening ? t('question.listening') : t('question.placeholder')}
        value={question}
        maxLength={200}
        onChange={(e) => setQuestion(e.target.value)}
      />

      {speech.supported && (
        <button
          className={`question__mic${speech.listening ? ' is-listening' : ''}`}
          type="button"
          aria-label={speech.listening ? t('question.stopSpeaking') : t('question.speak')}
          aria-pressed={speech.listening}
          onClick={toggleMic}
        >
          <MicIcon />
        </button>
      )}

      <button
        className="question__send"
        type="submit"
        aria-label={t('question.send')}
        disabled={!question.trim()}
      >
        <SendIcon />
      </button>
    </form>
  )
}
