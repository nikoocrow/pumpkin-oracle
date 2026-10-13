import { useEffect, useState } from 'react'

const isDebugHash = () => window.location.hash === '#debug'

// true cuando la URL termina en #debug (se actualiza al cambiar el hash, sin recargar)
export function useDebug() {
  const [debug, setDebug] = useState(isDebugHash)

  useEffect(() => {
    const onHashChange = () => setDebug(isDebugHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return debug
}
