import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { colors } from '@/theme/colors'
import { useDebug } from '@/hooks/useDebug'
import Pumpkin from './Pumpkin'
import DebugGui from './DebugGui'
import Effects from './postprocessing/Effects'

export default function OracleScene({ animation, mood }) {
  const debug = useDebug()

  return (
    <Canvas camera={{ position: [0, 2, 4], fov: 32 }}>
      <color attach="background" args={[colors.void]} />

      <ambientLight intensity={0.3} color={colors.ambientCalm} />
      <directionalLight position={[-3, 3, -2]} intensity={0.8} color={colors.moonlight} />

      <Suspense fallback={null}>
        <Pumpkin animation={animation} mood={mood} />
      </Suspense>

      {/* Temporal: para girar la cámara con el ratón mientras desarrollamos */}
      <OrbitControls makeDefault target={[0, 0.75, 0]} minDistance={7.2} maxDistance={10} />

      <Effects />

      {debug && <DebugGui />}
    </Canvas>
  )
}
