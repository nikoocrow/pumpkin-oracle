import { LIGHTS } from '../config.js'

// Ajusta las luces que vienen en el GLB (KHR_lights_punctual).
// Las luces de área de Blender se exportaron como focos "*_Spot".
export function setupLights(lights) {
  for (const light of lights) {
    const isStudio = light.name.endsWith('_Spot')
    light.intensity *= LIGHTS.unitScale * (isStudio ? LIGHTS.studioScale : LIGHTS.practicalScale)
    light.userData.baseIntensity = light.intensity

    const casts = LIGHTS.castShadowsFrom.includes(light.name)
    light.castShadow = casts
    if (casts) {
      light.shadow.mapSize.set(LIGHTS.shadowMapSize, LIGHTS.shadowMapSize)
      light.shadow.bias = -0.0004
      light.shadow.normalBias = 0.02
      light.shadow.radius = 4
      if (light.shadow.camera) {
        light.shadow.camera.near = 0.5
        light.shadow.camera.far = 20
      }
    }
  }
}
