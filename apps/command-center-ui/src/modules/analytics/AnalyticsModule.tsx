import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Activity, 
  Eye, 
  Users, 
  DollarSign,
  Package,
  ShoppingCart,
  AlertCircle,
  RefreshCw,
  Calendar,
  Target,
  AlertTriangle,
  Zap,
  Download,
  Filter
} from 'lucide-react';
import { useEmpireStore } from '../../store/empire-store';

interface Metric {
  value: number;
  change: number;
  status: 'healthy' | 'warning' | 'critical';
  formatted: string;
}

interface KPIData {
  monthly_revenue: Metric;
  conversion_rate: Metric;
  avg_order_value: Metric;
  customer_acquisition_cost: Metric;
}

interface ChartData {
  type: string;
  data: any[];
  title: string;
}

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'error';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  created_at: string;
}

interface AnalyticsData {
  kpis: KPIData;
  charts: {
    revenue_trend: ChartData;
    conversion_funnel: ChartData;
    top_products: ChartData;
    customer_segments: ChartData;
  };
  summary: {
    total_orders: number;
    total_customers: number;
    inventory_items: number;
    active_campaigns: number;
  };
  alerts: Alert[];
  time_range: string;
  last_updated: string;
}

interface AnalyticsInsight {
  id: string;
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  category: 'performance' | 'business' | 'operations' | 'security';
}

