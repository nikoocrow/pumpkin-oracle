import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr']
export const DEFAULT_LANGUAGE = 'en'
const STORAGE_KEY = 'oraculo-lang'

function readStoredLanguage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return SUPPORTED_LANGUAGES.includes(stored) ? stored : null
  } catch {
    return null
  }
}

function storeLanguage(lng) {
  try {
    localStorage.setItem(STORAGE_KEY, lng)
  } catch {
    // Almacenamiento no disponible (modo privado, bloqueado…): se ignora.
  }
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    fr: { translation: fr },
  },
  lng: readStoredLanguage() ?? DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: SUPPORTED_LANGUAGES,
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  storeLanguage(lng)
  document.documentElement.lang = lng
})

document.documentElement.lang = i18n.language

export default i18n
