// Panel de depuración (lil-gui), solo con #debug en la URL. Se activa al cargar la página.
// lil-gui se descarga solo en ese caso, así que los paneles se crean cuando llega:
//   debug.addFolder('Cámara', (folder) => folder.add(...))
export default class Debug {
  constructor() {
    this.active = window.location.hash === '#debug'
    if (!this.active) return

    this.ready = import('lil-gui').then(({ default: GUI }) => {
      if (this.destroyed) return null
      this.ui = new GUI({ title: 'Debug' })
      return this.ui
    })
  }

  addFolder(name, setup) {
    if (!this.active) return
    this.ready.then((ui) => ui && setup(ui.addFolder(name)))
  }

  destroy() {
    this.destroyed = true
    this.ui?.destroy()
  }
}
