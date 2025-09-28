import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle, 
  Zap, 
  Target, 
  DollarSign,
  Truck,
  BarChart3,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ArrowUp,
  ArrowDown,
  Activity,
  Users,
  Settings,
  Eye,
  FileText,
  Layers,
  Wifi,
  WifiOff,
  Calendar,
  Lightbulb,
  Star
} from 'lucide-react';
import { useEmpireStore } from '../../store/empire-store';
import InventoryWebSocketClient, { InventorySocketConfig } from '../../services/inventory-socket';

interface InventoryMetrics {
  total_items: number;
  low_stock_items: number;
  out_of_stock_items: number;
  overstocked_items: number;
  total_value: number;
}

interface PerformanceMetrics {
  inventory_turnover: number;
  service_level: number;
  forecast_accuracy: number;
  cost_savings: number;
  stockouts_prevented: number;
  automated_reorders: number;
}

interface DashboardData {
  inventory_summary: InventoryMetrics;
  performance_metrics: PerformanceMetrics;
  demand_forecasts: any;
  optimization_insights: any;
  reorder_alerts: any;
  supplier_performance: any;
}

interface ReorderItem {
  sku: string;
  name: string;
  current_stock: number;
  reorder_point: number;
  recommended_quantity: number;
  priority: 'urgent' | 'high' | 'normal';
  supplier: string;
  cost_impact: number;
}

interface OptimizationRecommendation {
  type: string;
  sku: string;
  potential_savings: number;
  reason: string;
}

