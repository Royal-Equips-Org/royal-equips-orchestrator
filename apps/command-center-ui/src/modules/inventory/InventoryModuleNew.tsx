import React, { useState, useEffect, useCallback } from 'react';
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
  Activity
} from 'lucide-react';

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

const InventoryModule: React.FC = () => {
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState('dashboard');

  // Fetch inventory data
  const fetchInventoryData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/inventory/dashboard');
      
      if (!response.ok) {
        throw new Error('Failed to fetch inventory data');
      }
      
      const data = await response.json();
      setInventoryData(data.data || data);
      setError(null);
    } catch (err) {
      console.error('Inventory data fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventoryData();
    
    // Set up refresh interval
    const interval = setInterval(fetchInventoryData, 30000);
    return () => clearInterval(interval);
  }, [fetchInventoryData]);

  const formatValue = (value: number, type?: string): string => {
    if (type === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(value);
    }
    
    if (type === 'percentage') {
      return `${value.toFixed(1)}%`;
    }
    
    return value.toLocaleString();
  };

  // Metric Card Component
  const MetricCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    trend?: number;
    type?: string;
  }> = ({ title, value, icon, trend, type }) => (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium text-gray-400">
          {title}
        </div>
        <div className="text-cyan-400">
          {icon}
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <div className="text-2xl font-bold text-white">
          {formatValue(value, type)}
        </div>
        
        {trend !== undefined && (
          <div className={`flex items-center text-sm ${
            trend > 0 ? 'text-green-400' : 
            trend < 0 ? 'text-red-400' : 'text-gray-400'
          }`}>
            {trend > 0 ? <ArrowUp size={16} /> : trend < 0 ? <ArrowDown size={16} /> : null}
            <span className="ml-1">{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-3">
          <RefreshCw className="h-6 w-6 animate-spin text-cyan-400" />
          <span className="text-lg">Loading inventory data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-400" />
          <h3 className="text-lg font-semibold text-red-400">Inventory Module Error</h3>
        </div>
        <p className="text-red-300 mb-4">{error}</p>
        <button
          onClick={fetchInventoryData}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!inventoryData) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-400">No inventory data available</p>
      </div>
    );
  }

  const inventory_metrics = inventoryData.inventory_metrics || {};
  const performance_metrics = inventoryData.performance_metrics || {};
  const reorder_recommendations = inventoryData.reorder_recommendations || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-orange-500/20 rounded-lg">
            <Package className="h-6 w-6 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Inventory Intelligence</h1>
            <p className="text-gray-400">AI-powered inventory management & forecasting</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={activeView}
            onChange={(e) => setActiveView(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="dashboard">Dashboard</option>
            <option value="forecasting">Forecasting</option>
            <option value="optimization">Optimization</option>
            <option value="suppliers">Suppliers</option>
          </select>

          <button
            onClick={fetchInventoryData}
            className="flex items-center space-x-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Items"
          value={inventory_metrics.total_items || 0}
          icon={<Package className="h-6 w-6" />}
          trend={5.2}
        />
        
        <MetricCard
          title="Total Value"
          value={inventory_metrics.total_value || 0}
          icon={<DollarSign className="h-6 w-6" />}
          type="currency"
          trend={12.8}
        />
        
        <MetricCard
          title="Low Stock Items"
          value={inventory_metrics.low_stock_items || 0}
          icon={<AlertTriangle className="h-6 w-6" />}
          trend={-8.3}
        />
        
        <MetricCard
          title="Forecast Accuracy"
          value={performance_metrics.forecast_accuracy || 0}
          icon={<Target className="h-6 w-6" />}
          type="percentage"
          trend={3.1}
        />
      </div>

      {/* Main Content */}
      {activeView === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Inventory Status */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-cyan-400" />
              Inventory Status
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-900/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>In Stock</span>
                </div>
                <span className="font-bold text-green-400">
                  {(inventory_metrics.total_items || 0) - (inventory_metrics.out_of_stock_items || 0)}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-yellow-900/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-400" />
                  <span>Low Stock</span>
                </div>
                <span className="font-bold text-yellow-400">
                  {inventory_metrics.low_stock_items || 0}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-red-900/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <XCircle className="h-5 w-5 text-red-400" />
                  <span>Out of Stock</span>
                </div>
                <span className="font-bold text-red-400">
                  {inventory_metrics.out_of_stock_items || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-cyan-400" />
              Performance Metrics
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Inventory Turnover</span>
                <span className="font-medium">
                  {(performance_metrics.inventory_turnover || 0).toFixed(1)}x
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Service Level</span>
                <span className="font-medium">
                  {formatValue(performance_metrics.service_level || 0, 'percentage')}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Cost Savings</span>
                <span className="font-medium text-green-400">
                  {formatValue(performance_metrics.cost_savings || 0, 'currency')}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Automated Reorders</span>
                <span className="font-medium">
                  {performance_metrics.automated_reorders || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reorder Recommendations */}
      {reorder_recommendations && reorder_recommendations.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Truck className="h-5 w-5 mr-2 text-cyan-400" />
            Reorder Recommendations
          </h3>
          
          <div className="space-y-3">
            {reorder_recommendations.slice(0, 5).map((item: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                <div>
                  <p className="font-medium">{item.product_name || `Product ${index + 1}`}</p>
                  <p className="text-sm text-gray-400">
                    Current: {item.current_stock || 0} | Recommended: {item.recommended_quantity || 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-orange-400">
                    Priority: {item.priority || 'Medium'}
                  </p>
                  <p className="text-sm text-gray-400">
                    Est. Cost: {formatValue(item.estimated_cost || 0, 'currency')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>AI-Powered Forecasting</span>
            </div>
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Automated Optimization</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Real-time Updates</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
            <div className="h-2 w-2 bg-green-500 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryModule;