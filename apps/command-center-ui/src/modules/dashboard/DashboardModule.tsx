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
  const [metrics, setMetrics] = useState<DashboardMetric[]>([
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: '$127,543',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-400'
    },
    {
      id: 'orders',
      title: 'Orders Today',
      value: '342',
      change: '+8.3%',
      trend: 'up',
      icon: ShoppingCart,
      color: 'text-cyan-400'
    },
    {
      id: 'products',
      title: 'Active Products',
      value: '1,847',
      change: '+2.1%',
      trend: 'up',
      icon: Package,
      color: 'text-purple-400'
    },
    {
      id: 'customers',
      title: 'Active Customers',
      value: '5,239',
      change: '+15.7%',
      trend: 'up',
      icon: Users,
      color: 'text-pink-400'
    },
    {
      id: 'conversion',
      title: 'Conversion Rate',
      value: '3.2%',
      change: '-0.5%',
      trend: 'down',
      icon: TrendingUp,
      color: 'text-yellow-400'
    },
    {
      id: 'performance',
      title: 'System Health',
      value: '99.2%',
      change: 'Excellent',
      trend: 'up',
      icon: Activity,
      color: 'text-green-400'
    }
  ]);

  const { isConnected } = useEmpireStore();

  // Real-time updates from backend APIs
  useEffect(() => {
    const fetchRealTimeMetrics = async () => {
      try {
        const response = await fetch('/api/metrics/real-time');
        if (response.ok) {
          const realTimeData = await response.json();
          
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
            <p className="text-lg text-gray-400">Real-time business intelligence overview</p>
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