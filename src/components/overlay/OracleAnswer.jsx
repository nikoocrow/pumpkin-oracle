import { useTranslation } from 'react-i18next'
import './OracleAnswer.css'

// Respuesta del oráculo: texto flotante sobre la escena, sin caja.
export default function OracleAnswer({ status, answer }) {
  const { t } = useTranslation()

  const text = {
    thinking: t('answer.thinking'),
    speaking: answer,
    answered: answer,
    error: t('answer.error'),
  }[status]

  return (
    // aria-live: los lectores de pantalla anuncian cada respuesta nueva
    <div className="answer" aria-live="polite">
      {text && (
        // key distinta en cada texto → React recrea el <p> y la animación vuelve a empezar
        <p key={text} className={`answer__text is-${status}`}>
          {text}
        </p>
      )}
    </div>
  )
}
