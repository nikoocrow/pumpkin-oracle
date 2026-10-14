// Configuración central de la escena: ajusta aquí el "look" sin tocar la lógica.

// Altura extra de la calabaza (unidades de Blender: 1 = 1 m). Velas y cámara no se mueven.
// Se aplica al cargar el modelo: recarga la página para ver el cambio
export const MODEL_OFFSET_Y = 0.15

export const LIGHTS = {
  // El exportador de Blender convierte vatios a candelas multiplicando por 683 lm/W.
  // Three.js con esos valores quema la imagen; dividimos para igualar el render de EEVEE.
  unitScale: 1 / 683,
  // Multiplicadores extra sobre esa base
  studioScale: 1.5, // Key / Fill / Rim / Bounce (luces de área → focos: emiten ~4x menos)
  practicalScale: 1.0, // velas
  shadowMapSize: 2048,
  castShadowsFrom: ['Key_Light_Spot'],
}

// Brillo del fuego (emisión del material). En Blender: llamas 2.5, lengua 2.2
export const FIRE = {
  flameEmissive: 4.0, // llamas de velas y ojos
  tongueEmissive: 3.5, // lengua de fuego
}

// La calabaza sigue al cursor en idle; con las cartas mira la mesa bajo el cursor,
// y a la cámara al interpretar la tirada
// (se suma al giro del clip, no lo reemplaza)
export const LOOK_AT = {
  enabled: true,
  head: false, // false = solo los ojos siguen al cursor; true = también gira la cabeza
  maxYaw: 0.35, // giro izquierda/derecha máximo (radianes, ~20°)
  maxPitch: 0.15, // giro arriba/abajo máximo (radianes, ~9°)
  smoothing: 4, // qué tan rápido persigue al cursor (más = más rápido)
  // Ojos (llamas Eye_L / Eye_R): se desplazan dentro de la cuenca, como pupilas
  eyeOffsetX: 0.05, // desplazamiento lateral máximo (unidades de la calabaza)
  eyeOffsetY: 0.03, // desplazamiento vertical máximo
  eyeSmoothing: 10, // más rápido que la cabeza: los ojos llegan primero
  // Cartas en la mesa: la cabeza parte de mirar a la cámara y gira hacia el punto de la mesa
  // bajo el cursor. 0 = solo cámara, 1 = del todo al cursor (se le deja de ver la cara desde arriba)
  tableAmount: 0.5,
  tableMaxYaw: 1.1, // giro lateral máximo hacia las cartas de los extremos (radianes, ~63°)
  // Al interpretar la tirada la cabeza mira a la cámara: 1 = de frente, 0 = no gira
  cameraAmount: 1,
}
