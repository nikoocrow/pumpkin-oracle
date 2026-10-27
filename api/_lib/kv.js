// Upstash Redis (la base de datos de las velas) por su API REST, sin dependencias.
// Las variables las crea la integración de Vercel (en local, en .env.local).
// Las carpetas que empiezan por _ dentro de /api no son endpoints: solo código compartido.

// Ejecuta varios comandos de una vez, en una transacción (o todos o ninguno).
// Devuelve el resultado de cada uno, en orden
export async function kv(...commands) {
  const response = await fetch(`${process.env.KV_REST_API_URL}/multi-exec`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}` },
    body: JSON.stringify(commands),
  })
  if (!response.ok) throw new Error(`[kv] Upstash ${response.status}: ${await response.text()}`)

  const results = await response.json()
  return results.map(({ result, error }) => {
    if (error) throw new Error(`[kv] ${error}`)
    return result
  })
}
