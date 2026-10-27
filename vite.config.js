import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dirección pública del sitio, para las etiquetas de compartir de index.html (necesitan URL
// absoluta). En Vercel: la de la rama en las vistas previas, la de producción en producción
const vercelHost =
  process.env.VERCEL_ENV === 'preview'
    ? process.env.VERCEL_BRANCH_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
const SITE_URL = vercelHost ? `https://${vercelHost}` : 'http://localhost:3000'

const siteUrl = () => ({
  name: 'site-url',
  transformIndexHtml: (html) => html.replaceAll('%SITE_URL%', SITE_URL),
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), siteUrl()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
