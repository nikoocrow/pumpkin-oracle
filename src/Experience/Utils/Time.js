import EventEmitter from './EventEmitter.js'

// Reloj del bucle de render. Avisa con 'tick' en cada fotograma.
// elapsed y delta en segundos; delta tiene tope para que una pestaña en segundo plano
// no haga saltar las animaciones al volver
const MAX_DELTA = 0.1

export default class Time extends EventEmitter {
  constructor() {
    super()

    this.start = performance.now()
    this.current = this.start
    this.elapsed = 0
    this.delta = 1 / 60

    this.frame = window.requestAnimationFrame(() => this.tick())
  }

  tick() {
    const now = performance.now()
    this.delta = Math.min((now - this.current) / 1000, MAX_DELTA)
    this.current = now
    this.elapsed = (now - this.start) / 1000

    this.trigger('tick')

    this.frame = window.requestAnimationFrame(() => this.tick())
  }

  destroy() {
    window.cancelAnimationFrame(this.frame)
  }
}
