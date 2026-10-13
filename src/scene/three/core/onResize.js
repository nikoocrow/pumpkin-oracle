// Mantiene renderer y cámara al tamaño de la ventana.
export function onResize({ renderer, camera }) {
  const resize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
  }
  window.addEventListener('resize', resize)
  resize()
  return () => window.removeEventListener('resize', resize)
}
