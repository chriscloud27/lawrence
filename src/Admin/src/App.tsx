import { useState } from 'react'
import { ThemeProvider } from './context/ThemeContext'
import { MainLayout } from './components/layout/MainLayout'
import type { Portal } from './components/layout/TopNav'

const DEFAULT_SCREEN: Record<Portal, string> = {
  parent: 'intake-form',
  agency: 'dashboard',
}

function App() {
  const [activePortal, setActivePortal] = useState<Portal>('parent')
  // Each portal keeps its own last-visited screen across portal switches.
  const [screenByPortal, setScreenByPortal] = useState<Record<Portal, string>>(DEFAULT_SCREEN)
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)

  const handleScreenChange = (screen: string) => {
    setScreenByPortal((prev) => ({ ...prev, [activePortal]: screen }))
  }

  return (
    <ThemeProvider>
      <MainLayout
        activePortal={activePortal}
        onPortalChange={setActivePortal}
        activeScreen={screenByPortal[activePortal]}
        onScreenChange={handleScreenChange}
        selectedParentId={selectedParentId}
        onSelectParent={setSelectedParentId}
      />
    </ThemeProvider>
  )
}

export default App
