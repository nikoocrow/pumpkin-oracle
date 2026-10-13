import { useEffect, useRef, useState } from 'react'

// Chrome, Edge y Safari la exponen con prefijo; Firefox no la soporta.
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

// El reconocimiento acierta más con la variante regional que con el idioma a secas
const LOCALES = { en: 'en-US', es: 'es-ES', fr: 'fr-FR' }

// Agrupa los códigos de error de la API en los pocos casos que merece la pena explicar
const ERRORS = {
  'not-allowed': 'denied',
  'service-not-allowed': 'denied',
  'audio-capture': 'noMic',
  'no-speech': 'noSpeech',
  network: 'network',
}

// Dictado por voz con la Web Speech API.
// start(onTranscript, onDone) llama a onTranscript con el texto mientras hablas (resultados parciales)
// y se detiene sola cuando haces una pausa; entonces llama a onDone con la frase completa.
// onDone no llega si se cancela o si falla. Si algo falla, `error` dice qué ('denied', 'noMic'…).
export function useSpeechRecognition(lang) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)
  const onDoneRef = useRef(null) // cancel() lo vacía para que la frase no se entregue

  // Si el componente se desmonta mientras escucha, soltar el micrófono
  useEffect(() => () => recognitionRef.current?.abort(), [])

  const start = (onTranscript, onDone) => {
    if (!SpeechRecognition || recognitionRef.current) return

    const recognition = new SpeechRecognition()
    recognition.lang = LOCALES[lang] ?? lang
    recognition.interimResults = true
    let transcript = ''
    recognition.onresult = (e) => {
      transcript = Array.from(e.results, (result) => result[0].transcript).join('')
      onTranscript(transcript)
    }
    // 'aborted' lo provoca cancel() a propósito: no es un fallo que mostrar
    recognition.onerror = (e) => {
      onDoneRef.current = null
      if (e.error !== 'aborted') setError(ERRORS[e.error] ?? 'generic')
    }
    // Se dispara siempre al terminar: por pausa, por stop() o tras un error (p. ej. permiso denegado)
    recognition.onend = () => {
      recognitionRef.current = null
      setListening(false)
      const done = onDoneRef.current
      onDoneRef.current = null
      if (transcript.trim()) done?.(transcript)
    }

    setError(null)
    try {
      recognition.start()
    } catch {
      setError('generic')
      return
    }
    recognitionRef.current = recognition
    onDoneRef.current = onDone
    setListening(true)
  }

  // stop() entrega lo último que oyó; cancel() lo descarta
  const stop = () => recognitionRef.current?.stop()
  const cancel = () => {
    onDoneRef.current = null
    recognitionRef.current?.abort()
  }
  const clearError = () => setError(null)

  return {
    supported: Boolean(SpeechRecognition),
    listening,
    error,
    start,
    stop,
    cancel,
    clearError,
  }
}
