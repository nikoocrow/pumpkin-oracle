import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CARDS } from '@/Experience/World/Tarot/cardsData'
import './CardGallery.css'

const SWIPE_PX = 50 // deslizamiento mínimo (móvil) para pasar de carta
const REVEAL_STAGGER_MS = 70 // retraso entre cartas que aparecen a la vez

// Botón "Ver todas las cartas" y la galería que abre: las 22 cartas en un grid, cada una con
// su imagen, nombre y significado corto (locales: cards.<id>). Es un <dialog> modal:
// el navegador se encarga del foco y de cerrarlo con Escape. Tocar fuera también lo cierra.
// Al tocar una carta se ve en grande (zoom): flechas o deslizar para pasar, Escape para volver.
// Las cartas entran animadas, en cascada, a medida que aparecen en pantalla (también al hacer scroll)
export default function CardGallery() {
  const { t } = useTranslation()
  const dialogRef = useRef(null)
  const cardRefs = useRef([])
  const itemRefs = useRef([])
  const observerRef = useRef(null)
  const swipeStart = useRef(null)
  const [zoomed, setZoomed] = useState(null) // índice de la carta en grande, o null

  // Cada carta se anima la primera vez que entra en pantalla. Las que entran juntas
  // (al abrir, o una fila nueva al bajar) van una tras otra
  const revealOnScroll = () => {
    const items = itemRefs.current.filter(Boolean)
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-shown'))
      return
    }
    observerRef.current = new IntersectionObserver(
      (entries, observer) => {
        entries
          .filter((entry) => entry.isIntersecting)
          .forEach((entry, k) => {
            entry.target.style.animationDelay = `${k * REVEAL_STAGGER_MS}ms`
            entry.target.classList.add('is-shown')
            observer.unobserve(entry.target)
          })
      },
      { root: dialogRef.current, threshold: 0.15 },
    )
    items.forEach((el) => observerRef.current.observe(el))
  }

  // Al cerrar, las cartas vuelven a su estado inicial: la próxima vez entran de nuevo
  const resetReveal = () => {
    observerRef.current?.disconnect()
    itemRefs.current.forEach((el) => el?.classList.remove('is-shown'))
  }

  const open = () => {
    dialogRef.current?.showModal()
    revealOnScroll()
  }
  const close = () => dialogRef.current?.close()

  const step = (delta) => setZoomed((i) => (i + delta + CARDS.length) % CARDS.length)

  // Al volver al grid, el foco regresa a la carta que se estaba viendo
  const unzoom = () => {
    cardRefs.current[zoomed]?.focus()
    setZoomed(null)
  }

  const onKeyDown = (event) => {
    if (zoomed === null) return
    if (event.key === 'ArrowRight') step(1)
    if (event.key === 'ArrowLeft') step(-1)
  }

  // Escape con una carta en grande vuelve al grid en vez de cerrar la galería
  const onCancel = (event) => {
    if (zoomed === null) return
    event.preventDefault()
    unzoom()
  }

  const onPointerDown = (event) => (swipeStart.current = event.clientX)
  const onPointerUp = (event) => {
    if (swipeStart.current === null) return
    const dx = event.clientX - swipeStart.current
    swipeStart.current = null
    if (Math.abs(dx) > SWIPE_PX) step(dx < 0 ? 1 : -1)
  }

  const card = zoomed === null ? null : CARDS[zoomed]

  return (
    <>
      <button className="gallery__open" type="button" onClick={open}>
        {t('gallery.open')}
      </button>

      <dialog
        ref={dialogRef}
        className="gallery"
        aria-labelledby="gallery-title"
        onClick={(event) => event.target === dialogRef.current && close()}
        onKeyDown={onKeyDown}
        onCancel={onCancel}
        onClose={() => {
          setZoomed(null)
          resetReveal()
        }}
      >
        <div className="gallery__panel">
          <header className="gallery__header">
            <h2 id="gallery-title" className="gallery__title">
              {t('gallery.title')}
            </h2>
            <button
              className="gallery__close"
              type="button"
              aria-label={t('gallery.close')}
              onClick={close}
            >
              <CloseIcon />
            </button>
          </header>

          <ul className="gallery__grid">
            {CARDS.map((card, i) => (
              <li key={card.id} ref={(el) => (itemRefs.current[i] = el)} className="gallery__card">
                <button
                  ref={(el) => (cardRefs.current[i] = el)}
                  className="gallery__zoom-in"
                  type="button"
                  aria-label={t('gallery.zoom', { name: t(`cards.${card.id}.name`) })}
                  onClick={() => setZoomed(i)}
                >
                  <img
                    className="gallery__image"
                    src={card.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    width="768"
                    height="1072"
                    onLoad={(event) => event.currentTarget.classList.add('is-loaded')}
                  />
                </button>
                <span className="gallery__numeral">{card.numeral}</span>
                <h3 className="gallery__name">{t(`cards.${card.id}.name`)}</h3>
                <p className="gallery__meaning">{t(`cards.${card.id}.meaning`)}</p>
              </li>
            ))}
          </ul>
        </div>

        {card && (
          <div
            className="gallery__zoom"
            role="group"
            aria-label={t(`cards.${card.id}.name`)}
            onClick={(event) => event.target === event.currentTarget && unzoom()}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
          >
            <button
              className="gallery__close gallery__zoom-close"
              type="button"
              aria-label={t('gallery.back')}
              onClick={unzoom}
              autoFocus
            >
              <CloseIcon />
            </button>

            <button
              className="gallery__nav gallery__nav--prev"
              type="button"
              aria-label={t('gallery.prev')}
              onClick={() => step(-1)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>

            <figure key={card.id} className="gallery__zoom-figure">
              <img
                className="gallery__zoom-image"
                src={card.image}
                alt=""
                width="768"
                height="1072"
                draggable="false"
              />
              <figcaption className="gallery__zoom-caption">
                <span className="gallery__numeral">{card.numeral}</span>
                <span className="gallery__name">{t(`cards.${card.id}.name`)}</span>
                <span className="gallery__meaning">{t(`cards.${card.id}.meaning`)}</span>
              </figcaption>
            </figure>

            <button
              className="gallery__nav gallery__nav--next"
              type="button"
              aria-label={t('gallery.next')}
              onClick={() => step(1)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </dialog>
    </>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}
