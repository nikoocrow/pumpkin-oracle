import { EffectComposer, Bloom, Vignette, Noise, ToneMapping } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'

// Ajusta aquí el "look" del postprocesado
const BLOOM = {
  intensity: 1.2,
  luminanceThreshold: 1, // solo brilla lo que pasa de 1 (llamas emisivas), no la calabaza iluminada
  luminanceSmoothing: 0.3,
  radius: 0.7,
}
const VIGNETTE = { offset: 0.3, darkness: 0.75 }
const GRAIN = 0.06

export default function Effects() {
  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur {...BLOOM} />
      <Vignette {...VIGNETTE} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={GRAIN} />
      {/* El composer desactiva el tone mapping del renderer: va al final, igual que en Blender (AgX) */}
      <ToneMapping mode={ToneMappingMode.AGX} />
    </EffectComposer>
  )
}
