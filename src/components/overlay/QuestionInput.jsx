import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
// Copia de 128 px de pumokin-icon.png (el original pesa 1.4 MB)
import pumpkinIcon from '@/assets/icons/pumpkin-icon.webp'
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

// Barra para preguntarle al oráculo: escribiendo o dictando con el micrófono.
// disabled: bloqueada mientras el oráculo piensa (o sin velas)
// notice: texto en lugar del placeholder (cuándo vuelven las velas)
// autoFocus: el cursor entra en la barra al aparecer (cuando la pide el jugador)
export default function QuestionInput({
  onAsk,
  disabled = false,
  notice = null,
  autoFocus = false,
}) {
  const { t, i18n } = useTranslation()
  const [question, setQuestion] = useState('')
  const speech = useSpeechRecognition(i18n.language)

  const send = (text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    speech.cancel() // si seguía dictando, que no vuelva a escribir en el input ya vacío
    onAsk(trimmed)
    setQuestion('')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    send(question)
  }

  // Al dejar de hablar (pausa o al pulsar de nuevo) la pregunta se envía sola
  const toggleMic = () => (speech.listening ? speech.stop() : speech.start(setQuestion, send))

  return (
    <form className={`question${disabled ? ' is-disabled' : ''}`} onSubmit={handleSubmit}>
      <p className="question__error" role="status" aria-live="polite">
        {speech.error && t(`question.micError.${speech.error}`)}
      </p>

      <input
        className="question__input"
        type="text"
        aria-label={t('question.label')}
        placeholder={
          notice ?? (speech.listening ? t('question.listening') : t('question.placeholder'))
        }
        value={question}
        maxLength={200}
        autoFocus={autoFocus}
        disabled={disabled}
        onChange={(e) => {
          setQuestion(e.target.value)
          speech.clearError()
        }}
      />

      {speech.supported && (
        <button
          className={`question__mic${speech.listening ? ' is-listening' : ''}`}
          type="button"
          aria-label={speech.listening ? t('question.stopSpeaking') : t('question.speak')}
          aria-pressed={speech.listening}
          disabled={disabled}
          onClick={toggleMic}
        >
          <MicIcon />
        </button>
      )}

      <button
        className="question__send"
        type="submit"
        aria-label={t('question.send')}
        disabled={disabled || !question.trim()}
      >
        <img className="question__send-icon" src={pumpkinIcon} alt="" />
      </button>
    </form>
  )
}
