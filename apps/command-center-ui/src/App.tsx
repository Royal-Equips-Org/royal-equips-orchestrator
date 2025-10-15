import { useEffect, Suspense, lazy, useState } from 'react'
import EmpireDashboard from './components/empire/EmpireDashboard'
import ShopifyDashboard from './components/shopify/ShopifyDashboard'  
import NavigationBar from './components/navigation/NavigationBar'
import { ToastContainer } from './components/ui/Toast'
import { ToastProvider, useToastContext } from './contexts/ToastContext'
import { NavigationProvider, useNavigation } from './contexts/NavigationContext'
import { usePerformanceOptimization } from './hooks/usePerformanceOptimization'
import MobileShell from './components/layout/MobileShell'
import TopBar from './components/layout/TopBar'
import ModuleScroller from './modules/_shared/components/ModuleScroller'
import ErrorBoundary from './components/error/ErrorBoundary'

import './styles/globals.css'
import { useEmpireStore } from './store/empire-store'
import { navigationModules } from './config/navigation'

// Lazy load modules for better performance
const AiraModule = lazy(() => import('./modules/aira/AiraModule'));
const AnalyticsModule = lazy(() => import('./modules/analytics/AnalyticsModule'));
const AgentsModule = lazy(() => import('./modules/agents/AgentsModule'));
const DashboardModule = lazy(() => import('./modules/dashboard/DashboardModule'));
const RevenueModule = lazy(() => import('./modules/revenue/RevenueModule'));
const InventoryModule = lazy(() => import('./modules/inventory/InventoryModule'));
const MarketingAutomationModule = lazy(() => import('./modules/marketing/MarketingModule'));
const CustomerSupportModule = lazy(() => import('./modules/customer-support/CustomerSupportModule'));
const SecurityModule = lazy(() => import('./modules/security/SecurityModule'));
const FinanceModule = lazy(() => import('./modules/finance/FinanceModule'));
const AIRAIntelligenceModule = lazy(() => import('./modules/aira-intelligence/AIRAIntelligenceModule'));
const ShopifyModule = lazy(() => import('./modules/shopify/ShopifyModule'));
const AgentOrchestrationModule = lazy(() => import('./modules/agent-orchestration/AgentOrchestrationModule'));
const ProductsModule = lazy(() => import('./modules/products/ProductsModule'));
const ErrorTest = lazy(() => import('./test/ErrorTest'));

