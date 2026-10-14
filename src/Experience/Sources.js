import { CARDS, BACK_IMAGE } from './World/Tarot/cardsData.js'

// Recursos de la escena (los carga Utils/Resources.js).
// Por defecto, los que hacen falta al entrar: la calabaza con sus velas.
export default [
  {
    name: 'pumpkinModel',
    type: 'gltfModel',
    path: '/models/pumpkin_oracle.glb',
  },
]

// La baraja: se carga después, cuando la cámara ya llegó a la calabaza (World.loadTarot)
export const tarotSources = [
  { name: 'cardModel', type: 'gltfModel', path: '/models/card.glb' },
  { name: 'cardBack', type: 'texture', path: BACK_IMAGE },
  ...CARDS.map((card) => ({ name: `card_${card.id}`, type: 'texture', path: card.image })),
]
