import { useEffect, useRef } from 'react'
import Experience from '@/Experience/Experience'
import Resources from '@/Experience/Utils/Resources'
import sources from '@/Experience/Sources'
import './ExperienceCanvas.css'

// La calabaza se empieza a descargar en cuanto se carga este archivo (durante la intro),
// no al entrar a la escena
Resources.preload(sources)

// Puente entre React y la escena 3D (src/Experience, Three.js puro).
// Crea la Experience sobre su <canvas> y le pasa cada prop a World cuando cambia.
//   ui: puente con TarotHud · deckRef: recibe la baraja (lectura, barajar, bloquear)
//   animation · mood · gaze · tarotActive: estado de la calabaza y de la mesa
//   candles: velas encendidas (las preguntas que le quedan al jugador; undefined = todas)
//   overPumpkinRef: elemento HTML que la escena coloca sobre la cabeza de la calabaza
export default function ExperienceCanvas({
  ui,
  deckRef,
  overPumpkinRef,
  animation,
  mood,
  gaze,
  tarotActive,
  candles,
}) {
  const canvasRef = useRef(null)
  const experienceRef = useRef(null)

  useEffect(() => {
    const experience = new Experience(canvasRef.current, { ui, overPumpkin: overPumpkinRef })
    experienceRef.current = experience
    deckRef.current = experience.world.deck
    return () => {
      experience.destroy()
      experienceRef.current = null
      deckRef.current = null
    }
  }, [ui, deckRef, overPumpkinRef])

  useEffect(() => experienceRef.current?.world.setAnimation(animation), [animation])
  useEffect(() => experienceRef.current?.world.setMood(mood), [mood])
  useEffect(() => experienceRef.current?.world.setGaze(gaze), [gaze])
  useEffect(() => {
    if (candles !== undefined) experienceRef.current?.world.setCandles(candles)
  }, [candles])
  useEffect(() => {
    if (tarotActive) experienceRef.current?.world.startTarot()
  }, [tarotActive])

  return <canvas ref={canvasRef} className="experience" />
}
