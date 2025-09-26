import { useEffect } from 'react'
import EmpireDashboard from './components/empire/EmpireDashboard'
import './styles/globals.css'
import { useEmpireStore } from './store/empire-store'

function App() {
  const { isConnected, refreshAll } = useEmpireStore();

  useEffect(() => {
    // Initialize empire systems and load all data
    console.log('Royal Equips Empire Command Center - Initialized');
    refreshAll();
  }, [refreshAll]);

  return (
    <div className="min-h-screen bg-black">
      {!isConnected && (
        <div className="fixed top-4 right-4 z-50 bg-yellow-600/20 border border-yellow-600/50 text-yellow-400 px-4 py-2 rounded-lg">
          ⚠️ Connecting to Empire API...
        </div>
      )}
      <EmpireDashboard />
    </div>
  )
}

export default App
