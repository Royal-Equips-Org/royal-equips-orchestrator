import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Target,
  Calendar,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface RevenueMetric {
  id: string;
  label: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  target?: string;
}

interface RevenueForecast {
  period: string;
  projected: number;
  actual?: number;
  confidence: number;
}

export default function RevenueModule() {
  const [metrics, setMetrics] = useState<RevenueMetric[]>([
    {
      id: 'monthly_revenue',
      label: 'Monthly Revenue',
      value: '$284,573',
      change: 18.5,
      trend: 'up',
      target: '$300K'
    },
    {
      id: 'quarterly_revenue',
      label: 'Quarterly Revenue',
      value: '$847,291',
      change: 12.3,
      trend: 'up',
      target: '$900K'
    },
    {
      id: 'annual_revenue',
      label: 'Annual Revenue',
      value: '$3.2M',
      change: 15.7,
      trend: 'up',
      target: '$4M'
    },
    {
      id: 'profit_margin',
      label: 'Profit Margin',
      value: '34.2%',
      change: -2.1,
      trend: 'down',
      target: '38%'
    }
  ]);

  const [forecasts, setForecasts] = useState<RevenueForecast[]>([
    { period: 'Next Month', projected: 312000, confidence: 87 },
    { period: 'Next Quarter', projected: 945000, confidence: 82 },
    { period: 'Next Year', projected: 4200000, confidence: 75 }
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => prev.map(metric => {
        if (Math.random() > 0.8) {
          const variation = (Math.random() - 0.5) * 2; // ±1% variation
          const newChange = metric.change + variation;
          
          return {
            ...metric,
            change: newChange,
            trend: newChange > 0 ? 'up' : newChange < 0 ? 'down' : 'neutral'
          };
        }
        return metric;
      }));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: amount >= 1000000 ? 'compact' : 'standard'
    }).format(amount);
  };

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
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              Revenue Intelligence
            </h1>
            <p className="text-lg text-gray-400">Advanced revenue analytics and forecasting engine</p>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/40 rounded-lg border border-gray-700/30">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-sm font-mono text-green-400">+15.7% YoY</span>
          </div>
        </div>
      </motion.div>

      {/* Revenue Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 hover:border-green-400/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-black/40">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex items-center gap-1">
                {metric.trend === 'up' ? (
                  <ArrowUpRight className="w-4 h-4 text-green-400" />
                ) : metric.trend === 'down' ? (
                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                ) : null}
                <span className={`text-sm font-mono ${
                  metric.trend === 'up' ? 'text-green-400' :
                  metric.trend === 'down' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                </span>
              </div>
            </div>
            
            <div className="mb-2">
              <h3 className="text-2xl font-bold text-white">{metric.value}</h3>
              <p className="text-sm text-gray-400">{metric.label}</p>
            </div>
            
            {metric.target && (
              <div className="text-xs text-gray-500">
                Target: {metric.target}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Forecasting */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30"
        >
          <h2 className="text-xl font-bold text-green-400 mb-6 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Revenue Forecasting
          </h2>
          
          <div className="space-y-4">
            {forecasts.map((forecast, index) => (
              <div key={index} className="p-4 bg-black/40 rounded-lg border border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">{forecast.period}</span>
                  <span className="text-green-400 font-mono">
                    {formatCurrency(forecast.projected)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Confidence Level</span>
                  <span className={`font-mono ${
                    forecast.confidence >= 85 ? 'text-green-400' :
                    forecast.confidence >= 70 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {forecast.confidence}%
                  </span>
                </div>
                {/* Progress bar for confidence */}
                <div className="mt-2 w-full bg-gray-800/60 rounded-full h-2">
                  <motion.div
                    className={`h-2 rounded-full ${
                      forecast.confidence >= 85 ? 'bg-green-400' :
                      forecast.confidence >= 70 ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${forecast.confidence}%` }}
                    transition={{ duration: 1, delay: index * 0.2 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Revenue Analytics */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30"
        >
          <h2 className="text-xl font-bold text-green-400 mb-6 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Analytics Insights
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-black/40 rounded-lg border border-gray-700/50">
              <h3 className="font-medium text-white mb-2">Top Revenue Drivers</h3>
              <div className="space-y-2">
                {[
                  { name: 'Premium Products', share: 45, growth: 12.3 },
                  { name: 'Subscription Services', share: 32, growth: 18.7 },
                  { name: 'Enterprise Solutions', share: 23, growth: 8.9 }
                ].map((driver, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{driver.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono">{driver.share}%</span>
                      <span className="text-green-400 font-mono">+{driver.growth}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 bg-black/40 rounded-lg border border-gray-700/50">
              <h3 className="font-medium text-white mb-2">Optimization Opportunities</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full" />
                  <span className="text-gray-300">Price optimization: +$12K potential</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  <span className="text-gray-300">Upsell campaigns: +$8K potential</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                  <span className="text-gray-300">Retention programs: +$15K potential</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30"
      >
        <h2 className="text-xl font-bold text-green-400 mb-6">Revenue Operations</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Generate Report', desc: 'Comprehensive revenue analysis', icon: BarChart3, color: 'green' },
            { label: 'Forecast Model', desc: 'Update predictive models', icon: TrendingUp, color: 'blue' },
            { label: 'Optimization', desc: 'Revenue enhancement opportunities', icon: Target, color: 'purple' }
          ].map((action, index) => (
            <motion.button
              key={action.label}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-4 bg-black/40 rounded-lg border border-gray-700/50 text-left hover:border-green-400/50 transition-colors group"
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