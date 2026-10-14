import Experience from '../Experience.js'
import { INTRO_SECONDS } from '../Camera.js'
import { tarotSources } from '../Sources.js'
import { wait } from '../Utils/tween.js'
import { createMoodFade, stepMoodFade } from './MoodTint.js'
import { CANVAS_FONT } from './Tarot/textures.js'
import Environment from './Environment.js'
import Table from './Table.js'
import Pumpkin from './Pumpkin.js'
import Deck from './Tarot/Deck.js'

// Todo lo que hay en la escena y su estado. La interfaz (React) le habla con:
//   setAnimation('idle' | 'hablar' | 'reir') · setGaze('free' | 'table' | 'camera')
//   setMood('calm' | 'thinking' | …) · setCandles(encendidas) · startTarot()
//   deck (lectura, barajar, bloquear)
// Lo que llega antes de que exista la calabaza se guarda y se aplica al crearla.
export default class World {
  constructor() {
    this.experience = new Experience()
    this.scene = this.experience.scene
    this.resources = this.experience.resources
    this.camera = this.experience.camera
    this.time = this.experience.time

    this.state = { animation: 'idle', gaze: 'free', mood: 'calm', candles: null }
    this.moodFade = createMoodFade()

    // Lo procedural, al instante: la escena aparece mientras baja la cámara
    this.environment = new Environment()
    this.table = new Table()
    this.deck = new Deck() // oculta y vacía hasta que se carga y se pide el tarot

    this.resources.on('ready', () => {
      this.pumpkin = new Pumpkin()
      this.pumpkin.setAnimationName(this.state.animation)
      this.pumpkin.gaze = this.state.gaze
      // Las que ya se sabía que estaban apagadas, apagadas desde el principio (sin animación)
      if (this.state.candles !== null) this.pumpkin.setCandles(this.state.candles, true)
      this.moodFade = createMoodFade() // vuelve a aplicar el tinte actual a sus velas
    })

    this.tarotLoaded = this.loadTarot()
  }

  // La baraja se carga oculta cuando la cámara ya llegó a la calabaza (así no compite con
  // la entrada) y se prepara en la GPU, para estar lista cuando se pida el tarot.
  // Se resuelve a true si quedó lista (si falla, la mesa sigue sin cartas)
  async loadTarot() {
    try {
      await wait(INTRO_SECONDS)
      // La fuente de los números de los huecos tiene que estar lista antes de dibujarlos
      await Promise.race([document.fonts.load(`600 72px ${CANVAS_FONT}`), wait(2.5)])
      if (this.destroyed) return false
      const items = await this.resources.load(tarotSources)
      if (this.destroyed) return false
      this.deck.setResources(items)
      this.deckReady = true
      await this.deck.warmUp()
      return !this.destroyed
    } catch (error) {
      console.error('[tarot]', error)
      return false
    }
  }

  setAnimation(name) {
    this.state.animation = name
    this.pumpkin?.setAnimationName(name)
  }

  setGaze(gaze) {
    this.state.gaze = gaze
    if (this.pumpkin) this.pumpkin.gaze = gaze
  }

  setMood(mood) {
    this.state.mood = mood
  }

  setCandles(lit) {
    this.state.candles = lit
    this.pumpkin?.setCandles(lit)
  }

  // Leer el tarot: la cámara se aleja hasta ver la mesa entera y se reparten las cartas
  async startTarot() {
    if (this.tarotStarted) return
    this.tarotStarted = true
    if (!(await this.tarotLoaded) || this.destroyed) return
    this.camera.showTable()
    await wait(0.9)
    if (!this.destroyed) this.deck.reveal()
  }

  update() {
    // Ánimo: calabaza (fuego y velas) y mesa (foco, haz y polvo) cambian de color a la vez
    const fade = this.moodFade
    if (stepMoodFade(fade, this.state.mood, this.time.delta)) {
      this.pumpkin?.applyMood(fade.mix, fade.tint)
      this.table.applyMood(fade.mix, fade.tint)
    }

    this.pumpkin?.update()
    this.table.update()
    if (this.deckReady) this.deck.update(this.time.elapsed)
  }

  destroy() {
    this.destroyed = true
    this.resources.off('ready')
    this.pumpkin?.destroy()
    this.deck.destroy()
    this.table.destroy()
  }
}
