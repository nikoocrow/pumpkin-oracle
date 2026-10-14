import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { countShare, fetchShares } from '@/services/share'
import './ShareBar.css'

const NOTICE_MS = 3500

// Iconos: Font Awesome Free (CC BY 4.0), https://fontawesome.com/license/free
// LinkedIn y Facebook tienen enlace para compartir. Instagram y TikTok no lo tienen en la web:
// en el móvil se abre el menú de compartir del sistema (donde aparecen si están instaladas)
// y en el ordenador se copia el enlace para pegarlo en la app
const NETWORKS = [
  {
    id: 'linkedin',
    name: 'LinkedIn',
    viewBox: '0 0 448 512',
    path: 'M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z',
    shareUrl: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    viewBox: '0 0 320 512',
    path: 'M80 299.3V512H196V299.3h86.5l18-97.8H196V166.9c0-51.7 20.3-71.5 72.7-71.5c16.3 0 29.4 .4 37 1.2V7.9C291.4 4 256.4 0 236.2 0C129.3 0 80 50.5 80 159.4v42.1H14v97.8H80z',
    shareUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${url}`,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    viewBox: '0 0 448 512',
    path: 'M448,209.91a210.06,210.06,0,0,1-122.77-39.25V349.38A162.55,162.55,0,1,1,185,188.31V278.2a74.62,74.62,0,1,0,52.23,71.18V0l88,0a121.18,121.18,0,0,0,1.86,22.17h0A122.18,122.18,0,0,0,381,102.39a121.43,121.43,0,0,0,67,20.14Z',
  },
  {
    id: 'instagram',
    name: 'Instagram',
    viewBox: '0 0 448 512',
    path: 'M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z',
  },
]

// Botones para compartir la experiencia, cada uno con su contador (clics de todos los visitantes).
// label: texto encima de los botones
export default function ShareBar({ label, className = '' }) {
  const { t, i18n } = useTranslation()
  const [counts, setCounts] = useState(null)
  const [notice, setNotice] = useState(null)
  const noticeTimer = useRef(null)

  useEffect(() => {
    fetchShares()
      .then(setCounts)
      .catch((error) => console.warn('[share]', error.message))
    return () => clearTimeout(noticeTimer.current)
  }, [])

  const showNotice = (text) => {
    setNotice(text)
    clearTimeout(noticeTimer.current)
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS)
  }

  const share = async (network) => {
    const url = window.location.origin
    const text = t('share.text')

    if (network.shareUrl) {
      window.open(network.shareUrl(encodeURIComponent(url)), '_blank', 'noopener,noreferrer')
    } else if (navigator.share && window.matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: t('intro.title'), text, url })
      } catch (error) {
        if (error.name === 'AbortError') return // lo cerró sin compartir: no cuenta
        console.warn('[share]', error.message)
        return
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${text} ${url}`)
        showNotice(t('share.copied', { network: network.name }))
      } catch {
        showNotice(t('share.copyFailed', { url }))
        return
      }
    }

    countShare(network.id)
      .then(setCounts)
      .catch((error) => console.warn('[share]', error.message))
  }

  const format = new Intl.NumberFormat(i18n.resolvedLanguage, { notation: 'compact' })

  return (
    <div className={`share ${className}`}>
      {label && <p className="share__label">{label}</p>}
      <ul className="share__list">
        {NETWORKS.map((network) => (
          <li key={network.id}>
            <button
              type="button"
              className={`share__button share__button--${network.id}`}
              aria-label={t('share.on', { network: network.name })}
              onClick={() => share(network)}
            >
              <svg className="share__icon" viewBox={network.viewBox} aria-hidden="true">
                <path d={network.path} />
              </svg>
              {counts && <span className="share__count">{format.format(counts[network.id])}</span>}
            </button>
          </li>
        ))}
      </ul>
      <p className="share__notice" role="status">
        {notice}
      </p>
    </div>
  )
}
