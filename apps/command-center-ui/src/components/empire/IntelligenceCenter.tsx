// INTELLIGENCE CENTER - QUANTUM BUSINESS INTELLIGENCE
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Eye, Brain, TrendingUp, DollarSign, Target, Zap, Database, Shield } from 'lucide-react';

export default function IntelligenceCenter() {
  const [intelligenceLevel, setIntelligenceLevel] = useState(95);
  const [insights, setInsights] = useState([
    { id: 1, type: 'revenue', priority: 'high', message: 'Revenue spike detected in Electronics category (+25%)', timestamp: new Date() },
    { id: 2, type: 'inventory', priority: 'medium', message: 'Optimal restock window for 15 products identified', timestamp: new Date() },
    { id: 3, type: 'market', priority: 'high', message: 'New market opportunity: Premium fitness accessories', timestamp: new Date() },
    { id: 4, type: 'automation', priority: 'low', message: 'Agent efficiency increased by 12% this week', timestamp: new Date() },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setIntelligenceLevel(prev => Math.max(85, Math.min(100, prev + Math.random() * 6 - 3)));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'revenue': return DollarSign;
      case 'inventory': return Database;
      case 'market': return Target;
      case 'automation': return Zap;
      default: return Brain;
    }
  };

  const getInsightColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 border-red-400/30 bg-red-500/10';
      case 'medium': return 'text-yellow-400 border-yellow-400/30 bg-yellow-500/10';
      case 'low': return 'text-green-400 border-green-400/30 bg-green-500/10';
      default: return 'text-gray-400 border-gray-400/30 bg-gray-500/10';
    }
  };

  return (
    <div className="h-full p-8">
      <div className="grid grid-cols-12 gap-6 h-full">
        {/* Main Intelligence Display */}
        <div className="col-span-8 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20 backdrop-blur-xl rounded-3xl border border-cyan-500/30 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              QUANTUM INTELLIGENCE MATRIX
            </h2>
            <div className="flex items-center space-x-4">
              <div className="px-4 py-2 bg-green-500/20 rounded-full border border-green-400/30">
                <span className="text-sm font-mono text-green-300">IQ: {intelligenceLevel.toFixed(0)}</span>
              </div>
              <Shield className="w-6 h-6 text-green-400" />
            </div>
          </div>

          {/* Intelligence Metrics Grid */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-2xl p-6 border border-green-400/30"
            >
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="w-8 h-8 text-green-400" />
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">$2.4M</div>
                  <div className="text-sm text-green-400">+18.5%</div>
                </div>
              </div>
              <div className="text-green-400 font-mono text-sm">REVENUE INTELLIGENCE</div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm rounded-2xl p-6 border border-blue-400/30"
            >
              <div className="flex items-center justify-between mb-4">
                <Database className="w-8 h-8 text-blue-400" />
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">99</div>
                  <div className="text-sm text-blue-400">Products</div>
                </div>
              </div>
              <div className="text-blue-400 font-mono text-sm">INVENTORY MATRIX</div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-2xl p-6 border border-purple-400/30"
            >
              <div className="flex items-center justify-between mb-4">
                <Target className="w-8 h-8 text-purple-400" />
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">87%</div>
                  <div className="text-sm text-purple-400">Accuracy</div>
                </div>
              </div>
              <div className="text-purple-400 font-mono text-sm">PREDICTION ENGINE</div>
            </motion.div>
          </div>

          {/* Intelligence Visualization */}
          <div className="bg-black/20 rounded-2xl p-6 border border-cyan-500/20 h-64">
            <div className="flex items-center justify-between mb-4">
              <span className="text-cyan-400 font-mono text-sm">NEURAL PATTERN ANALYSIS</span>
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              </div>
            </div>
            
            {/* Animated Intelligence Graph */}
            <div className="relative h-40 overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 400 160">
                <defs>
                  <linearGradient id="intelligenceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00FFFF" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
                <motion.path
                  d="M0,140 Q100,60 200,80 T400,40"
                  stroke="url(#intelligenceGradient)"
                  strokeWidth="3"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                <motion.path
                  d="M0,120 Q150,40 300,70 T400,20"
                  stroke="#FF0080"
                  strokeWidth="2"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                />
              </svg>
              
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-2 border-cyan-400 border-t-transparent rounded-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Intelligence Insights Panel */}
        <div className="col-span-4 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl rounded-2xl border border-cyan-400/30 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-cyan-400">QUANTUM INSIGHTS</h3>
              <Eye className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-2">{insights.length}</div>
            <div className="text-sm text-cyan-300">Active intelligence streams</div>
          </motion.div>

          {/* Real-time Insights */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {insights.map((insight, index) => {
              const Icon = getInsightIcon(insight.type);
              return (
                <motion.div
                  key={insight.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, x: -5 }}
                  className={`p-4 rounded-xl border backdrop-blur-xl transition-all ${getInsightColor(insight.priority)}`}
                >
                  <div className="flex items-start space-x-3">
                    <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white mb-1">
                        {insight.message}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-mono opacity-70">
                          {insight.type}
                        </span>
                        <span className="text-xs font-mono opacity-70">
                          {insight.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Intelligence Controls */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl border border-purple-400/30 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-purple-400">QUANTUM CONTROLS</h3>
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <div className="space-y-3">
              <button className="w-full p-3 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-400/30 rounded-lg text-cyan-400 hover:bg-cyan-600/30 transition-all">
                <div className="flex items-center justify-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm font-mono">DEEP SCAN</span>
                </div>
              </button>
              <button className="w-full p-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-400/30 rounded-lg text-green-400 hover:bg-green-600/30 transition-all">
                <div className="flex items-center justify-center space-x-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-mono">OPTIMIZE</span>
                </div>
              </button>
              <button className="w-full p-3 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-400/30 rounded-lg text-yellow-400 hover:bg-yellow-600/30 transition-all">
                <div className="flex items-center justify-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-mono">ENHANCE IQ</span>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}