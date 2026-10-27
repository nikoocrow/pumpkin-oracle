import { CARDS, BACK_IMAGE } from './World/Tarot/cardsData.js'

// Recursos de la escena (los carga Utils/Resources.js).
// Por defecto, los que hacen falta al entrar: la calabaza con sus velas y el mantel de la mesa.
export default [
  {
    name: 'pumpkinModel',
    type: 'gltfModel',
    path: '/models/pumpkin_oracle.glb',
  },
  { name: 'tableTexture', type: 'texture', path: '/textures/mesa.webp' },
]

// La baraja: se carga después, cuando la cámara ya llegó a la calabaza (World.loadTarot)
export const tarotSources = [
  { name: 'cardModel', type: 'gltfModel', path: '/models/card.glb' },
  { name: 'cardBack', type: 'texture', path: BACK_IMAGE },
  // Círculos de los huecos de la lectura (pasado, presente, futuro) sobre la mesa
  ...[1, 2, 3].map((n) => ({
    name: `slot${n}`,
    type: 'texture',
    path: `/textures/slot-${n}.webp`,
  })),
  ...CARDS.map((card) => ({ name: `card_${card.id}`, type: 'texture', path: card.image })),
]