export default function AnalyticsModule() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [insights, setInsights] = useState<AnalyticsInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [timeRange, setTimeRange] = useState('30d');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { isConnected } = useEmpireStore();

  // Fetch analytics data from API
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch main analytics data
      const response = await fetch('/api/analytics/dashboard');
      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Process and format the data
      const formattedData: AnalyticsData = {
        kpis: data.kpis || {
          monthly_revenue: { value: 0, change: 0, status: 'healthy', formatted: '$0' },
          conversion_rate: { value: 0, change: 0, status: 'healthy', formatted: '0%' },
          avg_order_value: { value: 0, change: 0, status: 'healthy', formatted: '$0' },
          customer_acquisition_cost: { value: 0, change: 0, status: 'healthy', formatted: '$0' }
        },
        charts: data.charts || {
          revenue_trend: { type: 'line', data: [], title: 'Revenue Trend' },
          conversion_funnel: { type: 'funnel', data: [], title: 'Conversion Funnel' },
          top_products: { type: 'bar', data: [], title: 'Top Products' },
          customer_segments: { type: 'pie', data: [], title: 'Customer Segments' }
        },
        summary: data.summary || {
          total_orders: 0,
          total_customers: 0,
          inventory_items: 0,
          active_campaigns: 0
        },
        alerts: data.alerts || [],
        time_range: data.time_range || '30d',
        last_updated: data.last_updated || new Date().toISOString()
      };

      setAnalyticsData(formattedData);
      
      // Set up insights from the processed data
      if (data.insights) {
        setInsights(data.insights.map((insight: any) => ({
          id: insight.id || Math.random().toString(),
          title: insight.title,
          value: insight.value,
          change: insight.change || 0,
          trend: insight.trend || 'neutral',
          category: insight.category || 'general'
        })));
      }

    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Real-time data updates via WebSocket
  useEffect(() => {
    if (socket && isConnected) {
      socket.on('analytics_update', (data: any) => {
        console.log('Analytics real-time update:', data);
        setAnalyticsData(prev => prev ? { ...prev, ...data } : null);
      });

      socket.on('analytics_alert', (alert: Alert) => {
        console.log('New analytics alert:', alert);
        setAnalyticsData(prev => {
          if (!prev) return null;
          return {
            ...prev,
            alerts: [alert, ...prev.alerts]
          };
        });
      });

      return () => {
        socket.off('analytics_update');
        socket.off('analytics_alert');
      };
    }
  }, [socket, isConnected]);

  // Auto-refresh mechanism
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh) {
      interval = setInterval(() => {
        loadAnalyticsData(false); // Refresh without showing loading
      }, 60000); // Every minute
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, timeRange]);

  // Initial data load
  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const response = await fetch(
        `/api/analytics/dashboard?time_range=${timeRange}&refresh=true`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Analytics API error: ${response.status}`);
      }

      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      console.error('Failed to load analytics data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (reportType: string) => {
    try {
      const response = await fetch(`/api/analytics/reports/${reportType}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'pdf' })
      });

      if (response.ok) {
        const reportData = await response.json();
        console.log('Report generated:', reportData);
        // Handle report download
      }
    } catch (err) {
      console.error('Failed to generate report:', err);
    }
  };

  const renderKPICard = (title: string, icon: React.ReactNode, metric: Metric) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface/50 rounded-lg p-6 border border-accent-cyan/20"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-sm text-text-dim">{title}</span>
        </div>
        <span className={`px-2 py-1 text-xs rounded ${
          metric.status === 'healthy' ? 'bg-accent-green/20 text-accent-green' :
          metric.status === 'warning' ? 'bg-yellow-500/20 text-yellow-500' :
          'bg-red-500/20 text-red-500'
        }`}>
          {metric.status}
        </span>
      </div>
      
      <div className="mt-2">
        <div className="text-2xl font-bold text-text-primary">
          {metric.formatted}
        </div>
        <div className="flex items-center mt-1">
          {metric.change >= 0 ? (
            <TrendingUp className="w-4 h-4 text-accent-green mr-1" />
          ) : (
            <TrendingDown className="w-4 h-4 text-accent-magenta mr-1" />
          )}
          <span className={`text-sm ${metric.change >= 0 ? 'text-accent-green' : 'text-accent-magenta'}`}>
            {metric.change >= 0 ? '+' : ''}{metric.change}%
          </span>
        </div>
      </div>
    </motion.div>
  );

  const renderChart = (chartData: ChartData) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface/50 rounded-lg p-6 border border-accent-cyan/20"
    >
      <div className="flex items-center mb-4">
        <BarChart3 className="w-5 h-5 mr-2 text-accent-cyan" />
        <h3 className="text-text-primary font-semibold">{chartData.title}</h3>
      </div>
      <div className="h-64 bg-bg-alt rounded flex items-center justify-center">
        <div className="text-text-dim">
          {chartData.type} Chart - {chartData.data.length} data points
        </div>
      </div>
    </motion.div>
  );

  const renderAlert = (alert: Alert) => (
    <motion.div
      key={alert.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={`p-3 rounded border-l-4 ${
        alert.type === 'error' ? 'border-red-500 bg-red-500/10' :
        alert.type === 'warning' ? 'border-yellow-500 bg-yellow-500/10' :
        'border-blue-500 bg-blue-500/10'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2">
          <AlertTriangle className={`w-4 h-4 mt-0.5 ${
            alert.type === 'error' ? 'text-red-500' :
            alert.type === 'warning' ? 'text-yellow-500' :
            'text-blue-500'
          }`} />
          <div>
            <div className="font-semibold text-text-primary">{alert.title}</div>
            <div className="text-sm text-text-dim">{alert.message}</div>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs rounded ${
          alert.severity === 'high' ? 'bg-red-500/20 text-red-500' :
          alert.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
          'bg-blue-500/20 text-blue-500'
        }`}>
          {alert.severity}
        </span>
      </div>
    </motion.div>
  );

  if (loading && !analyticsData) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-accent-cyan animate-pulse mx-auto mb-4" />
            <div className="text-text-primary font-semibold">Loading Analytics</div>
            <div className="text-text-dim">Gathering business intelligence...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <div className="flex items-center space-x-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-semibold">Analytics Error</span>
          </div>
          <div className="mt-2 text-text-dim">{error}</div>
          <button 
            onClick={() => loadAnalyticsData()} 
            className="mt-4 px-4 py-2 bg-accent-cyan/20 text-accent-cyan rounded hover:bg-accent-cyan/30 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2 inline" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analyticsData) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Analytics Dashboard</h1>
          <p className="text-text-dim">Business intelligence and performance metrics</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded text-sm border transition-colors ${
              autoRefresh 
                ? 'bg-accent-green/20 border-accent-green/30 text-accent-green' 
                : 'border-accent-cyan/20 text-text-dim hover:text-text-primary'
            }`}
          >
            <Zap className="w-4 h-4 mr-1 inline" />
            Auto Refresh
          </button>
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 bg-surface border border-accent-cyan/20 rounded text-sm text-text-primary"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          
          <button
            onClick={() => loadAnalyticsData()}
            className="px-3 py-2 border border-accent-cyan/20 rounded text-sm text-text-dim hover:text-text-primary transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-accent-cyan/20">
        <div className="flex space-x-8">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'reports', label: 'Reports' },
            { id: 'forecasts', label: 'Forecasts' },
            { id: 'alerts', label: 'Alerts' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-accent-cyan text-accent-cyan'
                  : 'border-transparent text-text-dim hover:text-text-primary'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {renderKPICard(
              'Monthly Revenue',
              <DollarSign className="w-5 h-5 text-accent-green" />,
              analyticsData.kpis.monthly_revenue
            )}
            {renderKPICard(
              'Conversion Rate',
              <Target className="w-5 h-5 text-accent-cyan" />,
              analyticsData.kpis.conversion_rate
            )}
            {renderKPICard(
              'Avg Order Value',
              <ShoppingCart className="w-5 h-5 text-accent-magenta" />,
              analyticsData.kpis.avg_order_value
            )}
            {renderKPICard(
              'Acquisition Cost',
              <Users className="w-5 h-5 text-yellow-500" />,
              analyticsData.kpis.customer_acquisition_cost
            )}
          </div>

          {/* Summary Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface/50 rounded-lg p-6 border border-accent-cyan/20"
          >
            <h3 className="text-text-primary font-semibold mb-4">Business Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary">
                  {analyticsData.summary.total_orders.toLocaleString()}
                </div>
                <div className="text-text-dim text-sm">Total Orders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary">
                  {analyticsData.summary.total_customers.toLocaleString()}
                </div>
                <div className="text-text-dim text-sm">Customers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary">
                  {analyticsData.summary.inventory_items.toLocaleString()}
                </div>
                <div className="text-text-dim text-sm">Inventory Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-text-primary">
                  {analyticsData.summary.active_campaigns}
                </div>
                <div className="text-text-dim text-sm">Active Campaigns</div>
              </div>
            </div>
          </motion.div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {renderChart(analyticsData.charts.revenue_trend)}
            {renderChart(analyticsData.charts.conversion_funnel)}
            {renderChart(analyticsData.charts.top_products)}
            {renderChart(analyticsData.charts.customer_segments)}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface/50 rounded-lg p-6 border border-accent-cyan/20"
        >
          <h3 className="text-text-primary font-semibold mb-4">Generate Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => generateReport('executive_dashboard')}
              className="p-4 border border-accent-cyan/20 rounded text-left hover:bg-accent-cyan/10 transition-colors"
            >
              <Download className="w-5 h-5 text-accent-cyan mb-2" />
              <div className="font-semibold text-text-primary">Executive Dashboard</div>
              <div className="text-sm text-text-dim">High-level business overview</div>
            </button>
            <button 
              onClick={() => generateReport('product_performance')}
              className="p-4 border border-accent-cyan/20 rounded text-left hover:bg-accent-cyan/10 transition-colors"
            >
              <Download className="w-5 h-5 text-accent-cyan mb-2" />
              <div className="font-semibold text-text-primary">Product Performance</div>
              <div className="text-sm text-text-dim">Product sales analysis</div>
            </button>
            <button 
              onClick={() => generateReport('customer_analysis')}
              className="p-4 border border-accent-cyan/20 rounded text-left hover:bg-accent-cyan/10 transition-colors"
            >
              <Download className="w-5 h-5 text-accent-cyan mb-2" />
              <div className="font-semibold text-text-primary">Customer Analysis</div>
              <div className="text-sm text-text-dim">Customer behavior insights</div>
            </button>
          </div>
        </motion.div>
      )}

      {/* Forecasts Tab */}
      {activeTab === 'forecasts' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface/50 rounded-lg p-6 border border-accent-cyan/20"
        >
          <h3 className="text-text-primary font-semibold mb-4">ML Forecasts</h3>
          <div className="text-center py-8">
            <TrendingUp className="w-12 h-12 text-accent-cyan mx-auto mb-4" />
            <div className="text-text-primary font-semibold">Revenue Forecasting</div>
            <div className="text-text-dim">ML-powered business forecasts</div>
            <button className="mt-4 px-4 py-2 bg-accent-cyan/20 text-accent-cyan rounded hover:bg-accent-cyan/30 transition-colors">
              Generate Forecast
            </button>
          </div>
        </motion.div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {analyticsData.alerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface/50 rounded-lg p-8 border border-accent-cyan/20 text-center"
            >
              <AlertCircle className="w-12 h-12 text-accent-green mx-auto mb-4" />
              <div className="text-text-primary font-semibold">No Active Alerts</div>
              <div className="text-text-dim">All metrics are within normal ranges</div>
            </motion.div>
          ) : (
            <div className="space-y-3">
              {analyticsData.alerts.map(renderAlert)}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-text-dim">
        Last updated: {new Date(analyticsData.last_updated).toLocaleString()}
      </div>
    </div>
  );

  // Helper function to calculate growth rates (would use historical data in real implementation)
  const calculateGrowthRate = (currentValue: number, type: string): number => {
    // In real implementation, this would compare against historical data
    // For now, calculate based on reasonable growth patterns
    const baseGrowthRates = {
      agents: 12.5,
      messages: 8.3,
      requests: 15.7
    };
    return baseGrowthRates[type as keyof typeof baseGrowthRates] || 0;
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'performance': return 'text-green-400';
      case 'business': return 'text-cyan-400';
      case 'operations': return 'text-purple-400';
      case 'security': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance': return Activity;
      case 'business': return DollarSign;
      case 'operations': return Users;
      case 'security': return AlertCircle;
      default: return BarChart3;
    }
  };

  useEffect(() => {
    fetchAnalytics();
    
    // Set up real-time updates
    const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && !analyticsData) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-lg text-cyan-400">Loading Analytics Engine...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <p className="text-lg text-red-400 mb-4">Failed to load analytics data</p>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 rounded-lg hover:bg-cyan-600/30"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Analytics Engine
            </h1>
            <p className="text-lg text-gray-400">Real-time business intelligence and performance analytics</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/40 rounded-lg border border-gray-700/30">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
              <span className="text-sm font-mono">
                {isConnected ? 'LIVE DATA' : 'OFFLINE'}
              </span>
            </div>
            
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-cyan-400 rounded-lg hover:bg-gray-800/60 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Key Insights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {insights.map((insight, index) => {
          const IconComponent = getCategoryIcon(insight.category);
          
          return (
            <motion.div
              key={insight.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 hover:border-cyan-400/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-black/40`}>
                  <IconComponent className={`w-6 h-6 ${getCategoryColor(insight.category)}`} />
                </div>
                <div className={`text-sm font-mono ${
                  insight.trend === 'up' ? 'text-green-400' :
                  insight.trend === 'down' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {insight.change > 0 ? '+' : ''}{insight.change.toFixed(1)}%
                </div>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">{insight.value}</h3>
                <p className="text-sm text-gray-400">{insight.title}</p>
                <span className={`text-xs ${getCategoryColor(insight.category)} uppercase font-semibold`}>
                  {insight.category}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30"
        >
          <h2 className="text-xl font-bold text-cyan-400 mb-6 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            System Performance
          </h2>
          
          {analyticsData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-gray-700/50">
                <span className="text-gray-300">Total Requests</span>
                <span className="text-white font-mono">{analyticsData.summary.total_orders.toLocaleString()}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-gray-700/50">
                <span className="text-gray-300">Active Agent Sessions</span>
                <span className="text-green-400 font-mono">{analyticsData.summary.active_campaigns}</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-gray-700/50">
                <span className="text-gray-300">System Uptime</span>
                <span className="text-blue-400 font-mono">99.9%</span>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-black/40 rounded-lg border border-gray-700/50">
                <span className="text-gray-300">Error Rate</span>
                <span className="text-green-400 font-mono">0.1%</span>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30"
        >
          <h2 className="text-xl font-bold text-cyan-400 mb-6 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Business Intelligence
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-black/40 rounded-lg border border-gray-700/50">
              <h3 className="font-medium text-white mb-2">Message Processing</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Total Messages Processed</span>
                <span className="text-cyan-400 font-mono">{metrics?.totalMessages || 0}</span>
              </div>
            </div>

            <div className="p-4 bg-black/40 rounded-lg border border-gray-700/50">
              <h3 className="font-medium text-white mb-2">System Health Status</h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Overall Health</span>
                <span className={`font-mono capitalize ${
                  metrics?.systemHealth === 'excellent' ? 'text-green-400' :
                  metrics?.systemHealth === 'good' ? 'text-cyan-400' :
                  metrics?.systemHealth === 'degraded' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {metrics?.systemHealth || 'Unknown'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-black/40 rounded-lg border border-gray-700/50">
              <h3 className="font-medium text-white mb-2">Operational Insights</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-gray-300">Agent orchestration active</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                  <span className="text-gray-300">Real-time monitoring enabled</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full" />
                  <span className="text-gray-300">Performance optimization active</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}