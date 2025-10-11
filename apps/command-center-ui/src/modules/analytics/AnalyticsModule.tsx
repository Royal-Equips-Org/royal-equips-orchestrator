/**
 * Enterprise Analytics Module - Connected to Real Backend
 * 
 * Connects to production analytics endpoints from app/routes/analytics.py
 * Uses real business intelligence from ProductionAnalyticsAgent
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  Download,
  Brain,
  Target,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Eye,
  Database,
  TrendingDown
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import ErrorBoundary from '../../components/error/ErrorBoundary';

interface DashboardData {
  kpis: Record<string, {
    value: number;
    change: number;
    status: 'healthy' | 'warning' | 'critical';
    formatted: string;
  }>;
  charts: Record<string, {
    type: string;
    title: string;
    data: any[];
  }>;
  summary: {
    total_orders: number;
    total_customers: number;
    inventory_items: number;
    active_campaigns: number;
  };
  alerts: Array<{
    id: string;
    type: 'warning' | 'info' | 'error';
    title: string;
    message: string;
    severity: string;
    created_at: string;
  }>;
  time_range: string;
  last_updated: string;
}

export default function AnalyticsModule() {
  const [analytics, setAnalytics] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalyticsData();
    
    // Real-time updates every 30 seconds
    const interval = setInterval(fetchAnalyticsData, 30000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/analytics/dashboard', {
        params: {
          time_range: timeRange,
          refresh: true
        }
      });
      
      // Use real backend data structure from analytics.py
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics dashboard:', error);
      // Keep analytics null so the existing fallback UI is shown
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <ArrowUp className="w-4 h-4 text-green-400" />;
      case 'down': return <ArrowDown className="w-4 h-4 text-red-400" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-300">Loading Analytics...</h2>
          <p className="text-gray-400">Connecting to production analytics agent</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-400 mb-2">Analytics Unavailable</h2>
          <p className="text-gray-300 mb-6">Unable to connect to production analytics agent</p>
          <Button onClick={refreshData} className="bg-cyan-600 hover:bg-cyan-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Connection
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={(error, retry) => (
        <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-400 mb-2">Analytics Module Error</h2>
            <p className="text-gray-300 mb-4">Production analytics error: {error.message}</p>
            <Button onClick={retry} className="bg-cyan-600 hover:bg-cyan-700">
              Retry
            </Button>
          </div>
        </div>
      )}
    >
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <BarChart3 className="w-8 h-8 text-cyan-400" />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  Production Analytics
                </h1>
                <p className="text-gray-400 mt-1">
                  Real-time business intelligence powered by ProductionAnalyticsAgent
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
              
              <Button 
                onClick={refreshData}
                disabled={refreshing}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
              
              <div className="text-xs text-gray-400">
                Last updated: {new Date(analytics.last_updated).toLocaleString()}
              </div>
            </div>
          </div>

          {/* KPI Dashboard - Real Backend Data */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Object.entries(analytics.kpis).map(([key, kpi]) => (
              <Card key={key} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      kpi.status === 'healthy' ? 'bg-green-400' : 
                      kpi.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                    }`} />
                    <h3 className="text-sm font-medium text-gray-400">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(kpi.change > 0 ? 'up' : kpi.change < 0 ? 'down' : 'stable')}
                    <span className={`text-sm ${kpi.change > 0 ? 'text-green-400' : kpi.change < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {Math.abs(kpi.change).toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className={`text-3xl font-bold ${
                      kpi.status === 'healthy' ? 'text-green-400' : 
                      kpi.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {kpi.formatted}
                    </span>
                    <Badge variant={kpi.status === 'healthy' ? 'default' : 'secondary'}>
                      {kpi.status}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Business Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <ShoppingCart className="w-8 h-8 text-blue-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {analytics.summary.total_orders.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">Total Orders</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <Users className="w-8 h-8 text-purple-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {analytics.summary.total_customers.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">Total Customers</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <Package className="w-8 h-8 text-green-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {analytics.summary.inventory_items.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">Inventory Items</div>
                </div>
              </div>
            </Card>
            
            <Card className="p-6">
              <div className="flex items-center space-x-3">
                <Target className="w-8 h-8 text-orange-400" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {analytics.summary.active_campaigns.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">Active Campaigns</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Charts Overview */}
          <Card className="p-6 mb-8">
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-cyan-400" />
              Analytics Charts
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(analytics.charts).map(([key, chart]) => (
                <div key={key} className="bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm font-semibold text-gray-300 mb-2">
                    {chart.title}
                  </div>
                  <div className="text-xs text-gray-400 mb-2">
                    Type: {chart.type}
                  </div>
                  <div className="text-xs text-gray-500">
                    Data points: {chart.data.length}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* System Alerts */}
          {analytics.alerts && analytics.alerts.length > 0 && (
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-6 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-yellow-400" />
                System Alerts ({analytics.alerts.length})
              </h3>
              
              <div className="space-y-3">
                {analytics.alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`p-4 rounded-lg border ${
                      alert.type === 'warning' ? 'bg-yellow-900/20 border-yellow-500/30' :
                      alert.type === 'info' ? 'bg-blue-900/20 border-blue-500/30' :
                      'bg-red-900/20 border-red-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold text-white mb-1">{alert.title}</div>
                        <div className="text-sm text-gray-300">{alert.message}</div>
                        <div className="text-xs text-gray-400 mt-2">
                          Severity: {alert.severity} • {new Date(alert.created_at).toLocaleString()}
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        alert.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                        alert.type === 'info' ? 'bg-blue-500/20 text-blue-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {alert.type}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}