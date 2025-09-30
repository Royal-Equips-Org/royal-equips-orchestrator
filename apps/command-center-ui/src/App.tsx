import { useCallback, Suspense, lazy } from 'react'
import { ToastContainer } from './components/ui/Toast'
import { ToastProvider, useToastContext } from './contexts/ToastContext'
import { NavigationProvider, useNavigation } from './contexts/NavigationContext'
import { useEmpireStore } from './store/empire-store'
import ModuleScroller from './modules/_shared/components/ModuleScroller'
import TopBar from './components/layout/TopBar'
import './styles/globals.css'

// Lazy loaded modules - each module gets its own full page
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
const ShopifyModule = lazy(() => import('./components/shopify/ShopifyDashboard'))

// Module definitions for navigation
const moduleDefinitions = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', status: 'active' as const },
  { id: 'aira', label: 'AIRA', path: '/aira', status: 'active' as const },
  { id: 'analytics', label: 'Analytics', path: '/analytics', status: 'active' as const },
  { id: 'agents', label: 'Agents', path: '/agents', status: 'active' as const },
  { id: 'revenue', label: 'Revenue', path: '/revenue', status: 'active' as const },
  { id: 'inventory', label: 'Inventory', path: '/inventory', status: 'active' as const },
  { id: 'shopify', label: 'Shopify', path: '/shopify', status: 'active' as const },
  { id: 'marketing', label: 'Marketing', path: '/marketing', status: 'active' as const },
  { id: 'customer-support', label: 'Support', path: '/customer-support', status: 'active' as const },
  { id: 'security', label: 'Security', path: '/security', status: 'active' as const },
  { id: 'finance', label: 'Finance', path: '/finance', status: 'active' as const },
  { id: 'aira-intelligence', label: 'AIRA Intelligence', path: '/aira-intelligence', status: 'active' as const },
]

function AppContent() {
  const { toasts, removeToast } = useToastContext()
  const { state, navigateToModule } = useNavigation()
  const isConnected = useEmpireStore(store => store.isConnected)

  // Handle module navigation
  const handleModuleNavigation = useCallback((path: string, moduleId: string) => {
    navigateToModule(moduleId)
  }, [navigateToModule])

  // Render the current module with full page layout
  const renderCurrentModule = useCallback(() => {
    const loadingFallback = (moduleName: string) => (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-cyan-300 font-mono text-sm">Loading {moduleName}...</p>
        </div>
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
        return (
          <Suspense fallback={loadingFallback('Shopify')}>
            <ShopifyModule />
          </Suspense>
        )
      case 'marketing':
        return (
          <Suspense fallback={loadingFallback('Marketing')}>
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
          <Suspense fallback={loadingFallback('Security')}>
            <SecurityModule />
          </Suspense>
        )
      case 'finance':
        return (
          <Suspense fallback={loadingFallback('Finance')}>
            <FinanceModule />
          </Suspense>
        )
      case 'aira-intelligence':
        return (
          <Suspense fallback={loadingFallback('AIRA Intelligence')}>
            <AIRAIntelligenceModule isActive={true} />
          </Suspense>
        )
      default:
        return (
          <Suspense fallback={loadingFallback('Dashboard')}>
            <DashboardModule />
          </Suspense>
        )
    }
  }, [state.currentModule])

  return (
    <div className="h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-black text-white">
      {/* Main Navigation */}
      <header className="border-b border-cyan-500/20 bg-black/40 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-cyan-400">Royal Equips</h1>
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-gray-300">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
          
          {/* Module Navigation */}
          <nav className="hidden md:flex">
            <ModuleScroller
              modules={moduleDefinitions}
              activeId={state.currentModule}
              onNavigate={handleModuleNavigation}
              className="flex gap-2"
            />
          </nav>
          
          {/* Mobile menu for smaller screens */}
          <div className="md:hidden">
            <TopBar />
          </div>
        </div>
      </header>

      {/* Module Content Area */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          {renderCurrentModule()}
        </div>
      </main>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
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