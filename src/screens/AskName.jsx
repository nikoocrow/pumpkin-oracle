import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import './AskName.css'

export default function AskName({ onSubmit }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError(true)
      return
    }
    onSubmit(trimmed)
  }

  return (
    <form className="ask-name-container" onSubmit={handleSubmit}>
      <h1 className="ask-name__title">{t('name.title')}</h1>

      <div className="name-input-container">
        <input
          className="ask-name__input"
          type="text"
          placeholder={t('name.placeholder')}
          value={name}
          maxLength={40}
          onChange={(e) => {
            setName(e.target.value)
            setError(false)
          }}
        />
      </div>
      {error && <p className="ask-name__error">{t('name.error')}</p>}

      <button className="ask-name__button" type="submit">
        {t('name.ctaText')}
      </button>
      <button className="ask-nameless__button" type="button" onClick={() => onSubmit(null)}>
        {t('name.ctaText2')}
      </button>
    </form>
  )
}