function AppContent() {
  const { isConnected, refreshAll } = useEmpireStore();
  const { toasts, removeToast } = useToastContext();
  const { state, navigateToModule } = useNavigation();
  const { optimizePerformance, metrics, recommendations } = usePerformanceOptimization();


  useEffect(() => {
    // Initialize empire systems and load all data
    console.log('Royal Equips Empire Command Center - Initialized');
    refreshAll();
    
    // Trigger performance optimization after initial load
    setTimeout(() => {
      optimizePerformance();
    }, 2000);
  }, [refreshAll, optimizePerformance]);

  // Log performance metrics for monitoring
  useEffect(() => {
    if (metrics) {
      console.log('Performance Metrics:', {
        loadTime: `${metrics.loadTime}ms`,
        renderTime: `${metrics.renderTime}ms`,
        memoryUsage: `${metrics.memoryUsage.toFixed(1)}MB`,
        networkRequests: metrics.networkRequests
      });
      
      if (recommendations.length > 0) {
        console.log('Performance Recommendations:', recommendations);
      }
    }
  }, [metrics, recommendations]);

  // Render current module content
  const renderCurrentModule = () => {
    const loadingFallback = (moduleName: string) => (
      <div className="h-full flex items-center justify-center">
        <div className="text-cyan-400 text-lg">Loading {moduleName}...</div>
      </div>
    );

    switch (state.currentModule) {
      case 'aira':
        return (
          <Suspense fallback={loadingFallback('AIRA')}>
            <AiraModule />
          </Suspense>
        );
      case 'analytics':
        return (
          <Suspense fallback={loadingFallback('Analytics')}>
            <AnalyticsModule />
          </Suspense>
        );
      case 'agents':
        return (
          <Suspense fallback={loadingFallback('Agents')}>
            <AgentsModule />
          </Suspense>
        );
      case 'dashboard':
        return (
          <Suspense fallback={loadingFallback('Dashboard')}>
            <DashboardModule />
          </Suspense>
        );
      case 'revenue':
        return (
          <Suspense fallback={loadingFallback('Revenue')}>
            <RevenueModule />
          </Suspense>
        );
      case 'inventory':
        return (
          <Suspense fallback={loadingFallback('Inventory')}>
            <InventoryModule />
          </Suspense>
        );
      case 'shopify':
        return (
          <Suspense fallback={loadingFallback('Shopify Integration')}>
            <ShopifyModule />
          </Suspense>
        );
      case 'agent-orchestration':
        return (
          <Suspense fallback={loadingFallback('Agent Orchestration')}>
            <AgentOrchestrationModule />
          </Suspense>
        );
      case 'marketing':
        return (
          <Suspense fallback={loadingFallback('Marketing Automation')}>
            <MarketingAutomationModule />
          </Suspense>
        );
      case 'customer-support':
        return (
          <Suspense fallback={loadingFallback('Customer Support')}>
            <CustomerSupportModule />
          </Suspense>
        );
      case 'security':
        return (
          <Suspense fallback={loadingFallback('Security Center')}>
            <SecurityModule />
          </Suspense>
        );
      case 'finance':
        return (
          <Suspense fallback={loadingFallback('Financial Intelligence')}>
            <FinanceModule />
          </Suspense>
        );
      case 'products':
        return (
          <Suspense fallback={loadingFallback('Products')}>
            <ProductsModule />
          </Suspense>
        );
      case 'orders':
        return (
          <Suspense fallback={loadingFallback('Orders')}>
            <div className="min-h-screen bg-black text-white p-6">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center space-x-4 mb-8">
                  <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" />
                  </svg>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Order Management
                  </h1>
                </div>
                <p className="text-gray-300 mb-6">Complete order lifecycle management and fulfillment automation</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                    <h3 className="text-xl font-semibold text-blue-400 mb-4">Order Processing</h3>
                    <p className="text-gray-400">Automated order processing and workflow management</p>
                  </div>
                  <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                    <h3 className="text-xl font-semibold text-blue-400 mb-4">Fulfillment Center</h3>
                    <p className="text-gray-400">Real-time fulfillment tracking and logistics coordination</p>
                  </div>
                  <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                    <h3 className="text-xl font-semibold text-blue-400 mb-4">Customer Communication</h3>
                    <p className="text-gray-400">Automated notifications and delivery updates</p>
                  </div>
                </div>
              </div>
            </div>
          </Suspense>
        );
      case 'customers':
        return (
          <Suspense fallback={loadingFallback('Customers')}>
            <div className="min-h-screen bg-black text-white p-6">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center space-x-4 mb-8">
                  <svg className="w-8 h-8 text-pink-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                    Customer Management
                  </h1>
                </div>
                <p className="text-gray-300 mb-6">Advanced customer relationship management and analytics</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                    <h3 className="text-xl font-semibold text-pink-400 mb-4">Customer Profiles</h3>
                    <p className="text-gray-400">Comprehensive customer data and behavior analysis</p>
                  </div>
                  <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                    <h3 className="text-xl font-semibold text-pink-400 mb-4">Segmentation</h3>
                    <p className="text-gray-400">AI-powered customer segmentation and targeting</p>
                  </div>
                  <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                    <h3 className="text-xl font-semibold text-pink-400 mb-4">Lifetime Value</h3>
                    <p className="text-gray-400">Customer lifetime value prediction and optimization</p>
                  </div>
                </div>
              </div>
            </div>
          </Suspense>
        );
      case 'monitoring':
        return (
          <Suspense fallback={loadingFallback('Monitoring')}>
            <div className="min-h-screen bg-black text-white p-6">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center space-x-4 mb-8">
                  <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                    System Monitoring
                  </h1>
                </div>
                <p className="text-gray-300 mb-6">Real-time system health and performance monitoring</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                    <h3 className="text-xl font-semibold text-green-400 mb-4">Performance Metrics</h3>
                    <p className="text-gray-400">Real-time performance monitoring and alerting</p>
                  </div>
                  <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                    <h3 className="text-xl font-semibold text-green-400 mb-4">System Health</h3>
                    <p className="text-gray-400">Infrastructure health checks and diagnostics</p>
                  </div>
                  <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                    <h3 className="text-xl font-semibold text-green-400 mb-4">Alert Management</h3>
                    <p className="text-gray-400">Intelligent alerting and incident management</p>
                  </div>
                </div>
              </div>
            </div>
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={loadingFallback('Settings')}>
            <div className="min-h-screen bg-black text-white p-6">
              <div className="max-w-7xl mx-auto">
                <div className="flex items-center space-x-4 mb-8">
                  <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-400 to-white bg-clip-text text-transparent">
                    Empire Settings
                  </h1>
                </div>
                <p className="text-gray-300 mb-6">Configure and customize your Royal Equips Empire</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                    <h3 className="text-xl font-semibold text-gray-400 mb-4">System Configuration</h3>
                    <p className="text-gray-400">Core system settings and API configurations</p>
                  </div>
                  <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                    <h3 className="text-xl font-semibold text-gray-400 mb-4">Security Settings</h3>
                    <p className="text-gray-400">Enterprise security and access control</p>
                  </div>
                  <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
                    <h3 className="text-xl font-semibold text-gray-400 mb-4">Integration Management</h3>
                    <p className="text-gray-400">Configure third-party integrations and webhooks</p>
                  </div>
                </div>
              </div>
            </div>
          </Suspense>
        );
      case 'error-test':
        return (
          <Suspense fallback={loadingFallback('Error Test')}>
            <ErrorTest />
          </Suspense>
        );
      default:
        return <EmpireDashboard />;
    }
  };

  return (
    <div>
      <MobileShell>
        {/* Mobile-first responsive navigation */}
        <TopBar className="lg:hidden" />
        
        {/* Desktop navigation (hidden on mobile) */}
        <div className="hidden lg:block">
          <NavigationBar />
        </div>
        
        {/* Module navigation scroller */}
        <div className={`
          lg:hidden sticky top-16 z-30
          bg-bg/80 backdrop-blur-md
          border-b border-quantum-primary/20
        `}>
          <ModuleScroller 
            modules={navigationModules.map(module => ({
              id: module.id,
              label: module.label,
              path: module.path,
              status: 'active' as const
            }))}
            activeId={state.currentModule}
            onNavigate={(path: string, moduleId: string) => navigateToModule(moduleId)}
          />
        </div>
        
        {/* Main content area with responsive padding */}
        <main className={`
          pt-16 lg:pt-32
          min-h-screen
        `}>
          <div className="px-4 sm:px-6 lg:px-8">
            {renderCurrentModule()}
          </div>
        </main>
        
        {/* Toast notifications */}
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </MobileShell>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <NavigationProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </NavigationProvider>
    </ErrorBoundary>
  )
}

export default App
