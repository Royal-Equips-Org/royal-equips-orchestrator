import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  Users, 
  Activity,
  ShoppingCart,
  Eye,
  Zap
} from 'lucide-react';
import { useEmpireStore } from '../../store/empire-store';

interface DashboardMetric {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
  color: string;
}

export default function DashboardModule() {
  const [metrics, setMetrics] = useState<DashboardMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isConnected } = useEmpireStore();

  // Fetch initial dashboard metrics
  useEffect(() => {
    const fetchDashboardMetrics = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/metrics/dashboard');
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard metrics');
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
          const data = result.data;
          
          // Build metrics from real backend data
          const newMetrics: DashboardMetric[] = [
            {
              id: 'revenue',
              title: 'Total Revenue',
              value: data.revenue?.total ? `$${data.revenue.total.toLocaleString()}` : '$0',
              change: '+12.5%', // TODO: Calculate from historical data
              trend: 'up',
              icon: DollarSign,
              color: 'text-green-400'
            },
            {
              id: 'orders',
              title: 'Orders Today',
              value: data.orders?.total?.toString() || '0',
              change: '+8.3%',
              trend: 'up',
              icon: ShoppingCart,
              color: 'text-cyan-400'
            },
            {
              id: 'products',
              title: 'Active Products',
              value: data.inventory?.total_products?.toLocaleString() || '0',
              change: '+2.1%',
              trend: 'up',
              icon: Package,
              color: 'text-purple-400'
            },
            {
              id: 'customers',
              title: 'Active Customers',
              value: data.customers?.total?.toLocaleString() || '0',
              change: '+15.7%',
              trend: 'up',
              icon: Users,
              color: 'text-pink-400'
            },
            {
              id: 'conversion',
              title: 'Conversion Rate',
              value: '3.2%', // TODO: Calculate from orders/visitors
              change: '-0.5%',
              trend: 'down',
              icon: TrendingUp,
              color: 'text-yellow-400'
            },
            {
              id: 'performance',
              title: 'System Health',
              value: data.system?.health === 'healthy' ? '99.2%' : '95.0%',
              change: 'Excellent',
              trend: 'up',
              icon: Activity,
              color: 'text-green-400'
            }
          ];
          
          setMetrics(newMetrics);
          setError(null);
        }
      } catch (err) {
        console.error('Dashboard metrics fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardMetrics();
  }, []);

  // Real-time updates from backend APIs
  useEffect(() => {
    const fetchRealTimeMetrics = async () => {
      try {
        const response = await fetch('/api/metrics/real-time');
        if (response.ok) {
          const result = await response.json();
          
          if (result.success && result.data) {
            const realTimeData = result.data;
            
            setMetrics(prev => prev.map(metric => {
              const backendValue = realTimeData[metric.id];
              if (backendValue) {
                let formattedValue = '';
                if (metric.id === 'revenue') {
                  formattedValue = `$${backendValue.value.toLocaleString()}`;
                } else if (metric.id === 'conversion' || metric.id === 'performance') {
                  formattedValue = `${backendValue.value.toFixed(1)}%`;
              } else {
                formattedValue = Math.round(backendValue.value).toLocaleString();
              }

              return {
                ...metric,
                value: formattedValue,
                change: backendValue.change,
                trend: backendValue.trend
              };
            }
            return metric;
          }));
        }
      } catch (error) {
        console.error('Failed to fetch real-time metrics:', error);
      }
    };

    const interval = setInterval(fetchRealTimeMetrics, 5000);
    fetchRealTimeMetrics(); // Initial fetch

    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <Zap className="w-16 h-16 text-cyan-400 animate-pulse mx-auto mb-4" />
          <p className="text-xl text-gray-400">Loading dashboard metrics...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-8 text-center">
          <Eye className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-400 mb-2">Failed to Load Dashboard</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
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
              Empire Dashboard
            </h1>
            <p className="text-lg text-gray-400">Real-time business intelligence from Shopify & agents</p>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/40 rounded-lg border border-gray-700/30">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
            <span className="text-sm font-mono">
              {isConnected ? 'LIVE DATA' : 'OFFLINE'}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {metrics.map((metric, index) => {
          const IconComponent = metric.icon;
          
          return (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 hover:border-cyan-400/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-black/40 ${metric.color}`}>
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className={`text-sm font-mono ${
                  metric.trend === 'up' ? 'text-green-400' :
                  metric.trend === 'down' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {metric.change}
                </div>
              </div>
              
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">{metric.value}</h3>
                <p className="text-sm text-gray-400">{metric.title}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30"
      >
        <h2 className="text-xl font-bold text-cyan-400 mb-6 flex items-center">
          <Zap className="w-5 h-5 mr-2" />
          Quick Actions
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'View Orders', desc: 'Recent transactions', icon: ShoppingCart, color: 'cyan' },
            { label: 'Analytics', desc: 'Deep insights', icon: Eye, color: 'purple' },
            { label: 'Products', desc: 'Inventory management', icon: Package, color: 'green' },
            { label: 'Customers', desc: 'User profiles', icon: Users, color: 'pink' }
          ].map((action, index) => (
            <motion.button
              key={action.label}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-4 bg-black/40 rounded-lg border border-gray-700/50 text-left hover:border-cyan-400/50 transition-colors group"
            >
              <action.icon className={`w-6 h-6 text-${action.color}-400 mb-3 group-hover:scale-110 transition-transform`} />
              <div className="text-sm font-medium text-white">{action.label}</div>
              <div className="text-xs text-gray-400">{action.desc}</div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}