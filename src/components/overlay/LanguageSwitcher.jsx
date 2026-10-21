import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '@/i18n'
import { useBusy } from '@/services/busy'
import './LanguageSwitcher.css'

// Cada idioma con su propio nombre: así lo reconoce quien no entiende el idioma actual
const NAMES = { en: 'English', es: 'Español', fr: 'Français', ko: '한국어' }

// Selector de idioma en la esquina: un botón con el idioma actual que despliega la lista.
// Cambia textos, voz, respuestas y dictado. i18n guarda la elección en localStorage
// (ver src/i18n/index.js). Se cierra al elegir, con Escape o tocando fuera
export default function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const busy = useBusy() // mientras el oráculo piensa no se cambia de idioma
  const [expanded, setOpen] = useState(false)
  const open = expanded && !busy // si el oráculo empieza a pensar con la lista abierta, se cierra
  const rootRef = useRef(null)
  const toggleRef = useRef(null)
  const current = i18n.resolvedLanguage

  useEffect(() => {
    if (!open) return
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      toggleRef.current?.focus()
    }
    const onPointer = (event) => !rootRef.current?.contains(event.target) && setOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  const choose = (lng) => {
    i18n.changeLanguage(lng)
    setOpen(false)
    toggleRef.current?.focus()
  }

  return (
    <nav className="language" ref={rootRef} aria-label={t('language.label')}>
      <button
        ref={toggleRef}
        className="language__toggle"
        type="button"
        aria-expanded={open}
        aria-controls="language-list"
        disabled={busy}
        onClick={() => setOpen(!open)}
      >
        <svg className="language__globe" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
        </svg>
        <span className="language__current">{current}</span>
        <svg className="language__chevron" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M3 4.5 6 7.5l3-3" />
        </svg>
      </button>

      <ul id="language-list" className={`language__list${open ? ' is-open' : ''}`} inert={!open}>
        {SUPPORTED_LANGUAGES.map((lng) => (
          <li key={lng}>
            <button
              type="button"
              className="language__option"
              lang={lng}
              aria-pressed={current === lng}
              onClick={() => choose(lng)}
            >
              <span className="language__code">{lng}</span>
              {NAMES[lng]}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
