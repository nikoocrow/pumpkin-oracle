import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import photo from '@/assets/icons/img/perfil.jpg'
import './Credits.css'

const SITE = 'https://nikocrow.dev'

// Botón de créditos en la esquina, por encima de cualquier pantalla. Abre una tarjeta con
// quién hizo la experiencia; se cierra con Escape, con el botón o tocando fuera
export default function Credits() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onKey = (event) => event.key === 'Escape' && setOpen(false)
    const onPointer = (event) => !rootRef.current?.contains(event.target) && setOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onPointer)
    }
  }, [open])

  return (
    <div className="credits" ref={rootRef}>
      <section
        id="credits-card"
        className={`credits__card${open ? ' is-open' : ''}`}
        aria-hidden={!open}
        inert={!open}
      >
        <img className="credits__photo" src={photo} alt="" loading="lazy" />
        <div className="credits__info">
          <h2 className="credits__name">nikocrow</h2>
          <p className="credits__role">{t('credits.role')}</p>
          <a className="credits__link" href={SITE} target="_blank" rel="noopener noreferrer">
            nikocrow.dev <span aria-hidden="true">↗</span>
          </a>
          <p className="credits__made">{t('credits.madeWith')}</p>
        </div>
      </section>

      <button
        className="credits__toggle"
        type="button"
        aria-expanded={open}
        aria-controls="credits-card"
        onClick={() => setOpen((value) => !value)}
      >
        <img className="credits__avatar" src={photo} alt="" />
        <span className="credits__label">{t('credits.button')}</span>
      </button>
    </div>
  )
}
