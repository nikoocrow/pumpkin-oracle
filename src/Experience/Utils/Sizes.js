import EventEmitter from './EventEmitter.js'

// Tamaño de la ventana y densidad de píxeles. Avisa con 'resize'.
// pixelRatio hasta 1.5: en pantallas retina casi no se nota y el postprocesado cuesta mucho menos
const MAX_PIXEL_RATIO = 1.5

export default class Sizes extends EventEmitter {
  constructor() {
    super()

    this.update()

    this.onResize = () => {
      this.update()
      this.trigger('resize')
    }
    window.addEventListener('resize', this.onResize)
  }

  update() {
    this.width = window.innerWidth
    this.height = window.innerHeight
    this.pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO)
  }

  destroy() {
    window.removeEventListener('resize', this.onResize)
  }
}
