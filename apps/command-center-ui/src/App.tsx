import { useEffect } from 'react'
import EmpireDashboard from './components/empire/EmpireDashboard'
import { ToastContainer } from './components/ui/Toast'
import NetworkStatusBar from './components/ui/NetworkStatusBar'
import { ToastProvider, useToastContext } from './contexts/ToastContext'
import './styles/globals.css'
import { useEmpireStore } from './store/empire-store'

function AppContent() {
  const { isConnected, refreshAll } = useEmpireStore();
  const { toasts, removeToast } = useToastContext();

  useEffect(() => {
    // Initialize empire systems and load all data
    console.log('Royal Equips Empire Command Center - Initialized');
    refreshAll();
  }, [refreshAll]);

  return (
    <div className="min-h-screen bg-black">
      <NetworkStatusBar />
      <div className="pt-12"> {/* Add padding to account for fixed status bar */}
        <EmpireDashboard />
      </div>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

export default App
