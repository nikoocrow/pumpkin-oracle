import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/fonts.css'
import '@/styles/tokens.css'
import '@/styles/globals.css'
import '@/i18n'
import '@/services/audioUnlock'
import App from '@/app/App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
