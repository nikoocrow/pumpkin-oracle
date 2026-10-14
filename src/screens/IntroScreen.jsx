import { useTranslation } from 'react-i18next'
import ShareBar from '@/components/overlay/ShareBar'
import './IntroScreen.css'

export default function Puerta({ onStart }) {
  const { t } = useTranslation()
  return (
    <section className="intro">
      <h1 className="intro__title">{t('intro.title')}</h1>
      <p className="intro__welcome">{t('intro.welcome')}</p>
      <p className="intro__candles">{t('intro.candles')}</p>
      <button type="button" onClick={onStart}>
        {t('intro.ctaText')}
      </button>
      <p className="intro__hint">{t('intro.hint')}</p>
      <ShareBar className="intro__share" label={t('share.label')} />
    </section>
  )
}
