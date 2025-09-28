import { useEffect } from 'react'
import EmpireDashboard from './components/empire/EmpireDashboard'
import ShopifyDashboard from './components/shopify/ShopifyDashboard'
import NavigationBar from './components/navigation/NavigationBar'
import { ToastContainer } from './components/ui/Toast'
import { ToastProvider, useToastContext } from './contexts/ToastContext'
import { NavigationProvider, useNavigation } from './contexts/NavigationContext'
import { usePerformanceOptimization } from './hooks/usePerformanceOptimization'
import './styles/globals.css'
import { useEmpireStore } from './store/empire-store'

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
    switch (state.currentModule) {
      case 'shopify':
        return <ShopifyDashboard />;
      case 'products':
        return <div className="h-full flex items-center justify-center text-hologram">Products Module - Coming Soon</div>;
      case 'orders':
        return <div className="h-full flex items-center justify-center text-hologram">Orders Module - Coming Soon</div>;
      case 'customers':
        return <div className="h-full flex items-center justify-center text-hologram">Customers Module - Coming Soon</div>;
      case 'dashboard':
        return <div className="h-full flex items-center justify-center text-hologram">Overview Dashboard - Coming Soon</div>;
      case 'analytics':
        return <div className="h-full flex items-center justify-center text-hologram">Analytics Module - Coming Soon</div>;
      case 'monitoring':
        return <div className="h-full flex items-center justify-center text-hologram">System Monitoring - Coming Soon</div>;
      case 'settings':
        return <div className="h-full flex items-center justify-center text-hologram">Settings - Coming Soon</div>;
      default:
        return <EmpireDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <NavigationBar />
      <div className="pt-32"> {/* Account for navigation bar height */}
        {renderCurrentModule()}
      </div>
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
