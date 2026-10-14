import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '@/i18n'
import { useBusy } from '@/services/busy'
import './LanguageSwitcher.css'

// Selector de idioma en la esquina: cambia textos, voz, respuestas y dictado.
// i18n guarda la elección en localStorage (ver src/i18n/index.js).
export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const busy = useBusy() // mientras el oráculo piensa no se cambia de idioma

  return (
    <nav className="language" aria-label={t('language.label')}>
      {SUPPORTED_LANGUAGES.map((lng) => (
        <button
          key={lng}
          type="button"
          className="language__option"
          aria-pressed={i18n.resolvedLanguage === lng}
          disabled={busy}
          onClick={() => i18n.changeLanguage(lng)}
        >
          {lng}
        </button>
      ))}
    </nav>
  )
}
