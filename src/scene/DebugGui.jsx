import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import GUI from 'lil-gui'
import { LIP_SYNC, MOUTH_SHAPES } from '@/services/lipSync'
import { LOOK_AT } from './three/config'

// Panel de depuración (solo con #debug en la URL).
// Zoom = distancia de la cámara al centro de los OrbitControls.
export default function DebugGui() {
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls) // requiere <OrbitControls makeDefault />

  useEffect(() => {
    if (!controls) return

    const gui = new GUI({ title: 'Debug' })
    const cam = gui.addFolder('Cámara')
    const params = { zoom: controls.getDistance() }

    const zoom = cam
      .add(params, 'zoom', 0.5, 25, 0.01)
      .name('Zoom (distancia)')
      .onChange((distance) => {
        // Acerca o aleja la cámara sobre la línea que la une con el target
        camera.position.sub(controls.target).setLength(distance).add(controls.target)
        controls.update()
      })
    cam.add(controls, 'minDistance', 0.5, 25, 0.1).name('Zoom in máximo')
    cam.add(controls, 'maxDistance', 0.5, 25, 0.1).name('Zoom out máximo')
    cam
      .add(camera, 'fov', 10, 90, 1)
      .name('FOV')
      .onChange(() => camera.updateProjectionMatrix())

    // Mantiene el número al día cuando haces zoom con la rueda o el trackpad
    const syncZoom = () => {
      params.zoom = controls.getDistance()
      zoom.updateDisplay()
    }
    controls.addEventListener('change', syncZoom)

    const look = gui.addFolder('Mirar al cursor')
    look.add(LOOK_AT, 'enabled').name('Activado')
    look.add(LOOK_AT, 'head').name('Girar la cabeza')
    look.add(LOOK_AT, 'maxYaw', 0, 1, 0.01).name('Giro lateral máx.')
    look.add(LOOK_AT, 'maxPitch', 0, 0.6, 0.01).name('Giro vertical máx.')
    look.add(LOOK_AT, 'smoothing', 0.5, 15, 0.1).name('Velocidad')
    look.add(LOOK_AT, 'eyeOffsetX', 0, 0.2, 0.005).name('Ojos: lateral máx.')
    look.add(LOOK_AT, 'eyeOffsetY', 0, 0.2, 0.005).name('Ojos: vertical máx.')
    look.add(LOOK_AT, 'eyeSmoothing', 0.5, 30, 0.5).name('Ojos: velocidad')

    // Lip-sync: LIP_SYNC se lee en cada frame, así que los cambios se ven al instante.
    // 'Activado' y 'Volumen' se aplican a partir de la siguiente frase (al conectar el audio).
    const lips = gui.addFolder('Lip-sync')
    lips.add(LIP_SYNC, 'enabled').name('Activado')
    lips.add(LIP_SYNC, 'mix', 0, 1, 0.01).name('Mezcla (clip → voz)')
    lips.add(LIP_SYNC, 'lead', -0.1, 0.2, 0.005).name('Adelanto (s)')
    lips.add(LIP_SYNC, 'attack', 5, 80, 1).name('Apertura (attack)')
    lips.add(LIP_SYNC, 'release', 5, 80, 1).name('Cierre (release)')
    lips.add(LIP_SYNC, 'closed', -1.5, 0, 0.01).name('Boca cerrada')
    lips.add(LIP_SYNC, 'open', 0, 2, 0.01).name('Boca abierta')
    lips.add(LIP_SYNC, 'volume', 0, 1, 0.01).name('Volumen (modula)')
    lips.add(LIP_SYNC, 'gain', 1, 15, 0.1).name('Volumen: ganancia')
    lips.add(LIP_SYNC, 'noiseFloor', 0, 0.15, 0.005).name('Volumen: umbral')
    lips.add(LIP_SYNC, 'curve', 0.5, 3, 0.05).name('Volumen: curva')

    const shapes = lips.addFolder('Apertura por sonido').close()
    shapes.add(MOUTH_SHAPES, 'a', 0, 1, 0.01).name('a')
    shapes.add(MOUTH_SHAPES, 'o', 0, 1, 0.01).name('o')
    shapes.add(MOUTH_SHAPES, 'e', 0, 1, 0.01).name('e')
    shapes.add(MOUTH_SHAPES, 'i', 0, 1, 0.01).name('i / y')
    shapes.add(MOUTH_SHAPES, 'u', 0, 1, 0.01).name('u')
    shapes.add(MOUTH_SHAPES, 'labial', 0, 1, 0.01).name('m b p')
    shapes.add(MOUTH_SHAPES, 'labiodental', 0, 1, 0.01).name('f v')
    shapes.add(MOUTH_SHAPES, 'consonant', 0, 1, 0.01).name('otras consonantes')

    return () => {
      controls.removeEventListener('change', syncZoom)
      gui.destroy()
    }
  }, [camera, controls])

  return null
}
