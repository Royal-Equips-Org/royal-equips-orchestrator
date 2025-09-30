// DELETED - Consolidated into main App.tsx
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { EnterpriseNavigation } from '../components/navigation/EnterpriseNavigation';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { 
  Activity,
  AlertTriangle,
  CheckCircle,
  Wifi,
  WifiOff,
  Bell,
  Settings,
  RefreshCw,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { apiClient } from '../services/api-client';

// Lazy load enterprise modules for optimal performance
const SettingsModule = lazy(() => import('../modules/settings/SettingsModule'));
const AuditComplianceModule = lazy(() => import('../modules/audit/AuditComplianceModule'));
const EnhancedAnalyticsModule = lazy(() => import('../modules/analytics/EnhancedAnalyticsModule'));
const AIRAIntelligenceModule = lazy(() => import('../modules/aira/AIRAIntelligenceModule'));
const AgentsModule = lazy(() => import('../modules/agents/AgentsModule'));
const RevenueModule = lazy(() => import('../modules/revenue/RevenueModule'));
const InventoryModule = lazy(() => import('../modules/inventory/InventoryModule'));
const MarketingModule = lazy(() => import('../modules/marketing/MarketingModule'));

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical';
  uptime: number;
  services: ServiceHealth[];
  lastCheck: string;
  alerts: Alert[];
}

interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime: number;
  uptime: number;
  endpoint: string;
}

interface Alert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  module?: string;
  acknowledged: boolean;
}

interface AppState {
  currentModule: string;
  isOnline: boolean;
  systemHealth: SystemHealth | null;
  notifications: Alert[];
  isNavCollapsed: boolean;
  isFullscreen: boolean;
}

export default function EnterpriseApp() {
  const [appState, setAppState] = useState<AppState>({
    currentModule: 'enhanced-analytics',
    isOnline: navigator.onLine,
    systemHealth: null,
    notifications: [],
    isNavCollapsed: false,
    isFullscreen: false
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeApp();
    setupHealthMonitoring();
    setupNetworkMonitoring();

    // Cleanup
    return () => {
      // Clean up intervals and listeners
    };
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchSystemHealth(),
        fetchNotifications(),
        checkAuthentication()
      ]);
    } catch (err) {
      setError('Failed to initialize enterprise application');
      console.error('App initialization error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const response = await apiClient.get('/api/system/health/comprehensive');
      setAppState(prev => ({
        ...prev,
        systemHealth: response.data
      }));
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await apiClient.get('/api/notifications/active');
      setAppState(prev => ({
        ...prev,
        notifications: response.data.alerts || []
      }));
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const checkAuthentication = async () => {
    try {
      await apiClient.get('/api/auth/validate');
    } catch (error) {
      // Handle authentication failure
      console.error('Authentication validation failed:', error);
    }
  };

  const setupHealthMonitoring = () => {
    const interval = setInterval(fetchSystemHealth, 30000); // 30s intervals
    return () => clearInterval(interval);
  };

  const setupNetworkMonitoring = () => {
    const handleOnline = () => setAppState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setAppState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  };

  const handleModuleSelect = (moduleId: string) => {
    setAppState(prev => ({
      ...prev,
      currentModule: moduleId
    }));
  };

  const handleNavigate = (path: string) => {
    // Handle navigation - could integrate with React Router
    console.log('Navigating to:', path);
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await apiClient.post(`/api/notifications/${alertId}/acknowledge`);
      setAppState(prev => ({
        ...prev,
        notifications: prev.notifications.map(alert =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        )
      }));
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setAppState(prev => ({ ...prev, isFullscreen: true }));
    } else {
      document.exitFullscreen();
      setAppState(prev => ({ ...prev, isFullscreen: false }));
    }
  };

  const renderModule = () => {
    const moduleProps = {
      onNavigate: handleNavigate,
      systemHealth: appState.systemHealth
    };

    switch (appState.currentModule) {
      case 'enhanced-analytics':
        return <EnhancedAnalyticsModule {...moduleProps} />;
      case 'enterprise-settings':
        return <SettingsModule {...moduleProps} />;
      case 'audit-compliance':
        return <AuditComplianceModule {...moduleProps} />;
      case 'aira-intelligence':
        return <AIRAIntelligenceModule {...moduleProps} />;
      case 'agents':
        return <AgentsModule {...moduleProps} />;
      case 'revenue':
        return <RevenueModule {...moduleProps} />;
      case 'inventory':
        return <InventoryModule {...moduleProps} />;
      case 'marketing':
        return <MarketingModule {...moduleProps} />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-400" />
              <h2 className="text-xl font-semibold mb-2">Module Not Found</h2>
              <p className="text-gray-400">The requested module could not be loaded.</p>
            </div>
          </div>
        );
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getCriticalAlerts = () => {
    return appState.notifications.filter(alert => 
      alert.level === 'critical' && !alert.acknowledged
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Initializing Enterprise Suite</h2>
          <p className="text-gray-400">Loading system components...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Card className="p-8 max-w-md">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-red-400">System Error</h2>
            <p className="text-gray-400 mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()}
              className="bg-red-600 hover:bg-red-700"
            >
              Reload Application
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Navigation Sidebar */}
      <EnterpriseNavigation
        currentModule={appState.currentModule}
        onModuleSelect={handleModuleSelect}
        onNavigate={handleNavigate}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Status Bar */}
        <div className="bg-gray-900 border-b border-gray-800 px-6 py-3">
          <div className="flex items-center justify-between">
            {/* System Status */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                {appState.isOnline ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-400" />
                )}
                <span className="text-sm">
                  {appState.isOnline ? 'Connected' : 'Offline'}
                </span>
              </div>

              {appState.systemHealth && (
                <div className="flex items-center space-x-2">
                  {appState.systemHealth.status === 'healthy' ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  )}
                  <span className={`text-sm ${getHealthStatusColor(appState.systemHealth.status)}`}>
                    System {appState.systemHealth.status}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {appState.systemHealth.uptime.toFixed(2)}% uptime
                  </Badge>
                </div>
              )}

              <div className="text-sm text-gray-400">
                Royal Equips Enterprise Suite v2.1.0
              </div>
            </div>

            {/* Actions & Notifications */}
            <div className="flex items-center space-x-3">
              {getCriticalAlerts().length > 0 && (
                <div className="flex items-center space-x-2">
                  <Bell className="w-4 h-4 text-red-400 animate-pulse" />
                  <Badge variant="destructive" className="text-xs">
                    {getCriticalAlerts().length} critical
                  </Badge>
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullscreen}
                className="p-2"
              >
                {appState.isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleModuleSelect('enterprise-settings')}
                className="p-2"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Critical Alerts Banner */}
        {getCriticalAlerts().length > 0 && (
          <div className="bg-red-900/50 border-b border-red-800 px-6 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <div>
                  <span className="font-semibold text-red-400">
                    {getCriticalAlerts().length} Critical Alert{getCriticalAlerts().length > 1 ? 's' : ''}
                  </span>
                  <p className="text-sm text-red-300">
                    {getCriticalAlerts()[0].message}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => acknowledgeAlert(getCriticalAlerts()[0].id)}
                className="border-red-400 text-red-400 hover:bg-red-900/30"
              >
                Acknowledge
              </Button>
            </div>
          </div>
        )}

        {/* Module Content */}
        <div className="flex-1 overflow-auto">
          <Suspense 
            fallback={
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-2" />
                  <p className="text-gray-400">Loading module...</p>
                </div>
              </div>
            }
          >
            {renderModule()}
          </Suspense>
        </div>
      </div>
    </div>
  );
}