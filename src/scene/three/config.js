// Configuración central: rutas, estados y parámetros de efectos.
// Ajusta aquí el "look" sin tocar la lógica.

// Se prueban en orden: la primera sirve con Vite (carpeta public/),
// la segunda con cualquier servidor estático abierto en la raíz del proyecto.
export const MODEL_URLS = ['models/pumpkin_oracle.glb', 'public/models/pumpkin_oracle.glb']

export const DEFAULT_STATE = 'idle'

// Cada estado = un clip del GLB (exportado desde las pistas NLA de Blender).
// emberRate: chispas por segundo que salen de la boca
export const STATES = {
  idle: { clip: 'idle', label: 'Idle', key: '1', emberRate: 0 },
  hablar: { clip: 'hablar', label: 'Hablar', key: '2', emberRate: 6 },
  reir: { clip: 'reir', label: 'Reír', key: '3', emberRate: 18 },
}

export const RENDER = {
  background: 0x050409, // color del "World" de Blender (≈ 0.012, 0.010, 0.020 lineal)
  fogNear: 6,
  fogFar: 16,
  exposure: 1.0,
  maxPixelRatio: 2,
}

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

export const ANIMATION = {
  crossFade: 0.35, // segundos de mezcla entre estados
}

export const FLICKER = {
  lightAmount: 0.25, // variación de intensidad de las velas (0–1)
  flameAmount: 0.08, // variación de escala de las llamas
  speed: 9,
}

// Brillo del fuego (emisión del material). En Blender: llamas 2.5, lengua 2.2
export const FIRE = {
  flameEmissive: 4.0, // llamas de velas y ojos
  tongueEmissive: 3.5, // lengua de fuego
}

// Encendido: las llamas crecen de golpe, dan un fogonazo y se estabilizan
export const IGNITION = {
  duration: 0.9, // segundos hasta estabilizarse
  overshoot: 1.8, // escala máxima del estallido
  flash: 2.5, // multiplicador de la luz de las velas en el fogonazo
  stagger: 0.18, // retardo entre velas al cargar
  eyesDelay: 0.35, // los ojos y la lengua se encienden después de las velas
  stateFlare: 0.6, // fuerza del fogonazo de ojos y lengua al cambiar de estado (0–1)
}

// La calabaza sigue al cursor en idle (se suma al giro del clip, no lo reemplaza)
export const LOOK_AT = {
  enabled: true,
  maxYaw: 0.35, // giro izquierda/derecha máximo (radianes, ~20°)
  maxPitch: 0.15, // giro arriba/abajo máximo (radianes, ~9°)
  smoothing: 4, // qué tan rápido persigue al cursor (más = más rápido)
  // Ojos (llamas Eye_L / Eye_R): se desplazan dentro de la cuenca, como pupilas
  eyeOffsetX: 0.05, // desplazamiento lateral máximo (unidades de la calabaza)
  eyeOffsetY: 0.03, // desplazamiento vertical máximo
  eyeSmoothing: 10, // más rápido que la cabeza: los ojos llegan primero
}
