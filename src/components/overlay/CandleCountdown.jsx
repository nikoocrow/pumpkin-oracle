import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ShareBar from './ShareBar'
import './CandleCountdown.css'

const pad = (n) => String(n).padStart(2, '0')

// Cuenta atrás (hh:mm:ss) hasta que vuelven las velas, flotando sobre la calabaza.
// La escena la coloca en cada fotograma (World.updateOverPumpkin) a través de anchorRef.
// Lleva su propio reloj de 1 s: así no se vuelve a pintar toda la pantalla cada segundo
export default function CandleCountdown({ resetAt, anchorRef }) {
  const { t } = useTranslation()
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const seconds = Math.max(0, Math.ceil((resetAt - now) / 1000))
  const time = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map(pad)
    .join(':')

  return (
    <div ref={anchorRef} className="countdown" role="timer">
      <span className="countdown__label">{t('candles.countdown')}</span>
      <span className="countdown__time">{time}</span>
      {/* Sin velas no queda nada que hacer: buen momento para compartir */}
      <ShareBar className="countdown__share" label={t('share.wait')} />
    </div>
  )
}
