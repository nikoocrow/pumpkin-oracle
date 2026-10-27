// Puente entre la baraja (Three.js) y React.
// - Interfaz (TarotHud): se conecta al montarse (bridge.connect). La baraja puede llamarla
//   antes de que el HUD exista: esas llamadas se ignoran.
// - Tirada completa: la baraja llama a bridge.readingComplete(reading) y lo recibe quien
//   se haya suscrito con bridge.onReading(fn) (devuelve la función para desuscribirse).
const METHODS = ['setBusy', 'setSelection', 'showLabel', 'positionLabel', 'toast']

export function createHudBridge() {
  let hud = null
  let readingListener = null
  const bridge = {
    connect: (handle) => {
      hud = handle
    },
    onReading: (fn) => {
      readingListener = fn
      return () => {
        if (readingListener === fn) readingListener = null
      }
    },
    readingComplete: (reading) => readingListener?.(reading),
  }
  for (const method of METHODS) bridge[method] = (...args) => hud?.[method](...args)
  return bridge
}
