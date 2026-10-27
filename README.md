# The Pumpkin Oracle

**[English](#english)** · **[Español](#español)**

<a id="english"></a>

A Halloween experience built with Three.js (Three.js Journey contest): a carved pumpkin that acts as an oracle and answers your questions.

Stack: Vite + React (JavaScript, UI only) · three (class-based scene, no R3F) · postprocessing · lil-gui · i18next.

## Scripts

```bash
npm run dev           # development server
npm run build         # production build into dist/
npm run preview       # serve the build
npm run lint          # ESLint
npm run format        # Prettier (write)
npm run format:check  # Prettier (check only)
```

## Environment variables

> **Without these variables the pumpkin will not talk.** The scene renders, but the oracle won't answer questions, won't read the cards and has no voice.

Copy `.env.example` to `.env` and fill in every variable:

```bash
cp .env.example .env
```

| Variable              | What it's for                                    | Where to get it                                                                                        |
| --------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY`   | Answers and card readings (Claude)               | [console.anthropic.com](https://console.anthropic.com/settings/keys)                                   |
| `ELEVENLABS_API_KEY`  | The pumpkin's voice (text to speech)             | [elevenlabs.io](https://elevenlabs.io/app/settings/api-keys) (ideally a key limited to Text to Speech) |
| `ELEVENLABS_VOICE_ID` | Voice used by ElevenLabs (not secret)            | ElevenLabs voice library                                                                               |
| `KV_REST_API_URL`     | Upstash Redis: candles and answers pending voice | Vercel → Storage → Upstash database → `.env.local` tab                                                 |
| `KV_REST_API_TOKEN`   | Token for the same Upstash database              | Same as above                                                                                          |

All five are required:

- Without `ANTHROPIC_API_KEY`, `/api/oracle` fails and the pumpkin stays silent.
- Without the ElevenLabs ones, `/api/speak` fails: you get text but no voice.
- Without the Upstash ones, `/api/oracle` won't answer (if it can't count candles, it doesn't reply) and there's no voice either.

They are read only by the functions in `/api`, never by the browser. **Do not add the `VITE_` prefix**: Vite would bundle them into the public JavaScript.

The `/api` functions only run with `vercel dev`; `npm run dev` starts Vite alone, without the oracle. In production, set the same variables in Vercel → Settings → Environment Variables.

## Structure

```
src/
  app/              App.jsx and providers
  Experience/       3D scene in plain Three.js (Three.js Journey lesson 26 pattern)
    Experience.js   singleton: creates and wires everything; every class calls `new Experience()`
    Camera.js       pumpkin / table framings, intro and parallax (OrbitControls with #debug)
    Renderer.js     WebGLRenderer + postprocessing (bloom, vignette, grain, AgX)
    Sources.js      models and textures loaded by Resources
    config.js       lights, fire and the pumpkin's gaze
    Utils/          EventEmitter, Sizes, Time, Resources, Debug (lil-gui), tween
    World/          World (state and orchestration), Environment, Table, Pumpkin, MoodTint
      Tarot/        Deck, cardsData, textures, hudBridge
  components/
    ExperienceCanvas.jsx  creates the Experience and passes it React state
    overlay/        layers over the canvas
  screens/          intro, name, idle, thinking, speaking, credits
  services/         AI, voice / microphone, audio unlock, "thinking" state
  i18n/             i18next setup
    locales/        en.json, es.json, fr.json, ko.json
  styles/
    tokens.css      CSS variables (color, typography, motion, moods)
    globals.css     reset + base styles
    fonts.css       font loading
  theme/
    colors.js       palette as constants for Three.js
    moods.js        lighting + postprocessing per mood
    typography.js   type scale and subtitle rhythm
  assets/
    icons/          send button icon
```

The `@/` alias points to `src/` (set in `vite.config.js` and `jsconfig.json`).

## Tarot table

The pumpkin sits at the center of a reading table (formerly the separate `cartas-threejs` project). On entering, the camera moves close to the pumpkin; after the greeting it offers a tarot reading and the camera moves to the table. The player picks 3 cards (past / present / future) and, once the last one lands, the pumpkin reads aloud the meaning of each card and the future they foretell (`/api/oracle` with `mode: 'reading'`). Afterwards, free questions also take the cards into account.

- **Cards**: `src/Experience/World/Tarot/cardsData.js` (id, image and `description`, the meaning the pumpkin uses when reading; the server takes it from there by id, the browser only sends ids). Name and short meaning, shown on screen, live in the locales (`cards.<id>`). Images in `public/cards/`, model in `public/models/card.glb` (materials `Card_Back` and `Card_Front`).
- **Camera**: `src/Experience/Camera.js`. With `#debug` in the URL it switches to OrbitControls and shows the lil-gui panel (camera, gaze and lip-sync); it's read on page load.
- **UI**: `TarotHud` receives calls from the deck through `hudBridge.js`.

## Candles (question limit)

Every question or card reading uses up one of the 3 candles in the scene. Spending the first one starts a 24 h window; when it ends, they all come back. The server counts them in Upstash Redis (per IP, stored as a hash), not the browser.

- **Server**: `api/_lib/candles.js`. `/api/oracle` spends the candle (and refunds it if Claude fails), `/api/candles` says how many are left.
- **Voice**: `/api/speak` never voices text sent by the browser: only the answer stored by `/api/oracle` (a single-use id) and the greeting (written by the server from the locales), which has a daily cap.
- **Local**: `vercel dev` with `KV_REST_API_URL` and `KV_REST_API_TOKEN` in `.env` (see [Environment variables](#environment-variables)).

## Sharing

`ShareBar` (on the intro and next to the no-candles countdown) shares to LinkedIn and Facebook using their official links. Instagram and TikTok have no web share link: on mobile the system share sheet opens, and on desktop the link is copied. Each button shows how many times it has been clicked (`/api/share`, in Redis; once per visitor, network and day).

The link preview (title, description and image `public/og-image.png`, 1200×630) comes from the `og:` tags in `index.html`; `vite.config.js` sets the absolute URL based on the Vercel environment.

## 3D scene

React only renders the HTML UI. The scene is plain Three.js in `src/Experience/`, and `ExperienceCanvas` talks to it through `World`:

```js
world.setAnimation('hablar') // 'idle' | 'hablar' | 'reir'
world.setGaze('table') // 'free' | 'table' | 'camera'
world.setMood('thinking') // moods from theme/moods.js
world.setCandles(3) // lit candles (0–3), with fade
world.startTarot() // the camera moves to the table and the cards are dealt
world.deck // reading, shuffling and locking the deck
```

In development, `window.experience` exposes everything from the console.

## Moods

There are three moods: `calm` (default), `thinking` and `angry`.

- **DOM / CSS**: the mood is read from the `data-mood` attribute on `<html>`, which redefines `--mood-core`, `--mood-accent`, `--mood-glow` and the transition timings.

  ```js
  document.documentElement.dataset.mood = 'angry'
  ```

- **3D scene**: `moods[mood]` in `src/theme/moods.js` holds exposure, light intensity and flicker, bloom, vignette, grain, chromatic aberration, camera shake, fog, transition timings and colors.

Colors exist twice (`tokens.css` and `theme/colors.js`); when you change one, update the other.

## Language

Default `en`; supported `en`, `es`, `fr` and `ko`. The chosen language is saved in `localStorage` under the key `oraculo-lang`.

---

<a id="español"></a>

# Español

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

## Variables de entorno

> **Sin estas variables la calabaza no habla.** La escena se ve, pero el oráculo no responde preguntas, no lee las cartas y no tiene voz.

Copia `.env.example` a `.env` y rellena todas las variables:

```bash
cp .env.example .env
```

| Variable              | Para qué sirve                                      | Dónde conseguirla                                                                                        |
| --------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`   | Respuestas y lectura de cartas (Claude)             | [console.anthropic.com](https://console.anthropic.com/settings/keys)                                     |
| `ELEVENLABS_API_KEY`  | Voz de la calabaza (texto a voz)                    | [elevenlabs.io](https://elevenlabs.io/app/settings/api-keys) (mejor una clave limitada a Text to Speech) |
| `ELEVENLABS_VOICE_ID` | Voz que usa ElevenLabs (no es secreta)              | Biblioteca de voces de ElevenLabs                                                                        |
| `KV_REST_API_URL`     | Upstash Redis: velas y respuestas pendientes de voz | Vercel → Storage → base Upstash → pestaña `.env.local`                                                   |
| `KV_REST_API_TOKEN`   | Token de la misma base de Upstash                   | Igual que la anterior                                                                                    |

Las cinco son obligatorias:

- Sin `ANTHROPIC_API_KEY`, `/api/oracle` falla y la calabaza se queda en silencio.
- Sin las de ElevenLabs, `/api/speak` falla: hay texto, pero no voz.
- Sin las de Upstash, `/api/oracle` no responde (si no puede contar las velas, no contesta) y tampoco hay voz.

Solo las leen las funciones de `/api`, nunca el navegador. **No les pongas el prefijo `VITE_`**: Vite las metería en el JavaScript público.

Las funciones de `/api` solo corren con `vercel dev`; `npm run dev` levanta solo Vite, sin oráculo. En producción, las mismas variables van en Vercel → Settings → Environment Variables.

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
- **Voz**: `/api/speak` nunca pone voz a un texto del navegador: solo a la respuesta que guardó `/api/oracle` (un id de un solo uso), y al saludo (lo escribe el servidor con los locales), que tiene un tope diario.
- **Local**: `vercel dev` con `KV_REST_API_URL` y `KV_REST_API_TOKEN` en `.env` (ver [Variables de entorno](#variables-de-entorno)).

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
