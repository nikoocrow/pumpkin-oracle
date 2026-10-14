import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MAX_SELECTED } from '@/Experience/World/Tarot/Deck'
import { POSITIONS } from '@/Experience/World/Tarot/cardsData'
import './TarotHud.css'

const TOAST_MS = 1800

// Interfaz de la mesa de tarot: contador, botón de barajar, etiquetas bajo cada carta y avisos.
// La baraja (Three.js) la controla a través del puente (hudBridge): setBusy, setSelection,
// showLabel, positionLabel y toast. positionLabel corre cada fotograma: escribe el estilo directamente.
// hideLabels: oculta las etiquetas de las cartas (mientras la calabaza lee la tirada)
// locked: bloquea barajar (mientras el oráculo piensa)
export default function TarotHud({ bridge, onShuffle, hideLabels = false, locked = false }) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(true)
  const [selection, setSelection] = useState([null, null, null])
  // shown: la etiqueta se ve · card: se conserva al ocultarla para que se desvanezca con su texto
  const [labels, setLabels] = useState(() => POSITIONS.map(() => ({ card: null, shown: false })))
  const [toast, setToast] = useState(null)
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

  return (
    <div className={`tarot${hideLabels ? ' is-reading' : ''}`}>
      <header className="tarot__top">
        <p className="tarot__eyebrow">{t('tarot.eyebrow')}</p>
        <h1 className="tarot__title">{t('tarot.title')}</h1>
        <p className="tarot__hint">{t(count === MAX_SELECTED ? 'tarot.hintFull' : 'tarot.hint')}</p>
      </header>

      <div className="tarot__bar">
        <div className="tarot__counter" aria-live="polite">
          {selection.map((card, i) => (
            <span key={i} className={`tarot__dot${card ? ' is-on' : ''}`} />
          ))}
          <span className="tarot__count">
            {count} / {MAX_SELECTED}
          </span>
        </div>
        <button
          className="tarot__shuffle"
          type="button"
          disabled={busy || locked}
          onClick={onShuffle}
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
