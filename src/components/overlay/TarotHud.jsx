import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MAX_SELECTED } from '@/Experience/World/Tarot/Deck'
import { POSITIONS } from '@/Experience/World/Tarot/cardsData'
import './TarotHud.css'

const TOAST_MS = 1800
const MAX_SHUFFLES = 3 // barajadas por lectura: cada una apaga una llama

// Llama encendida o apagada (solo queda la mecha humeando)
function Flame({ lit }) {
  return (
    <svg className={`tarot__flame${lit ? ' is-lit' : ''}`} viewBox="0 0 12 18" aria-hidden="true">
      <path d="M6 1C7.5 4.5 11 6.5 11 11a5 5 0 0 1-10 0c0-2.6 1.4-4 2.6-5.2C4.4 7.4 5 8.4 6 9c-.6-2.6-.6-5.4 0-8z" />
    </svg>
  )
}

// Interfaz de la mesa de tarot: llamas (barajadas que quedan), botón de barajar, etiquetas bajo cada carta y avisos.
// La baraja (Three.js) la controla a través del puente (hudBridge): setBusy, setSelection,
// showLabel, positionLabel y toast. positionLabel corre cada fotograma: escribe el estilo directamente.
// hideLabels: oculta las etiquetas de las cartas (mientras la calabaza lee la tirada)
// locked: bloquea barajar (mientras el oráculo piensa)
// bottomTaken: abajo ya hay interfaz (la barra de preguntas); en móvil barajar vuelve arriba
export default function TarotHud({
  bridge,
  onShuffle,
  hideLabels = false,
  locked = false,
  bottomTaken = false,
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(true)
  const [selection, setSelection] = useState([null, null, null])
  // shown: la etiqueta se ve · card: se conserva al ocultarla para que se desvanezca con su texto
  const [labels, setLabels] = useState(() => POSITIONS.map(() => ({ card: null, shown: false })))
  const [toast, setToast] = useState(null)
  const [shufflesLeft, setShufflesLeft] = useState(MAX_SHUFFLES)
  const labelRefs = useRef([])
  const toastTimer = useRef(null)

  useEffect(() => {
    bridge.connect({
      setBusy,
      setSelection,
      showLabel: (i, card) =>
        setLabels((prev) =>
          prev.map((label, j) =>
            j === i ? { card: card ?? label.card, shown: Boolean(card) } : label,
          ),
        ),
      positionLabel: (i, x, y) => {
        const el = labelRefs.current[i]
        if (!el) return
        el.style.left = `${x}px`
        el.style.top = `${y}px`
      },
      toast: (key) => {
        setToast(key)
        clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast(null), TOAST_MS)
      },
    })
    return () => {
      bridge.connect(null)
      clearTimeout(toastTimer.current)
    }
  }, [bridge])

  const count = selection.filter(Boolean).length

  const shuffle = () => {
    if (shufflesLeft === 0) return
    setShufflesLeft((left) => left - 1)
    onShuffle()
  }

  return (
    <div
      className={`tarot${hideLabels ? ' is-reading' : ''}${bottomTaken ? ' is-bottom-taken' : ''}`}
    >
      <header className="tarot__top">
        <p className="tarot__eyebrow">{t('tarot.eyebrow')}</p>
        <h1 className="tarot__title">{t('tarot.title')}</h1>
        <p className="tarot__hint">{t(count === MAX_SELECTED ? 'tarot.hintFull' : 'tarot.hint')}</p>
      </header>

      <div className="tarot__bar">
        <span
          className="tarot__flames"
          role="img"
          aria-label={t('tarot.shufflesLeft', { count: shufflesLeft })}
          title={t('tarot.shufflesLeft', { count: shufflesLeft })}
        >
          {Array.from({ length: MAX_SHUFFLES }, (_, i) => (
            <Flame key={i} lit={i < shufflesLeft} />
          ))}
        </span>
        <button
          className="tarot__shuffle"
          type="button"
          disabled={busy || locked || shufflesLeft === 0}
          onClick={shuffle}
        >
          {t('tarot.shuffle')}
        </button>
      </div>

      {labels.map(({ card, shown }, i) => (
        <div
          key={i}
          ref={(el) => (labelRefs.current[i] = el)}
          className={`tarot__label tarot__label--${i}${shown ? ' is-shown' : ''}`}
          aria-hidden={!shown}
        >
          <span className="tarot__position">{t(`tarot.positions.${POSITIONS[i]}`)}</span>
          {card && (
            <>
              <strong>{t(`cards.${card.id}.name`)}</strong>
              <em>{t(`cards.${card.id}.meaning`)}</em>
            </>
          )}
        </div>
      ))}

      <p className={`tarot__toast${toast ? ' is-shown' : ''}`} role="status">
        {toast && t(toast)}
      </p>
    </div>
  )
}
