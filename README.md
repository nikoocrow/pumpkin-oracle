# The Pumpkin Oracle

Experiencia de Halloween con Three.js (concurso de Three.js Journey): una calabaza tallada que actúa como oráculo y responde preguntas.

Stack: Vite + React (JavaScript, solo la interfaz) · three (escena en clases, sin R3F) · postprocessing · lil-gui · i18next.

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
  Experience/       escena 3D en Three.js puro (patrón de la lección 26 de Three.js Journey)
    Experience.js   singleton: crea y conecta todo; cada clase hace `new Experience()`
    Camera.js       encuadres calabaza / mesa, intro y parallax (OrbitControls con #debug)
    Renderer.js     WebGLRenderer + postprocesado (bloom, viñeta, grano, AgX)
    Sources.js      modelos y texturas que carga Resources
    config.js       luces, fuego y mirada de la calabaza
    Utils/          EventEmitter, Sizes, Time, Resources, Debug (lil-gui), tween
    World/          World (estado y orquestación), Environment, Table, Pumpkin, MoodTint
      Tarot/        Deck (baraja), cardsData, textures, hudBridge
  components/
    ExperienceCanvas.jsx  crea la Experience y le pasa el estado de React
    overlay/        capas sobre el canvas
  screens/          intro, name, idle, thinking, speaking, credits
  services/         IA, voz / micrófono, desbloqueo de audio, estado "pensando"
  i18n/             configuración de i18next
    locales/        en.json, es.json, fr.json, ko.json
  styles/
    tokens.css      variables CSS (color, tipografía, movimiento, ánimos)
    globals.css     reset + estilos base
    fonts.css       carga de fuentes
  theme/
    colors.js       paleta como constantes para Three.js
    moods.js        luz + postprocesado por ánimo
    typography.js   escala tipográfica y ritmo de subtítulos
  assets/
    icons/          ícono del botón de enviar
```

El alias `@/` apunta a `src/` (configurado en `vite.config.js` y `jsconfig.json`).

## Mesa de tarot

La calabaza está en el centro de una mesa de lectura (antes era el proyecto aparte `cartas-threejs`). Al entrar, la cámara se acerca a la calabaza; tras el saludo ofrece leer el tarot y la cámara pasa a la mesa. El jugador elige 3 cartas (pasado / presente / futuro) y, cuando la última se posa, la calabaza lee en voz alta el significado de cada una y el futuro que anuncian (`/api/oracle` con `mode: 'reading'`). Después, las preguntas libres también tienen en cuenta las cartas.

- **Cartas**: `src/Experience/World/Tarot/cardsData.js` (id, imagen y `description`, el significado que usa la calabaza al leer; el servidor la toma de ahí por id, el navegador solo envía ids). Nombre y significado corto, visibles en pantalla, en los locales (`cards.<id>`). Imágenes en `public/cards/`, modelo en `public/models/card.glb` (materiales `Card_Back` y `Card_Front`).
- **Cámara**: `src/Experience/Camera.js`. Con `#debug` en la URL pasa a OrbitControls y aparece el panel de lil-gui (cámara, mirada y lip-sync); se lee al cargar la página.
- **Interfaz**: `TarotHud` recibe las llamadas de la baraja a través de `hudBridge.js`.

## Velas (límite de preguntas)

Cada pregunta o lectura de cartas gasta una de las 3 velas de la escena. Al gastar la primera empieza un plazo de 24 h; al cumplirse vuelven todas. Las cuenta el servidor en Upstash Redis (por IP, guardada como hash), no el navegador.

- **Servidor**: `api/_lib/candles.js`. `/api/oracle` gasta la vela (y la devuelve si Claude falla), `/api/candles` dice cuántas quedan.
- **Voz**: `/api/speak` nunca pone voz a un texto del navegador: solo a la respuesta que guardó `/api/oracle` (un id de un solo uso), al saludo (lo escribe el servidor con los locales) y a la risa; saludo y risa tienen un tope diario.
- **Local**: `vercel dev` con `KV_REST_API_URL` y `KV_REST_API_TOKEN` en `.env` (ver `.env.example`).

## Compartir

`ShareBar` (en la intro y junto a la cuenta atrás sin velas) comparte en LinkedIn y Facebook con sus enlaces oficiales. Instagram y TikTok no tienen enlace para compartir desde la web: en el móvil se abre el menú de compartir del sistema y en el ordenador se copia el enlace. Cada botón muestra cuántas veces se ha pulsado (`/api/share`, en Redis; una vez por visitante, red y día).

La vista previa del enlace (título, descripción e imagen `public/og-image.png`, 1200×630) son las etiquetas `og:` de `index.html`; `vite.config.js` pone la URL absoluta según el entorno de Vercel.

## Escena 3D

React solo pinta la interfaz HTML. La escena es Three.js puro en `src/Experience/`, y `ExperienceCanvas` le habla a través de `World`:

```js
world.setAnimation('hablar') // 'idle' | 'hablar' | 'reir'
world.setGaze('table') // 'free' | 'table' | 'camera'
world.setMood('thinking') // ánimos de theme/moods.js
world.setCandles(3) // velas encendidas (0–3), con fundido
world.startTarot() // la cámara pasa a la mesa y se reparten las cartas
world.deck // lectura, barajar y bloqueo de la baraja
```

En desarrollo, `window.experience` da acceso a todo desde la consola.

## Ánimos

Hay tres ánimos: `calm` (por defecto), `thinking` y `angry`.

- **DOM / CSS**: el ánimo se lee del atributo `data-mood` de `<html>`, que redefine `--mood-core`, `--mood-accent`, `--mood-glow` y los tiempos de transición.

  ```js
  document.documentElement.dataset.mood = 'angry'
  ```

- **Escena 3D**: `moods[mood]` en `src/theme/moods.js` contiene exposición, intensidad y parpadeo de la luz, bloom, viñeta, grano, aberración cromática, temblor de cámara, niebla, tiempos de transición y colores.

Los colores existen dos veces (`tokens.css` y `theme/colors.js`); al cambiar uno, actualiza el otro.

## Idioma

Por defecto `en`; soportados `en`, `es`, `fr` y `ko`. El idioma elegido se guarda en `localStorage` con la clave `oraculo-lang`.
