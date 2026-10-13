# The Pumpkin Oracle

Experiencia de Halloween con Three.js (concurso de Three.js Journey): una calabaza tallada que actúa como oráculo y responde preguntas.

Stack: Vite + React (JavaScript) · three · @react-three/fiber · drei · postprocessing · i18next.

## Scripts

```bash
npm run dev           # servidor de desarrollo
npm run build         # build de producción en dist/
npm run preview       # sirve el build
npm run lint          # ESLint
npm run format        # Prettier (escribe)
npm run format:check  # Prettier (solo comprueba)
```

## Estructura

```
src/
  app/              App.jsx y providers
  components/
    ui/             controles HTML
    overlay/        capas sobre el canvas
  scene/            Three.js / R3F
    postprocessing/
  screens/          intro, name, idle, thinking, speaking, credits
  hooks/
  services/         IA, voz / micrófono
  i18n/             configuración de i18next
    locales/        en.json, es.json, fr.json
  styles/
    tokens.css      variables CSS (color, tipografía, movimiento, ánimos)
    globals.css     reset + estilos base
    fonts.css       carga de fuentes
  theme/
    colors.js       paleta como constantes para Three.js
    moods.js        luz + postprocesado por ánimo
    typography.js   escala tipográfica y ritmo de subtítulos
  assets/
    models/  audio/  textures/
```

El alias `@/` apunta a `src/` (configurado en `vite.config.js` y `jsconfig.json`).

## Ánimos

Hay tres ánimos: `calm` (por defecto), `thinking` y `angry`.

- **DOM / CSS**: el ánimo se lee del atributo `data-mood` de `<html>`, que redefine `--mood-core`, `--mood-accent`, `--mood-glow` y los tiempos de transición.

  ```js
  document.documentElement.dataset.mood = 'angry'
  ```

- **Escena 3D**: `moods[mood]` en `src/theme/moods.js` contiene exposición, intensidad y parpadeo de la luz, bloom, viñeta, grano, aberración cromática, temblor de cámara, niebla, tiempos de transición y colores.

Los colores existen dos veces (`tokens.css` y `theme/colors.js`); al cambiar uno, actualiza el otro.

## Idioma

Por defecto `en`; soportados `en`, `es` y `fr`. El idioma elegido se guarda en `localStorage` con la clave `oraculo-lang`.
