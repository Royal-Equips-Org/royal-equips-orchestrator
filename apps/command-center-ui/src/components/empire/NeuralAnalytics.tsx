// NEURAL ANALYTICS - QUANTUM BUSINESS INTELLIGENCE DASHBOARD
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Users, Package, Zap, Brain, Target, Activity } from 'lucide-react';

export default function NeuralAnalytics() {
  const [analytics, setAnalytics] = useState({
    revenue: { current: 2400000, target: 3000000, growth: 18.5 },
    customers: { total: 45672, new: 1234, retention: 87.3 },
    products: { active: 99, bestsellers: 12, categories: 25 },
    performance: { conversion: 4.2, avgOrder: 156, satisfaction: 94.7 }
  });

  const [neuralActivity, setNeuralActivity] = useState(94);
  const [processingPower, setProcessingPower] = useState(87);

  useEffect(() => {
    const interval = setInterval(() => {
      setNeuralActivity(prev => Math.max(80, Math.min(100, prev + Math.random() * 10 - 5)));
      setProcessingPower(prev => Math.max(75, Math.min(95, prev + Math.random() * 8 - 4)));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const MetricCard = ({ title, value, subtitle, icon: Icon, color, trend }: any) => (
    <motion.div
      whileHover={{ scale: 1.05, rotateY: 5 }}
      className={`bg-gradient-to-br ${color} backdrop-blur-xl rounded-2xl p-6 border border-opacity-30 relative overflow-hidden group`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <Icon className="w-8 h-8" />
          {trend && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
              trend > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <TrendingUp className="w-3 h-3" />
              <span>{trend > 0 ? '+' : ''}{trend}%</span>
            </div>
          )}
        </div>
        <div className="text-3xl font-bold text-white mb-2">{value}</div>
        <div className="text-sm opacity-70">{subtitle}</div>
        <div className="text-xs font-mono mt-2 opacity-50">{title}</div>
      </div>
    </motion.div>
  );

  return (
    <div className="h-full p-8">
      <div className="grid grid-cols-12 gap-6 h-full">
        {/* Main Analytics Display */}
        <div className="col-span-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                NEURAL ANALYTICS ENGINE
              </h2>
              <p className="text-cyan-300 font-mono mt-2">Quantum Business Intelligence Matrix</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="px-4 py-2 bg-green-500/20 rounded-full border border-green-400/30">
                <span className="text-sm font-mono text-green-300">Neural: {neuralActivity.toFixed(0)}%</span>
              </div>
              <div className="px-4 py-2 bg-blue-500/20 rounded-full border border-blue-400/30">
                <span className="text-sm font-mono text-blue-300">Processing: {processingPower.toFixed(0)}%</span>
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard
              title="REVENUE INTELLIGENCE"
              value={`$${(analytics.revenue.current / 1000000).toFixed(1)}M`}
              subtitle={`Target: $${(analytics.revenue.target / 1000000).toFixed(1)}M`}
              icon={DollarSign}
              color="from-green-500/10 to-emerald-500/10 border-green-400"
              trend={analytics.revenue.growth}
            />
            <MetricCard
              title="CUSTOMER MATRIX"
              value={analytics.customers.total.toLocaleString()}
              subtitle={`+${analytics.customers.new} new`}
              icon={Users}
              color="from-blue-500/10 to-cyan-500/10 border-blue-400"
              trend={12.3}
            />
            <MetricCard
              title="PRODUCT NETWORK"
              value={analytics.products.active}
              subtitle={`${analytics.products.categories} categories`}
              icon={Package}
              color="from-purple-500/10 to-pink-500/10 border-purple-400"
              trend={8.7}
            />
            <MetricCard
              title="PERFORMANCE CORE"
              value={`${analytics.performance.conversion}%`}
              subtitle={`$${analytics.performance.avgOrder} AOV`}
              icon={Target}
              color="from-orange-500/10 to-red-500/10 border-orange-400"
              trend={15.2}
            />
          </div>

          {/* Neural Activity Visualization */}
          <div className="bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20 backdrop-blur-xl rounded-3xl border border-cyan-500/30 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-cyan-400">NEURAL PATTERN ANALYSIS</h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-sm font-mono">ACTIVE</span>
              </div>
            </div>

            {/* Animated Chart Area */}
            <div className="relative h-64 bg-black/20 rounded-2xl p-4 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 800 200">
                <defs>
                  <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00FFFF" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#FF0080" stopOpacity="0.4" />
                  </linearGradient>
                </defs>
                
                {/* Revenue Pattern */}
                <motion.path
                  d="M0,160 Q200,80 400,100 T800,60"
                  stroke="url(#neuralGradient)"
                  strokeWidth="3"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 4, repeat: Infinity }}
                />
                
                {/* Customer Pattern */}
                <motion.path
                  d="M0,140 Q150,60 300,90 T800,40"
                  stroke="#00FF00"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="5,5"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                />
                
                {/* Performance Pattern */}
                <motion.path
                  d="M0,180 Q250,100 500,120 T800,80"
                  stroke="#FFD700"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="10,3"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 3.5, repeat: Infinity, delay: 1 }}
                />
              </svg>
              
              {/* Floating Data Points */}
              <div className="absolute inset-0 flex items-center justify-around">
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      y: [0, -20, 0],
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.3
                    }}
                    className="w-3 h-3 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50"
                  />
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center space-x-8 mt-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full" />
                <span className="text-gray-300">Revenue Intelligence</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full" />
                <span className="text-gray-300">Customer Analytics</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                <span className="text-gray-300">Performance Metrics</span>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Control Panel */}
        <div className="col-span-4 space-y-6">
          {/* Neural Control */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl rounded-2xl border border-cyan-400/30 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-cyan-400">NEURAL CORE</h3>
              <Brain className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-300">Neural Activity</span>
                  <span className="text-sm text-cyan-400">{neuralActivity.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div 
                    className="bg-gradient-to-r from-cyan-400 to-blue-400 h-2 rounded-full"
                    style={{ width: `${neuralActivity}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-300">Processing Power</span>
                  <span className="text-sm text-blue-400">{processingPower.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div 
                    className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full"
                    style={{ width: `${processingPower}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Insights */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-2xl border border-green-400/30 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-green-400">QUANTUM INSIGHTS</h3>
              <Zap className="w-6 h-6 text-green-400" />
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-black/20 rounded-lg border border-green-400/20">
                <div className="text-sm text-white mb-1">Revenue Optimization</div>
                <div className="text-xs text-green-400">+$47K potential increase detected</div>
              </div>
              <div className="p-3 bg-black/20 rounded-lg border border-blue-400/20">
                <div className="text-sm text-white mb-1">Customer Behavior</div>
                <div className="text-xs text-blue-400">Peak activity: 2-4 PM weekdays</div>
              </div>
              <div className="p-3 bg-black/20 rounded-lg border border-purple-400/20">
                <div className="text-sm text-white mb-1">Product Performance</div>
                <div className="text-xs text-purple-400">12 bestsellers driving 60% revenue</div>
              </div>
            </div>
          </motion.div>

          {/* Analytics Controls */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl border border-purple-400/30 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-purple-400">QUANTUM CONTROLS</h3>
              <Activity className="w-6 h-6 text-purple-400" />
            </div>
            <div className="space-y-3">
              <button className="w-full p-3 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-400/30 rounded-lg text-cyan-400 hover:bg-cyan-600/30 transition-all">
                <div className="flex items-center justify-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <span className="text-sm font-mono">DEEP ANALYSIS</span>
                </div>
              </button>
              <button className="w-full p-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-400/30 rounded-lg text-green-400 hover:bg-green-600/30 transition-all">
                <div className="flex items-center justify-center space-x-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-mono">OPTIMIZE</span>
                </div>
              </button>
              <button className="w-full p-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-400/30 rounded-lg text-purple-400 hover:bg-purple-600/30 transition-all">
                <div className="flex items-center justify-center space-x-2">
                  <Brain className="w-4 h-4" />
                  <span className="text-sm font-mono">ENHANCE AI</span>
                </div>
              </button>
            </div>
          </motion.div>

          {/* Real-time Metrics */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-xl rounded-2xl border border-orange-400/30 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-orange-400">LIVE METRICS</h3>
              <Target className="w-6 h-6 text-orange-400" />
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Conversion Rate</span>
                <span className="text-orange-400 font-mono">{analytics.performance.conversion}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Customer Retention</span>
                <span className="text-green-400 font-mono">{analytics.customers.retention}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Satisfaction Score</span>
                <span className="text-purple-400 font-mono">{analytics.performance.satisfaction}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Bestsellers Ratio</span>
                <span className="text-cyan-400 font-mono">{((analytics.products.bestsellers / analytics.products.active) * 100).toFixed(1)}%</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}