import IntroScreen from '@/screens/IntroScreen'
import AskName from '@/screens/AskName'
import LanguageSwitcher from '@/components/overlay/LanguageSwitcher'
import { lazy, Suspense, useEffect, useState } from 'react'

// La escena 3D (three, R3F, postprocesado, modelos) va en su propio archivo: la intro carga
// enseguida y la escena se descarga mientras el jugador lee y escribe su nombre
const loadOracleScreen = () => import('@/screens/OracleScreen')
const OracleScreen = lazy(loadOracleScreen)

const baseStyle = {
  minHeight: '100%',
  background: 'var(--color-void)',
  color: 'var(--color-bone)',
  fontFamily: 'var(--font-ui)',
}

export default function App() {
  const [screen, setScreen] = useState('intro')
  const [userName, setUserName] = useState(null)

  useEffect(() => {
    loadOracleScreen()
  }, [])

  const handleName = (name) => {
    setUserName(name)
    setScreen('oracle')
  }

  return (
    <main style={baseStyle}>
      <LanguageSwitcher />
      {screen === 'intro' && <IntroScreen onStart={() => setScreen('askName')} />}
      {screen === 'askName' && <AskName onSubmit={handleName} />}
      {screen === 'oracle' && (
        <Suspense fallback={null}>
          <OracleScreen userName={userName} />
        </Suspense>
      )}
    </main>
  )
}
