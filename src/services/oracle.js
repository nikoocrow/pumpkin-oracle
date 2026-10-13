// Le pregunta al oráculo a través de nuestro servidor (/api/oracle).
// Este archivo corre en el navegador: nunca debe tener API keys.
export async function askOracle(question, userName, language) {
  const response = await fetch('/api/oracle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, userName, language }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error ?? 'The oracle is silent')
  }

  return data.answer
}
