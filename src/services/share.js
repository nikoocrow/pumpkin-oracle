// Contador de "compartir" (/api/share): cuántas veces se ha pulsado cada red social.
// Devuelven { linkedin, facebook, tiktok, instagram }

export async function fetchShares() {
  const response = await fetch('/api/share')
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? 'The shares cannot be counted')
  return data
}

// Suma uno a esa red (el servidor cuenta una vez por visitante, red y día)
export async function countShare(network) {
  const response = await fetch('/api/share', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ network }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? 'The shares cannot be counted')
  return data
}
