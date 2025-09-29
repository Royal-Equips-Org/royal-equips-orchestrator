import React, { useEffect, Suspense, lazy, useState } from 'react'
import EmpireDashboard from './components/empire/EmpireDashboard'
import ShopifyDashboard from './components/shopify/ShopifyDashboard'  
import NavigationBar from './components/navigation/NavigationBar'
import { ToastContainer } from './components/ui/Toast'
import { ToastProvider, useToastContext } from './contexts/ToastContext'
import { NavigationProvider, useNavigation } from './contexts/NavigationContext'
import { usePerformanceOptimization } from './hooks/usePerformanceOptimization'
import MobileShell from './components/layout/MobileShell'
import TopBar from './components/layout/TopBar'
import ModuleScroller from './components/layout/ModuleScroller'
import ExactCommandCenter from './components/holographic/ExactCommandCenter'
import AICore from './components/ai-core/AICore'
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
  const { state, navigate } = useNavigation();
  const { optimizePerformance, metrics, recommendations } = usePerformanceOptimization();
  
  // AI Core state - make it the main interface
  const [showAICore, setShowAICore] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    // Initialize empire systems and load all data
    console.log('Royal Equips Empire Command Center - AI Core Initialized');
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

  // Handle module access from AI Core
  const handleModuleAccess = (moduleId: string) => {
    navigate(moduleId);
    setShowAICore(false); // Show traditional interface for specific modules
  };

  // Handle return to AI Core
  const handleReturnToAICore = () => {
    setShowAICore(true);
    navigate('command'); // Set to command module
  };

  // Keyboard shortcuts for AI Core
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'F11':
          e.preventDefault();
          setIsFullscreen(!isFullscreen);
          break;
        case 'Escape':
          if (isFullscreen) {
            setIsFullscreen(false);
          } else if (!showAICore) {
            handleReturnToAICore();
          }
          break;
        case 'h':
          if (e.ctrlKey) {
            e.preventDefault();
            setShowAICore(!showAICore);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFullscreen, showAICore]);

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
      case 'holographic':
      case 'holo':
        // Holographic view as an optional module instead of default
        return (
          <div className="w-full h-full">
            <ExactCommandCenter />
          </div>
        );
      case 'ai-core':
        // AI Core integrated view
        return (
          <div className="w-full h-full">
            <AICore onExit={() => handleReturnToAICore()} isFullscreen={false} />
          </div>
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

  // Main render - AI Core as primary interface
  if (showAICore) {
    return (
      <div className="w-full h-screen bg-black overflow-hidden">
        {/* AI Core as main interface exactly like the reference image */}
        <AICore 
          onExit={() => setShowAICore(false)} 
          isFullscreen={isFullscreen}
        />
        
        {/* Floating access to traditional modules when needed */}
        {!isFullscreen && (
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            background: 'rgba(0, 30, 60, 0.3)',
            border: '1px solid rgba(0, 170, 255, 0.5)',
            borderRadius: '8px',
            padding: '10px',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            gap: '10px',
            zIndex: 100
          }}>
            <button 
              onClick={() => handleModuleAccess('dashboard')}
              style={{
                background: 'rgba(0, 170, 255, 0.2)',
                border: '1px solid #00aaff',
                borderRadius: '4px',
                color: '#00ddff',
                padding: '5px 10px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Dashboard
            </button>
            <button 
              onClick={() => handleModuleAccess('aira')}
              style={{
                background: 'rgba(0, 170, 255, 0.2)',
                border: '1px solid #00aaff',
                borderRadius: '4px',
                color: '#00ddff',
                padding: '5px 10px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              AIRA
            </button>
            <button 
              onClick={() => handleModuleAccess('shopify')}
              style={{
                background: 'rgba(0, 170, 255, 0.2)',
                border: '1px solid #00aaff',
                borderRadius: '4px',
                color: '#00ddff',
                padding: '5px 10px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Shopify
            </button>
          </div>
        )}
        
        {/* Toast notifications positioned absolutely */}
        <div className="absolute top-20 right-4 z-50">
          <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
      </div>
    );
  }

  // Traditional interface when accessing specific modules
  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white overflow-hidden">
      {/* Mobile responsive shell */}
      <MobileShell>
        {/* Top navigation bar */}
        <TopBar />
        
        {/* Main navigation */}
        <NavigationBar />
        
        {/* Module scroller for mobile */}
        <ModuleScroller />
        
        {/* Return to AI Core button */}
        <button
          onClick={handleReturnToAICore}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(0, 170, 255, 0.3)',
            border: '2px solid #00aaff',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            color: '#00ffff',
            fontSize: '24px',
            cursor: 'pointer',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Return to AI Core (Ctrl+H)"
        >
          🤖
        </button>
        
        {/* Main content area */}
        <main className="flex-1 overflow-hidden">
          {renderCurrentModule()}
        </main>
        
        {/* Toast notifications positioned absolutely */}
        <div className="absolute top-20 right-4 z-50">
          <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
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
