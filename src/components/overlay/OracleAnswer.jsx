import { useTranslation } from 'react-i18next'
import './OracleAnswer.css'

// Mientras piensa: un anillo que gira con una llama que tiembla dentro (decorativo: el texto
// de arriba ya lo anuncia a los lectores de pantalla)
function ThinkingSpinner() {
  return (
    <div className="answer__spinner" aria-hidden="true">
      <svg className="answer__flame" viewBox="0 0 24 24">
        <path d="M12 2.5c.8 3.6 5.8 6 5.8 11.6a5.8 5.8 0 0 1-11.6 0c0-3 1.6-5 3.2-6.5-.1 2 .8 3.5 2.3 4.2-.6-3.4.2-6.3.3-9.3Z" />
      </svg>
    </div>
  )
}

// Respuesta del oráculo: texto flotante sobre la escena, sin caja.
// kind: 'answer' (respuesta corta) o 'reading' (lectura de las cartas, más larga y compacta)
export default function OracleAnswer({ status, answer, kind = 'answer' }) {
  const { t } = useTranslation()

  const text = {
    thinking: t('answer.thinking'),
    speaking: answer,
    answered: answer,
    error: t('answer.error'),
    exhausted: answer, // sin velas: cuándo vuelven
  }[status]

  return (
    // aria-live: los lectores de pantalla anuncian cada respuesta nueva
    <div className={`answer is-${kind}`} aria-live="polite">
      {text && (
        // key distinta en cada texto → React recrea el <p> y la animación vuelve a empezar
        <p key={text} className={`answer__text is-${status}`}>
          {text}
        </p>
      )}
      {status === 'thinking' && <ThinkingSpinner />}
    </div>
  )
}
