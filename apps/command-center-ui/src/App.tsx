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

import './styles/globals.css'
import { useEmpireStore } from './store/empire-store'

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

function AppContent() {
  const { isConnected, refreshAll } = useEmpireStore();
  const { toasts, removeToast } = useToastContext();
  const { state } = useNavigation();
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
        return <ShopifyDashboard />;
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
        return <div className="h-full flex items-center justify-center text-hologram">Products Module - Coming Soon</div>;
      case 'orders':
        return <div className="h-full flex items-center justify-center text-hologram">Orders Module - Coming Soon</div>;
      case 'customers':
        return <div className="h-full flex items-center justify-center text-hologram">Customers Module - Coming Soon</div>;
      case 'monitoring':
        return <div className="h-full flex items-center justify-center text-hologram">System Monitoring - Coming Soon</div>;
      case 'settings':
        return <div className="h-full flex items-center justify-center text-hologram">Settings - Coming Soon</div>;
      default:
        return <EmpireDashboard />;
    }
  };

  return (

      <MobileShell>
        {/* Mobile-first responsive navigation */}
        <TopBar className="lg:hidden" />
        
        {/* Desktop navigation (hidden on mobile) */}
        <div className="hidden lg:block">
          <NavigationBar />
        </div>
        
        {/* Module navigation scroller */}
        <div className="
          lg:hidden sticky top-16 z-30
          bg-bg/80 backdrop-blur-md
          border-b border-quantum-primary/20
        ">
          <ModuleScroller />
        </div>
        
        {/* Main content area with responsive padding */}
        <main className="
          pt-16 lg:pt-32
          min-h-screen
        ">
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
    <NavigationProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </NavigationProvider>
  )
}

export default App
