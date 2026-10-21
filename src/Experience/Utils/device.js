// Perfil del dispositivo: en móviles (pantalla táctil y pequeña) la escena ahorra GPU donde
// no se nota a ese tamaño. Las tablets y los ordenadores usan la calidad completa.
const PHONE_MAX_SIDE = 1024 // lado largo de la pantalla en px CSS (un iPad ya pasa de aquí)

const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
const longSide = typeof window !== 'undefined' ? Math.max(screen.width, screen.height) : Infinity

export const IS_PHONE = Boolean(coarse) && longSide <= PHONE_MAX_SIDE

export const QUALITY = IS_PHONE
  ? {
      multisampling: 2, // con la densidad de píxeles de un móvil, 2 muestras bastan
      shadowMapSize: 1024,
      // Ancho de las ilustraciones de las cartas en la GPU. En un móvil la carta revelada
      // nunca pasa de ~500 px de ancho: 576 sigue siendo más que lo que se ve, y las 22
      // caras ocupan ~55 MB de memoria de vídeo en vez de ~97 MB
      cardTextureWidth: 576,
    }
  : { multisampling: 4, shadowMapSize: 2048, cardTextureWidth: null }
