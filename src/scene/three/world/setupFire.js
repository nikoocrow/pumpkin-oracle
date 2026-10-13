import { FIRE } from '../config.js'

// Brillo del fuego: sube la emisión de las llamas (velas + ojos) y de la lengua.
// Solo cambia la intensidad del material; no añade luces ni efectos.
export function setupFire(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return
    const m = obj.material
    if (m.name === 'Candle_Flame') m.emissiveIntensity = FIRE.flameEmissive
    if (m.name === 'Tongue_Fire') m.emissiveIntensity = FIRE.tongueEmissive
  })
}
