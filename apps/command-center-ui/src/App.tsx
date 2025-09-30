import { useCallback, useState, Suspense, lazy } from 'react'
import MobileShell from './components/layout/MobileShell'
import NavigationBar from './components/navigation/NavigationBar'
import ModuleScroller from './components/layout/ModuleScroller'
import TopBar from './components/layout/TopBar'
import { ToastContainer } from './components/ui/Toast'
import { ToastProvider, useToastContext } from './contexts/ToastContext'
import { NavigationProvider, useNavigation } from './contexts/NavigationContext'
import { getModuleById } from './config/navigation'
import AICore from './command-center/ai-core/AICore'
import ShopifyDashboard from './components/shopify/ShopifyDashboard'
import EmpireDashboard from './components/empire/EmpireDashboard'
import './styles/globals.css'
import './command-center/ai-core/AiCore.css'

const AiraModule = lazy(() => import('./modules/aira/AiraModule'))
const AnalyticsModule = lazy(() => import('./modules/analytics/AnalyticsModule'))
const AgentsModule = lazy(() => import('./modules/agents/AgentsModule'))
const DashboardModule = lazy(() => import('./modules/dashboard/DashboardModule'))
const RevenueModule = lazy(() => import('./modules/revenue/RevenueModule'))
const InventoryModule = lazy(() => import('./modules/inventory/InventoryModule'))
const MarketingAutomationModule = lazy(() => import('./modules/marketing/MarketingModule'))
const CustomerSupportModule = lazy(() => import('./modules/customer-support/CustomerSupportModule'))
const SecurityModule = lazy(() => import('./modules/security/SecurityModule'))
const FinanceModule = lazy(() => import('./modules/finance/FinanceModule'))
const AIRAIntelligenceModule = lazy(() => import('./modules/aira-intelligence/AIRAIntelligenceModule'))

function AppContent() {
  const { toasts, removeToast } = useToastContext()
  const { state } = useNavigation()
  const [showAICore, setShowAICore] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Handle module access - proper navigation instead of console log
  const handleModuleAccess = useCallback((module: string) => {
    setShowAICore(false) // Exit AI Core mode
    // Use the navigation context to switch modules
    window.location.hash = `#${module}`
    console.log('Navigating to module:', module)
  }, [])

  const renderModule = useCallback(() => {
    const loadingFallback = (moduleName: string) => (
      <div className="h-full flex flex-col items-center justify-center text-cyan-300 font-mono text-sm space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
        <div>Loading {moduleName}…</div>
        <div className="text-xs text-gray-400">Initializing module systems</div>
      </div>
    )

    switch (state.currentModule) {
      case 'aira':
        return (
          <Suspense fallback={loadingFallback('AIRA')}>
            <AiraModule />
          </Suspense>
        )
      case 'analytics':
        return (
          <Suspense fallback={loadingFallback('Analytics')}>
            <AnalyticsModule />
          </Suspense>
        )
      case 'agents':
        return (
          <Suspense fallback={loadingFallback('Agents')}>
            <AgentsModule />
          </Suspense>
        )
      case 'dashboard':
        return (
          <Suspense fallback={loadingFallback('Dashboard')}>
            <DashboardModule />
          </Suspense>
        )
      case 'revenue':
        return (
          <Suspense fallback={loadingFallback('Revenue')}>
            <RevenueModule />
          </Suspense>
        )
      case 'inventory':
        return (
          <Suspense fallback={loadingFallback('Inventory')}>
            <InventoryModule />
          </Suspense>
        )
      case 'shopify':
        return <ShopifyDashboard />
      case 'marketing':
        return (
          <Suspense fallback={loadingFallback('Marketing Automation')}>
            <MarketingAutomationModule />
          </Suspense>
        )
      case 'customer-support':
        return (
          <Suspense fallback={loadingFallback('Customer Support')}>
            <CustomerSupportModule />
          </Suspense>
        )
      case 'security':
        return (
          <Suspense fallback={loadingFallback('Security Center')}>
            <SecurityModule />
          </Suspense>
        )
      case 'finance':
        return (
          <Suspense fallback={loadingFallback('Financial Intelligence')}>
            <FinanceModule />
          </Suspense>
        )
      case 'products':
        return <div className="h-full flex items-center justify-center text-cyan-300">Products Module arriving shortly</div>
      case 'orders':
        return <div className="h-full flex items-center justify-center text-cyan-300">Orders Module under orchestration</div>
      case 'customers':
        return <div className="h-full flex items-center justify-center text-cyan-300">Customers Module sequencing data</div>
      case 'monitoring':
        return <div className="h-full flex items-center justify-center text-cyan-300">System Monitoring calibrating</div>
      case 'settings':
        return <div className="h-full flex items-center justify-center text-cyan-300">Settings hub in preparation</div>
      case 'aira-intelligence':
        return (
          <Suspense fallback={loadingFallback('AIRA Intelligence')}>
            <AIRAIntelligenceModule isActive={true} />
          </Suspense>
        )
      default:
        return <EmpireDashboard />
    }
  }, [state.currentModule])

  // Special AI Core fullscreen mode
  if (showAICore) {
    return (
      <div className="w-full h-screen bg-black overflow-hidden">
        <AICore 
          onExit={() => setShowAICore(false)} 
          isFullscreen={isFullscreen}
        />
        <div className="absolute top-20 right-4 z-50">
          <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
      </div>
    )
  }

  // Main interface - Clean module-based navigation
  return (
    <MobileShell className="ai-core-root">
      <div className="ai-core-shell min-h-screen">
        {/* Navigation Bar */}
        <NavigationBar />
        
        {/* Module Content Area */}
        <div className="pt-20 px-4 sm:px-6 lg:px-16">
          <div className="lg:hidden mb-6">
            <TopBar />
          </div>
          
          {/* Module Container */}
          <div className="rounded-3xl border border-cyan-500/20 bg-black/20 backdrop-blur-2xl p-6 min-h-[80vh]">
            {/* AI Core Entry Button */}
            <div className="mb-6 flex justify-between items-center">
              <h1 className="text-2xl font-bold text-cyan-400 font-mono">
                {getModuleById(state.currentModule)?.label || 'COMMAND CENTER'}
              </h1>
              <button
                onClick={() => setShowAICore(true)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600/20 to-purple-600/20 border border-cyan-500/30 text-cyan-300 rounded-lg hover:bg-cyan-600/30 transition-all duration-200 font-mono text-sm"
              >
                🚀 LAUNCH AI CORE
              </button>
            </div>
            
            {/* Module Scroller */}
            <div className="mb-6">
              <ModuleScroller />
            </div>
            
            {/* Current Module */}
            <div className="module-content">
              {renderModule()}
            </div>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </MobileShell>
  )
}

function App() {
  return (
    <NavigationProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </NavigationProvider>
  )
}

export default App
