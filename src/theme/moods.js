import { ACESFilmicToneMapping } from 'three'
import { colors } from './colors.js'

/**
 * Configuración visual por ánimo de la calabaza.
 * - Las variables CSS equivalentes viven en tokens.css bajo [data-mood="…"].
 * - Para cambiar el ánimo del DOM: document.documentElement.dataset.mood = 'angry'
 *
 * Unidades:
 * - flicker.amplitude: fracción de lightIntensity (0.08 = ±8 %)
 * - flicker.frequency / cameraShake.frequency: Hz, [min, max]
 * - chromaticAberration: offset en UV, [min, max]
 * - transition: ms
 */

export const MOOD_NAMES = ['calm', 'thinking', 'angry']
export const DEFAULT_MOOD = 'calm'
export const TONE_MAPPING = ACESFilmicToneMapping

export const moods = {
  calm: {
    exposure: 1.0,
    lightIntensity: 2.2,
    flicker: { amplitude: 0.08, frequency: [6, 9] },
    bloom: { strength: 0.9, radius: 0.6, threshold: 0.55 },
    vignette: { offset: 0.35, darkness: 0.9 },
    grain: 0.04,
    chromaticAberration: [0, 0],
    cameraShake: { amplitude: 0, frequency: [0, 0] },
    fogDensity: 0.06,
    transition: { in: 600, out: 600 },
    colors: {
      light: colors.ember,
      emissive: colors.pumpkin,
      rim: colors.moonlight,
      ambient: colors.ambientCalm,
      fog: colors.fogCalm,
    },
  },

  thinking: {
    exposure: 0.8,
    lightIntensity: 0.8,
    flicker: { amplitude: 0.3, frequency: [0.3, 0.3] },
    bloom: { strength: 0.5, radius: 0.8, threshold: 0.6 },
    vignette: { offset: 0.3, darkness: 1.05 },
    grain: 0.05,
    chromaticAberration: [0, 0],
    cameraShake: { amplitude: 0, frequency: [0, 0] },
    fogDensity: 0.08,
    transition: { in: 900, out: 400 },
    colors: {
      light: colors.wraithPale,
      emissive: colors.wraith,
      rim: colors.moonlight,
      ambient: colors.ambientThinking,
      fog: colors.fogThinking,
    },
  },

  angry: {
    exposure: 1.15,
    lightIntensity: 3.4,
    flicker: { amplitude: 0.25, frequency: [12, 18] },
    bloom: { strength: 1.6, radius: 0.4, threshold: 0.35 },
    vignette: { offset: 0.5, darkness: 1.25 },
    grain: 0.09,
    chromaticAberration: [0.002, 0.006],
    cameraShake: { amplitude: 0.015, frequency: [20, 20] },
    fogDensity: 0.045,
    transition: { in: 250, out: 1200 },
    colors: {
      light: colors.crimson,
      emissive: colors.blood,
      rim: colors.ember,
      ambient: colors.ambientAngry,
      fog: colors.fogAngry,
    },
  },
}
