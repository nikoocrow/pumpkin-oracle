import { useTranslation } from 'react-i18next'
import './IntroScreen.css'

export default function Puerta({ onStart }) {
  const { t } = useTranslation()
  return (
    <section className="intro">
      <h1 className="intro__title">{t('intro.title')}</h1>
      <p className="intro__welcome">{t('intro.welcome')}</p>
      <button type="button" onClick={onStart}>
        {t('intro.ctaText')}
      </button>
      <p className="intro__hint">{t('intro.hint')}</p>
    </section>
  )
}
