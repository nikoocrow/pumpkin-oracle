import * as THREE from 'three'

const SYMBOL_FONT =
  '"Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols 2", "DejaVu Sans", serif'
// Misma familia que --font-oracle (tokens.css): se espera a que cargue antes de dibujar
export const CANVAS_FONT = '"Cormorant Garamond", Georgia, serif'

function makeCanvas(w, h) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')]
}

function canvasTexture(canvas) {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Círculo rúnico que marca cada hueco sobre la mesa
export function createSlotTexture(label) {
  const S = 512
  const [c, g] = makeCanvas(S, S)
  const cx = S / 2
  g.strokeStyle = 'rgba(255,214,140,.9)'
  g.fillStyle = 'rgba(255,214,140,.9)'
  g.lineWidth = 4
  g.beginPath()
  g.arc(cx, cx, 236, 0, Math.PI * 2)
  g.stroke()
  g.lineWidth = 2
  g.beginPath()
  g.arc(cx, cx, 214, 0, Math.PI * 2)
  g.stroke()
  g.setLineDash([10, 12])
  g.beginPath()
  g.arc(cx, cx, 170, 0, Math.PI * 2)
  g.stroke()
  g.setLineDash([])
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    g.beginPath()
    g.arc(cx + Math.cos(a) * 225, cx + Math.sin(a) * 225, 5, 0, Math.PI * 2)
    g.fill()
  }
  // Estrella de 6 puntas
  for (let k = 0; k < 2; k++) {
    g.beginPath()
    for (let i = 0; i <= 3; i++) {
      const a = (i / 3) * Math.PI * 2 + (k * Math.PI) / 3 - Math.PI / 2
      const x = cx + Math.cos(a) * 150
      const y = cx + Math.sin(a) * 150
      if (i) g.lineTo(x, y)
      else g.moveTo(x, y)
    }
    g.stroke()
  }
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.font = `600 72px ${CANVAS_FONT}`
  g.fillText(label, cx, cx + 4)
  return canvasTexture(c)
}

// Ruido gris centrado en transparente: aclara u oscurece un poco cada píxel al pintarlo encima
function createGrainTile(size = 256) {
  const [c, g] = makeCanvas(size, size)
  const img = g.createImageData(size, size)
  for (let i = 0; i < img.data.length; i += 4) {
    const light = Math.random() < 0.5
    img.data[i] = img.data[i + 1] = img.data[i + 2] = light ? 255 : 0
    img.data[i + 3] = Math.random() * 7 // ≈ ±7 niveles, como el grano original
  }
  g.putImageData(img, 0, 0)
  return c
}

// Terciopelo de la mesa con anillos dorados y constelaciones
export function createTableTexture() {
  const S = 2048
  const [c, g] = makeCanvas(S, S)
  const cx = S / 2
  const bg = g.createRadialGradient(cx, cx, 0, cx, cx, cx)
  bg.addColorStop(0, '#3b1648')
  bg.addColorStop(0.7, '#240c30')
  bg.addColorStop(1, '#14061b')
  g.fillStyle = bg
  g.fillRect(0, 0, S, S)

  // Grano del terciopelo: un mosaico pequeño de ruido repetido (recorrer los 4M píxeles
  // de la textura congelaba la entrada de la cámara)
  g.fillStyle = g.createPattern(createGrainTile(), 'repeat')
  g.fillRect(0, 0, S, S)

  g.strokeStyle = 'rgba(217,181,106,.55)'
  ;[0.96, 0.93, 0.62].forEach((r, i) => {
    g.lineWidth = i === 1 ? 2 : 5
    g.beginPath()
    g.arc(cx, cx, cx * r, 0, Math.PI * 2)
    g.stroke()
  })
  // Marcas zodiacales en el anillo exterior
  g.fillStyle = 'rgba(217,181,106,.6)'
  g.font = `48px ${SYMBOL_FONT}`
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  const signs = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓']
  signs.forEach((s, i) => {
    const a = (i / 12) * Math.PI * 2
    g.save()
    g.translate(cx + Math.cos(a) * cx * 0.785, cx + Math.sin(a) * cx * 0.785)
    g.rotate(a + Math.PI / 2)
    g.fillText(s, 0, 0)
    g.restore()
  })
  g.lineWidth = 1.5
  g.beginPath()
  g.arc(cx, cx, cx * 0.84, 0, Math.PI * 2)
  g.stroke()
  g.beginPath()
  g.arc(cx, cx, cx * 0.73, 0, Math.PI * 2)
  g.stroke()

  // Estrellitas
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.random() * cx * 0.95
    g.fillStyle = `rgba(255,230,180,${0.15 + Math.random() * 0.4})`
    g.beginPath()
    g.arc(cx + Math.cos(a) * r, cx + Math.sin(a) * r, Math.random() * 2.4 + 0.6, 0, Math.PI * 2)
    g.fill()
  }
  const tex = canvasTexture(c)
  tex.anisotropy = 8
  return tex
}

// Brillo radial para el polvo que flota en el haz de luz
export function createHaloTexture() {
  const [c, g] = makeCanvas(128, 128)
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.25, 'rgba(255,255,255,.45)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 128, 128)
  return canvasTexture(c)
}
