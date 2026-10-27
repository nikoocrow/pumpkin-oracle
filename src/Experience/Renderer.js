import * as THREE from 'three'
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  VignetteEffect,
  NoiseEffect,
  ToneMappingEffect,
  HueSaturationEffect,
  BrightnessContrastEffect,
  BlendFunction,
  ToneMappingMode,
} from 'postprocessing'
import Experience from './Experience.js'
import { QUALITY } from './Utils/device.js'

// Ajusta aquí el "look" del postprocesado
const BLOOM = {
  intensity: 1.5,
  luminanceThreshold: 1, // solo brilla lo que pasa de 1 (llamas emisivas), no la calabaza iluminada
  luminanceSmoothing: 0.3,
  radius: 0.7,
  // El halo es un desenfoque: calcularlo a media resolución no se distingue y cuesta 4 veces menos
  resolutionScale: 0.5,
}
const VIGNETTE = { offset: 0.3, darkness: 0.75 }
const GRAIN = 0.06
// Etalonaje tras el tone mapping: AgX deja los colores algo lavados; esto los vuelve más
// cálidos y profundos (violetas intensos, dorados que destacan)
const GRADE = { saturation: 0.12, contrast: 0.1 }

// WebGLRenderer + postprocesado (bloom, viñeta, grano, tone mapping AgX como en Blender y etalonaje)
export default class Renderer {
  constructor() {
    this.experience = new Experience()
    this.canvas = this.experience.canvas
    this.sizes = this.experience.sizes
    this.scene = this.experience.scene
    this.camera = this.experience.camera

    this.setInstance()
    this.setComposer()
  }

  setInstance() {
    this.instance = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false, // el composer hace su propio multisampling
      powerPreference: 'high-performance',
    })
    this.instance.outputColorSpace = THREE.SRGBColorSpace
    // El tone mapping lo aplica el composer al final (AgX), no el renderer
    this.instance.toneMapping = THREE.NoToneMapping
    this.instance.shadowMap.enabled = true
    // PCF: three ya no tiene PCFSoftShadowMap (caía en esta igual)
    this.instance.shadowMap.type = THREE.PCFShadowMap
    this.instance.setSize(this.sizes.width, this.sizes.height)
    this.instance.setPixelRatio(this.sizes.pixelRatio)
  }

  setComposer() {
    this.composer = new EffectComposer(this.instance, {
      frameBufferType: THREE.HalfFloatType, // el bloom necesita valores > 1
      multisampling: QUALITY.multisampling,
    })
    this.composer.addPass(new RenderPass(this.scene, this.camera.instance))

    const noise = new NoiseEffect({ premultiply: true, blendFunction: BlendFunction.SOFT_LIGHT })
    noise.blendMode.opacity.value = GRAIN

    this.composer.addPass(
      new EffectPass(
        this.camera.instance,
        new BloomEffect({ mipmapBlur: true, ...BLOOM }),
        new VignetteEffect(VIGNETTE),
        noise,
        // Tras el bloom, igual que en Blender (AgX)
        new ToneMappingEffect({ mode: ToneMappingMode.AGX }),
        new HueSaturationEffect({ saturation: GRADE.saturation }),
        new BrightnessContrastEffect({ contrast: GRADE.contrast }),
      ),
    )
  }

  resize() {
    this.instance.setPixelRatio(this.sizes.pixelRatio)
    this.instance.setSize(this.sizes.width, this.sizes.height)
    this.composer.setSize(this.sizes.width, this.sizes.height)
  }

  update() {
    this.composer.render(this.experience.time.delta)
  }

  destroy() {
    this.composer.dispose()
    this.instance.dispose()
  }
}
