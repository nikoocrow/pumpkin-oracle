import * as THREE from 'three'

// Tiñe el fuego (velas, ojos, lengua) y la luz de las velas con el color del ánimo.
// Las llamas toman su color de una textura emisiva naranja: multiplicarla por violeta
// la dejaría naranja oscuro, así que el shader usa su brillo y lo pinta con el tinte.

const FIRE_MATERIALS = ['Candle_Flame', 'Tongue_Fire']
const TINTED_LIGHTS = /^Candle_[LR]\d_Light$/

// Compartidos por todos los materiales de fuego: cambiar el valor los actualiza a la vez
const uniforms = {
  uMoodMix: { value: 0 }, // 0 = fuego original, 1 = fuego del color del ánimo
  uMoodTint: { value: new THREE.Color() },
}

export function setupMoodTint(root) {
  const lights = []

  root.traverse((obj) => {
    if (obj.isLight && TINTED_LIGHTS.test(obj.name)) {
      obj.userData.baseColor = obj.color.clone()
      lights.push(obj)
    }

    if (obj.isMesh && FIRE_MATERIALS.includes(obj.material.name)) {
      const material = obj.material
      if (material.userData.moodTint) return // materiales compartidos: una sola vez
      material.userData.moodTint = true

      material.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, uniforms)
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            '#include <common>\nuniform float uMoodMix;\nuniform vec3 uMoodTint;',
          )
          .replace(
            '#include <emissivemap_fragment>',
            `#ifdef USE_EMISSIVEMAP
              vec4 emissiveColor = texture2D(emissiveMap, vEmissiveMapUv);
              float glow = dot(emissiveColor.rgb, vec3(0.299, 0.587, 0.114));
              totalEmissiveRadiance *= mix(emissiveColor.rgb, glow * uMoodTint * 1.6, uMoodMix);
            #endif`,
          )
      }
      material.needsUpdate = true
    }
  })

  return lights
}

// Aplica la mezcla actual (0–1) hacia el color `tint`
export function applyMoodTint(lights, mix, tint) {
  uniforms.uMoodMix.value = mix
  uniforms.uMoodTint.value.set(tint)
  for (const light of lights)
    light.color.copy(light.userData.baseColor).lerp(uniforms.uMoodTint.value, mix)
}
