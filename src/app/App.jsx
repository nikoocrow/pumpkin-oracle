import IntroScreen from '@/screens/IntroScreen'
import AskName from '@/screens/AskName'
import OracleScreen from '@/screens/OracleScreen'
import LanguageSwitcher from '@/components/overlay/LanguageSwitcher'
import { useState } from 'react'

const baseStyle = {
  minHeight: '100%',
  background: 'var(--color-void)',
  color: 'var(--color-bone)',
  fontFamily: 'var(--font-ui)',
}

export default function App() {
  const [screen, setScreen] = useState('intro')
  const [userName, setUserName] = useState(null)

  const handleName = (name) => {
    setUserName(name)
    setScreen('oracle')
  }

  return (
    <main style={baseStyle}>
      <LanguageSwitcher />
      {screen === 'intro' && <IntroScreen onStart={() => setScreen('askName')} />}
      {screen === 'askName' && <AskName onSubmit={handleName} />}
      {screen === 'oracle' && <OracleScreen userName={userName} />}
    </main>
  )
}