export default function InventoryModule() {
  const [activeView, setActiveView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('Never');
  
  // Dashboard data states
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [forecastData, setForecastData] = useState<any>(null);
  const [optimizationData, setOptimizationData] = useState<any>(null);
  const [supplierData, setSupplierData] = useState<any>(null);
  
  // WebSocket connection states
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [alerts, setAlerts] = useState<any[]>([]);
  
  const socketRef = useRef<InventoryWebSocketClient | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventory/dashboard');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setDashboardData(result.data);
        setLastUpdate(new Date().toLocaleTimeString());
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAgentStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/inventory/agent/status');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAgentStatus(result.data);
        }
      }
    } catch (err) {
      console.error('Agent status fetch error:', err);
    }
  }, []);

  const fetchReorderData = useCallback(async () => {
    try {
      const response = await fetch('/api/inventory/reorders');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setReorderData(result.data);
        }
      }
    } catch (err) {
      console.error('Reorder data fetch error:', err);
    }
  }, []);

  const fetchOptimizationData = useCallback(async () => {
    try {
      const response = await fetch('/api/inventory/optimization/recommendations');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setOptimizationData(result.data);
        }
      }
    } catch (err) {
      console.error('Optimization data fetch error:', err);
    }
  }, []);

  const fetchSupplierData = useCallback(async () => {
    try {
      const response = await fetch('/api/inventory/suppliers/performance');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSupplierData(result.data);
        }
      }
    } catch (err) {
      console.error('Supplier data fetch error:', err);
    }
  }, []);

  const executeInventoryCycle = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventory/execute', { method: 'POST' });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Refresh all data after execution
          await fetchDashboardData();
          await fetchAgentStatus();
          alert('Inventory management cycle completed successfully!');
        }
      }
    } catch (err) {
      console.error('Execution error:', err);
      alert('Failed to execute inventory cycle');
    }
  };

  // WebSocket initialization and handlers
  const initializeWebSocket = useCallback(() => {
    if (socketRef.current?.isConnected()) {
      return;
    }

    const socketConfig: InventorySocketConfig = {
      onConnectionStatus: (status) => {
        setConnectionStatus(status.status);
        setIsWebSocketConnected(status.status === 'connected' || status.status === 'reconnected');
        console.log('📡 Inventory WebSocket status:', status);
      },
      
      onDashboardUpdate: (data) => {
        console.log('📊 Dashboard update received via WebSocket:', data);
        setDashboardData(data.data);
        setLastUpdate(new Date().toLocaleTimeString());
      },
      
      onAgentStatus: (status) => {
        console.log('🤖 Agent status update received via WebSocket:', status);
        setAgentStatus(status);
      },
      
      onForecastUpdate: (data) => {
        console.log('🔮 Forecast update received via WebSocket:', data);
        setForecastData(data.data || data);
        if (activeView === 'forecasting') {
          // Auto-switch or highlight update
        }
      },
      
      onOptimizationUpdate: (data) => {
        console.log('⚙️ Optimization update received via WebSocket:', data);
        setOptimizationData(data.data || data);
        if (activeView === 'optimization') {
          // Auto-switch or highlight update
        }
      },
      
      onSupplierUpdate: (data) => {
        console.log('🚛 Supplier update received via WebSocket:', data);
        setSupplierData(data.data || data);
        if (activeView === 'suppliers') {
          // Auto-switch or highlight update
        }
      },
      
      onInventoryAlert: (alert) => {
        console.log('🚨 Inventory alert received:', alert);
        setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
        
        // Show browser notification for critical alerts
        if (alert.severity === 'critical' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification(`Inventory Alert: ${alert.type}`, {
            body: `Product: ${alert.product?.name || 'Unknown'}`,
            icon: '/favicon.ico',
            tag: 'inventory-alert'
          });
        }
      },
      
      onReorderRecommendation: (recommendation) => {
        console.log('💡 Reorder recommendation received:', recommendation);
        // Could show a toast notification or update UI
      },
      
      onError: (error) => {
        console.error('❌ Inventory WebSocket error:', error);
        setError(`WebSocket error: ${error.message || error}`);
      }
    };

    socketRef.current = new InventoryWebSocketClient(socketConfig);
    
    socketRef.current.connect()
      .then(() => {
        console.log('✅ Inventory WebSocket connected successfully');
        
        // Subscribe to all relevant channels
        setTimeout(() => {
          socketRef.current?.subscribeToDashboard();
          socketRef.current?.subscribeToForecasting();
          socketRef.current?.subscribeToOptimization();
          socketRef.current?.subscribeToSuppliers();
          
          // Request initial agent status
          socketRef.current?.requestAgentStatus();
        }, 1000);
      })
      .catch((error) => {
        console.error('❌ Failed to connect Inventory WebSocket:', error);
        setError(`Failed to connect to real-time updates: ${error.message}`);
      });
  }, [activeView]);

  // WebSocket action methods
  const executeInventoryCycleViaWebSocket = useCallback(() => {
    if (!socketRef.current?.isConnected()) {
      console.warn('WebSocket not connected, falling back to HTTP');
      executeInventoryCycle();
      return;
    }
    
    socketRef.current.executeInventoryCycle();
  }, []);

  const generateForecastViaWebSocket = useCallback((options = {}) => {
    if (!socketRef.current?.isConnected()) {
      console.warn('WebSocket not connected, falling back to HTTP');
      fetchForecastData();
      return;
    }
    
    socketRef.current.generateForecast(options);
  }, []);

  const runOptimizationViaWebSocket = useCallback(() => {
    if (!socketRef.current?.isConnected()) {
      console.warn('WebSocket not connected, falling back to HTTP');
      fetchOptimizationData();
      return;
    }
    
    socketRef.current.runOptimization();
  }, []);

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    initializeWebSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [initializeWebSocket]);

  // Handle view changes - subscribe to relevant channels
  useEffect(() => {
    if (!socketRef.current?.isConnected()) return;
    
    switch (activeView) {
      case 'forecasting':
        if (!forecastData) {
          generateForecastViaWebSocket();
        }
        break;
      case 'optimization':
        if (!optimizationData) {
          runOptimizationViaWebSocket();
        }
        break;
      case 'suppliers':
        if (!supplierData) {
          fetchSupplierData();
        }
        break;
    }
  }, [activeView, forecastData, optimizationData, supplierData]); finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchAgentStatus();
    fetchReorderData();
    fetchOptimizationData();
    fetchSupplierData();
  }, [fetchDashboardData, fetchAgentStatus, fetchReorderData, fetchOptimizationData, fetchSupplierData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchAgentStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchDashboardData, fetchAgentStatus]);

  const renderMetricCard = (
    title: string, 
    value: number | string, 
    icon: React.ReactNode, 
    trend?: number,
    format?: 'number' | 'currency' | 'percentage'
  ) => {
    return (
      <div className="bg-[var(--color-surface)] border border-gray-700 rounded-lg p-4 hover:border-[var(--color-accent-cyan)] transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[var(--color-text-dim)] text-sm font-medium">
            {title}
          </div>
          <div className="text-[var(--color-accent-cyan)]">
            {icon}
          </div>
        </div>
        
        <div className="flex items-end justify-between">
          <div className="text-2xl font-bold text-[var(--color-text-primary)]">
            {formatValue(value)}
          </div>
          
          {trend !== undefined && (
            <div className={`flex items-center text-sm ${
              trend > 0 ? 'text-[var(--color-accent-green)]' : 
              trend < 0 ? 'text-red-400' : 'text-[var(--color-text-dim)]'
            }`}>
              {trend > 0 ? <ArrowUp size={16} /> : trend < 0 ? <ArrowDown size={16} /> : null}
              <span className="ml-1">{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>
    );
  };
      let empireData = null;
      
      if (empireResponse.ok) {
        empireData = await empireResponse.json();
      }

      // Process inventory data into UI format
      const processedInventory: InventoryItem[] = productsData.map((product: any) => {
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            Inventory Intelligence Dashboard
          </h2>
          <p className="text-[var(--color-text-dim)]">
            AI-powered inventory management with ML forecasting and optimization
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* WebSocket Connection Status */}
          <div className="flex items-center space-x-2 text-sm">
            {isWebSocketConnected ? (
              <>
                <Wifi size={16} className="text-[var(--color-accent-green)]" />
                <span className="text-[var(--color-accent-green)]">Live</span>
              </>
            ) : (
              <>
                <WifiOff size={16} className="text-red-400" />
                <span className="text-red-400">Offline</span>
              </>
            )}
          </div>
          
          <div className="text-sm text-[var(--color-text-dim)]">
            Last updated: {lastUpdate}
          </div>
          
          <button
            onClick={isWebSocketConnected ? () => socketRef.current?.subscribeToDashboard() : fetchDashboardData}
            disabled={loading}
            className="px-4 py-2 bg-[var(--color-accent-cyan)] text-black rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span>{isWebSocketConnected ? 'Sync' : 'Refresh'}</span>
          </button>
          
          <button
            onClick={executeInventoryCycleViaWebSocket}
            disabled={loading}
            className="px-4 py-2 bg-[var(--color-accent-magenta)] text-white rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            <Zap size={16} />
            <span>Execute Cycle</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500 bg-opacity-10 border border-red-500 rounded-lg p-4 text-red-400">
          <div className="flex items-center space-x-2">
            <XCircle size={20} />
            <span>Error: {error}</span>
          </div>
        </div>
      )}

      {dashboardData && (
        <>
          {/* Inventory Summary Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {renderMetricCard(
              'Total Items', 
              dashboardData.inventory_summary.total_items, 
              <Package size={20} />
            )}
            {renderMetricCard(
              'Low Stock Alert', 
              dashboardData.inventory_summary.low_stock_items, 
              <AlertTriangle size={20} />,
              -5.2
            )}
            {renderMetricCard(
              'Out of Stock', 
              dashboardData.inventory_summary.out_of_stock_items, 
              <XCircle size={20} />
            )}
            {renderMetricCard(
              'Overstocked', 
              dashboardData.inventory_summary.overstocked_items, 
              <TrendingUp size={20} />
            )}
            {renderMetricCard(
              'Total Value', 
              dashboardData.inventory_summary.total_value, 
              <DollarSign size={20} />,
              8.3,
              'currency'
            )}
          </div>

          {/* Performance KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {renderMetricCard(
              'Inventory Turnover', 
              dashboardData.performance_metrics.inventory_turnover, 
              <Activity size={20} />,
              12.4
            )}
            {renderMetricCard(
              'Service Level', 
              dashboardData.performance_metrics.service_level, 
              <Target size={20} />,
              2.1,
              'percentage'
            )}
            {renderMetricCard(
              'Forecast Accuracy', 
              dashboardData.performance_metrics.forecast_accuracy, 
              <BarChart3 size={20} />,
              5.7,
              'percentage'
            )}
            {renderMetricCard(
              'Cost Savings', 
              dashboardData.performance_metrics.cost_savings, 
              <DollarSign size={20} />,
              15.2,
              'currency'
            )}
            {renderMetricCard(
              'Stockouts Prevented', 
              dashboardData.performance_metrics.stockouts_prevented, 
              <CheckCircle size={20} />,
              25.8
            )}
            {renderMetricCard(
              'Auto Reorders', 
              dashboardData.performance_metrics.automated_reorders, 
              <Truck size={20} />
            )}
          </div>

          {/* Agent Status */}
          {agentStatus && (
            <div className="bg-[var(--color-surface)] border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center">
                <Activity size={20} className="mr-2 text-[var(--color-accent-cyan)]" />
                Agent Status & Health
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-[var(--color-text-dim)]">Status</div>
                  <div className={`flex items-center space-x-2 ${
                    agentStatus.status === 'healthy' ? 'text-[var(--color-accent-green)]' : 'text-red-400'
                  }`}>
                    {agentStatus.status === 'healthy' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                    <span className="font-medium capitalize">{agentStatus.status}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-[var(--color-text-dim)]">Connections</div>
                  <div className="text-[var(--color-text-primary)]">
                    DB: {agentStatus.connections?.database ? '✓' : '✗'} | 
                    Redis: {agentStatus.connections?.redis ? '✓' : '✗'}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-[var(--color-text-dim)]">Suppliers</div>
                  <div className="text-[var(--color-text-primary)]">
                    {agentStatus.connections?.suppliers || 0} Active
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-[var(--color-text-dim)]">ML Models</div>
                  <div className="text-[var(--color-text-primary)]">
                    {agentStatus.connections?.ml_models || 0} Loaded
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
        const renderForecastingView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            AI Demand Forecasting
          </h2>
          <p className="text-[var(--color-text-dim)]">
            Advanced ML models predicting inventory needs
          </p>
        </div>
        
        <button
          onClick={generateForecastViaWebSocket}
          disabled={loading}
          className="px-4 py-2 bg-[var(--color-accent-magenta)] text-white rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center space-x-2"
        >
          <BarChart3 size={16} />
          <span>Generate Forecast</span>
        </button>
      </div>

      {forecastData && (
        <div className="space-y-6">
          {/* Forecast Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {renderMetricCard(
              'Forecast Accuracy',
              `${forecastData.accuracy}%`,
              <Target size={20} />,
              3.2
            )}
            {renderMetricCard(
              'Model Confidence',
              `${forecastData.confidence}%`,
              <CheckCircle size={20} />
            )}
            {renderMetricCard(
              'Days Ahead',
              forecastData.days_ahead,
              <Calendar size={20} />
            )}
          </div>

          {/* Top Predictions */}
          <div className="bg-[var(--color-surface)] border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
              Top Demand Predictions
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-700">
                  <tr>
                    <th className="text-left py-2 text-sm font-medium text-[var(--color-text-dim)]">Product</th>
                    <th className="text-left py-2 text-sm font-medium text-[var(--color-text-dim)]">Current Stock</th>
                    <th className="text-left py-2 text-sm font-medium text-[var(--color-text-dim)]">Predicted Demand</th>
                    <th className="text-left py-2 text-sm font-medium text-[var(--color-text-dim)]">Confidence</th>
                    <th className="text-left py-2 text-sm font-medium text-[var(--color-text-dim)]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {forecastData.predictions?.slice(0, 5).map((pred: any, index: number) => (
                    <tr key={index} className="hover:bg-[var(--color-bg-alt)]">
                      <td className="py-3 text-[var(--color-text-primary)]">{pred.product_name}</td>
                      <td className="py-3 text-[var(--color-text-primary)]">{pred.current_stock}</td>
                      <td className="py-3 text-[var(--color-text-primary)]">{pred.predicted_demand}</td>
                      <td className="py-3">
                        <div className={`text-sm ${pred.confidence > 80 ? 'text-[var(--color-accent-green)]' : 
                          pred.confidence > 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {pred.confidence}%
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          pred.action === 'reorder' ? 'bg-red-500 bg-opacity-20 text-red-400' :
                          pred.action === 'watch' ? 'bg-yellow-500 bg-opacity-20 text-yellow-400' :
                          'bg-green-500 bg-opacity-20 text-green-400'
                        }`}>
                          {pred.action}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderOptimizationView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            Inventory Optimization
          </h2>
          <p className="text-[var(--color-text-dim)]">
            AI-powered recommendations for optimal inventory levels
          </p>
        </div>
        
        <button
          onClick={runOptimizationViaWebSocket}
          disabled={loading}
          className="px-4 py-2 bg-[var(--color-accent-green)] text-black rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center space-x-2"
        >
          <Settings size={16} />
          <span>Run Optimization</span>
        </button>
      </div>

      {optimizationData && (
        <div className="space-y-6">
          {/* Optimization Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {renderMetricCard(
              'Potential Savings',
              optimizationData.potential_savings,
              <DollarSign size={20} />,
              0,
              'currency'
            )}
            {renderMetricCard(
              'Items to Optimize',
              optimizationData.items_to_optimize,
              <Package size={20} />
            )}
            {renderMetricCard(
              'Carrying Cost Reduction',
              optimizationData.carrying_cost_reduction,
              <TrendingDown size={20} />,
              0,
              'currency'
            )}
            {renderMetricCard(
              'Service Level Impact',
              `${optimizationData.service_level_impact}%`,
              <Target size={20} />,
              optimizationData.service_level_impact > 0 ? optimizationData.service_level_impact : undefined
            )}
          </div>

          {/* Recommendations */}
          <div className="bg-[var(--color-surface)] border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4 flex items-center">
              <Lightbulb size={20} className="mr-2 text-[var(--color-accent-cyan)]" />
              Optimization Recommendations
            </h3>
            <div className="space-y-4">
              {optimizationData.recommendations?.map((rec: any, index: number) => (
                <div key={index} className="border border-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-[var(--color-text-primary)] mb-2">{rec.product_name}</h4>
                      <p className="text-sm text-[var(--color-text-dim)] mb-3">{rec.recommendation}</p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-[var(--color-text-dim)]">Current EOQ:</span>
                          <span className="ml-2 text-[var(--color-text-primary)]">{rec.current_eoq}</span>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-dim)]">Optimal EOQ:</span>
                          <span className="ml-2 text-[var(--color-text-primary)]">{rec.optimal_eoq}</span>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-dim)]">Safety Stock:</span>
                          <span className="ml-2 text-[var(--color-text-primary)]">{rec.safety_stock}</span>
                        </div>
                        <div>
                          <span className="text-[var(--color-text-dim)]">Reorder Point:</span>
                          <span className="ml-2 text-[var(--color-text-primary)]">{rec.reorder_point}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-4">
                      <span className={`px-3 py-1 text-sm rounded-full ${
                        rec.priority === 'high' ? 'bg-red-500 bg-opacity-20 text-red-400' :
                        rec.priority === 'medium' ? 'bg-yellow-500 bg-opacity-20 text-yellow-400' :
                        'bg-green-500 bg-opacity-20 text-green-400'
                      }`}>
                        {rec.priority} priority
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSupplierView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
            Supplier Intelligence
          </h2>
          <p className="text-[var(--color-text-dim)]">
            AI-powered supplier performance analytics and management
          </p>
        </div>
        
        <button
          onClick={fetchSupplierData}
          disabled={loading}
          className="px-4 py-2 bg-[var(--color-accent-cyan)] text-black rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 flex items-center space-x-2"
        >
          <Truck size={16} />
          <span>Refresh Data</span>
        </button>
      </div>

      {supplierData && (
        <div className="space-y-6">
          {/* Supplier Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {renderMetricCard(
              'Active Suppliers',
              supplierData.total_suppliers,
              <Users size={20} />
            )}
            {renderMetricCard(
              'Avg Delivery Time',
              `${supplierData.avg_delivery_time} days`,
              <Clock size={20} />
            )}
            {renderMetricCard(
              'Avg Reliability',
              `${supplierData.avg_reliability}%`,
              <CheckCircle size={20} />,
              supplierData.reliability_trend
            )}
            {renderMetricCard(
              'Quality Score',
              supplierData.avg_quality_score,
              <Star size={20} />,
              supplierData.quality_trend
            )}
          </div>

          {/* Supplier Performance Table */}
          <div className="bg-[var(--color-surface)] border border-gray-700 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Supplier Performance Dashboard
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[var(--color-bg-alt)] border-b border-gray-700">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-dim)] uppercase">Supplier</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-dim)] uppercase">Performance Score</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-dim)] uppercase">Delivery Time</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-dim)] uppercase">Reliability</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-dim)] uppercase">Quality</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-dim)] uppercase">Total Orders</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-[var(--color-text-dim)] uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {supplierData.suppliers?.map((supplier: any, index: number) => (
                    <tr key={index} className="hover:bg-[var(--color-bg-alt)] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-[var(--color-accent-cyan)] bg-opacity-20 rounded-full flex items-center justify-center">
                            <Truck size={16} className="text-[var(--color-accent-cyan)]" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-[var(--color-text-primary)]">{supplier.name}</div>
                            <div className="text-xs text-[var(--color-text-dim)]">{supplier.type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-12 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 rounded-full transition-all"
                              style={{ width: `${supplier.performance_score}%` }}
                            />
                          </div>
                          <span className="text-sm text-[var(--color-text-primary)]">{supplier.performance_score}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">{supplier.delivery_time} days</td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">{supplier.reliability}%</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1">
                          <Star size={14} className="text-yellow-400" />
                          <span className="text-sm text-[var(--color-text-primary)]">{supplier.quality_score}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--color-text-primary)]">{supplier.total_orders}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          supplier.status === 'excellent' ? 'bg-green-500 bg-opacity-20 text-green-400' :
                          supplier.status === 'good' ? 'bg-blue-500 bg-opacity-20 text-blue-400' :
                          supplier.status === 'warning' ? 'bg-yellow-500 bg-opacity-20 text-yellow-400' :
                          'bg-red-500 bg-opacity-20 text-red-400'
                        }`}>
                          {supplier.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (loading && !dashboardData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-[var(--color-accent-cyan)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[var(--color-text-dim)]">Loading inventory intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Navigation Tabs */}
      <div className="flex space-x-1 mb-6 bg-[var(--color-bg-alt)] p-1 rounded-lg overflow-x-auto">
        <button
          onClick={() => setActiveView('dashboard')}
          className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeView === 'dashboard'
              ? 'bg-[var(--color-accent-cyan)] text-black'
              : 'text-[var(--color-text-dim)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <BarChart3 size={16} />
            <span>Dashboard</span>
          </div>
        </button>
        
        <button
          onClick={() => setActiveView('forecasting')}
          className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeView === 'forecasting'
              ? 'bg-[var(--color-accent-cyan)] text-black'
              : 'text-[var(--color-text-dim)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <TrendingUp size={16} />
            <span>Forecasting</span>
          </div>
        </button>

        <button
          onClick={() => setActiveView('optimization')}
          className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeView === 'optimization'
              ? 'bg-[var(--color-accent-cyan)] text-black'
              : 'text-[var(--color-text-dim)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Settings size={16} />
            <span>Optimization</span>
          </div>
        </button>

        <button
          onClick={() => setActiveView('suppliers')}
          className={`flex-shrink-0 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeView === 'suppliers'
              ? 'bg-[var(--color-accent-cyan)] text-black'
              : 'text-[var(--color-text-dim)] hover:text-[var(--color-text-primary)]'
          }`}
        >
          <div className="flex items-center justify-center space-x-2">
            <Truck size={16} />
            <span>Suppliers</span>
          </div>
        </button>
      </div>

      {/* Content */}
      {activeView === 'dashboard' && renderDashboard()}
      {activeView === 'forecasting' && renderForecastingView()}
      {activeView === 'optimization' && renderOptimizationView()}
      {activeView === 'suppliers' && renderSupplierView()}
    </div>
  );
};

export default InventoryModule;


