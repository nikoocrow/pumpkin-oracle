import { useEffect, useRef, useState } from 'react'

// Chrome, Edge y Safari la exponen con prefijo; Firefox no la soporta.
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

// Dictado por voz con la Web Speech API.
// start(onTranscript) llama a onTranscript con el texto mientras hablas (resultados parciales)
// y se detiene sola cuando haces una pausa.
export function useSpeechRecognition(lang) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)

  // Si el componente se desmonta mientras escucha, soltar el micrófono
  useEffect(() => () => recognitionRef.current?.abort(), [])

  const start = (onTranscript) => {
    if (!SpeechRecognition || recognitionRef.current) return

    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.interimResults = true
    recognition.onresult = (e) => {
      onTranscript(Array.from(e.results, (result) => result[0].transcript).join(''))
    }
    // Se dispara siempre al terminar: por pausa, por stop() o tras un error (p. ej. permiso denegado)
    recognition.onend = () => {
      recognitionRef.current = null
      setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  // stop() entrega lo último que oyó; cancel() lo descarta
  const stop = () => recognitionRef.current?.stop()
  const cancel = () => recognitionRef.current?.abort()

  return { supported: Boolean(SpeechRecognition), listening, start, stop, cancel }
}
