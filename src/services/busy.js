import { useSyncExternalStore } from 'react'

// "El oráculo está pensando": mientras dura, toda la interfaz se bloquea (botones, idioma,
// barra de preguntas y cartas). Lo activa OracleScreen; cualquier componente puede leerlo,
// también los que viven fuera de esa pantalla (como el selector de idioma en App).
let busy = false
const listeners = new Set()

export function setBusy(value) {
  if (busy === value) return
  busy = value
  listeners.forEach((listener) => listener())
}

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const useBusy = () => useSyncExternalStore(subscribe, () => busy)
