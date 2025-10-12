// QUANTUM METRICS - ULTIMATE PERFORMANCE DASHBOARD
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Activity, Gauge, Zap, Target, TrendingUp, DollarSign, Users, Package } from 'lucide-react';

export default function QuantumMetrics() {
  const [metrics, setMetrics] = useState({
    quantumLevel: 96.7,
    processingPower: 89.3,
    neuralEfficiency: 94.1,
    systemLoad: 67.8,
    revenue: 2400000,
    customers: 45672,
    products: 99,
    performance: 91.2
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        quantumLevel: Math.max(85, Math.min(100, prev.quantumLevel + Math.random() * 4 - 2)),
        processingPower: Math.max(70, Math.min(95, prev.processingPower + Math.random() * 6 - 3)),
        neuralEfficiency: Math.max(80, Math.min(100, prev.neuralEfficiency + Math.random() * 5 - 2.5)),
        systemLoad: Math.max(50, Math.min(85, prev.systemLoad + Math.random() * 8 - 4)),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const CircularMetric = ({ value, max, label, color, icon: Icon }: any) => {
    const percentage = (value / max) * 100;
    const strokeDasharray = 2 * Math.PI * 45; // radius = 45
    const strokeDashoffset = strokeDasharray - (strokeDasharray * percentage) / 100;

    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        whileHover={{ scale: 1.05 }}
        className="relative bg-gradient-to-br from-gray-900/40 to-gray-800/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 hover:border-cyan-500/50 transition-all"
      >
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                stroke="currentColor"
                strokeWidth="6"
                fill="none"
                className="text-gray-700"
              />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                stroke={color}
                strokeWidth="6"
                fill="none"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                initial={{ strokeDashoffset: strokeDasharray }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="drop-shadow-lg"
                style={{ filter: `drop-shadow(0 0 6px ${color})` }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon className="w-6 h-6" style={{ color }} />
            </div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-1">
            {value.toFixed(1)}{max === 100 ? '%' : ''}
          </div>
          <div className="text-sm opacity-70" style={{ color }}>{label}</div>
        </div>
      </motion.div>
    );
  };

  const LinearMetric = ({ title, value, unit, color, trend, icon: Icon }: any) => (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      whileHover={{ scale: 1.02, x: -5 }}
      className="bg-gradient-to-r from-gray-900/40 to-gray-800/40 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/30 hover:border-cyan-500/50 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-xl`} style={{ backgroundColor: `${color}20`, borderColor: `${color}50` }}>
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{value}{unit}</div>
            <div className="text-sm text-gray-400">{title}</div>
          </div>
        </div>
        {trend && (
          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm ${
            trend > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            <TrendingUp className="w-4 h-4" />
            <span>{trend > 0 ? '+' : ''}{trend}%</span>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="h-full p-8">
      <div className="grid grid-cols-12 gap-6 h-full">
        {/* Header */}
        <div className="col-span-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                QUANTUM METRICS CORE
              </h2>
              <p className="text-cyan-300 text-lg font-mono mt-2">Ultimate Performance Intelligence</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="px-4 py-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-full border border-green-400/30">
                <span className="text-green-400 font-mono text-sm">System: OPTIMAL</span>
              </div>
              <div className="px-4 py-2 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-full border border-purple-400/30">
                <span className="text-purple-400 font-mono text-sm">Quantum: ACTIVE</span>
              </div>
            </div>
          </div>
        </div>

        {/* Circular Metrics */}
        <div className="col-span-8">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <CircularMetric
              value={metrics.quantumLevel}
              max={100}
              label="QUANTUM LEVEL"
              color="#00FFFF"
              icon={Zap}
            />
            <CircularMetric
              value={metrics.processingPower}
              max={100}
              label="PROCESSING POWER"
              color="#8B5CF6"
              icon={Activity}
            />
            <CircularMetric
              value={metrics.neuralEfficiency}
              max={100}
              label="NEURAL EFFICIENCY"
              color="#00FF00"
              icon={Target}
            />
            <CircularMetric
              value={metrics.systemLoad}
              max={100}
              label="SYSTEM LOAD"
              color="#FF4500"
              icon={Gauge}
            />
          </div>

          {/* Performance Matrix */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20 backdrop-blur-xl rounded-3xl border border-cyan-500/30 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-cyan-400">PERFORMANCE MATRIX</h3>
              <div className="flex space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              </div>
            </div>

            {/* Real-time Performance Graph */}
            <div className="h-48 bg-black/20 rounded-2xl p-4 relative overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 1000 180">
                <defs>
                  <linearGradient id="performanceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#00FFFF" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#8B5CF6" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#FF0080" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                
                {/* Quantum Level */}
                <motion.path
                  d="M0,150 Q250,60 500,80 T1000,40"
                  stroke="url(#performanceGradient)"
                  strokeWidth="4"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 3, repeat: Infinity }}
                />
                
                {/* Processing Power */}
                <motion.path
                  d="M0,130 Q200,70 400,90 T1000,50"
                  stroke="#8B5CF6"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray="8,4"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                />
                
                {/* Neural Efficiency */}
                <motion.path
                  d="M0,140 Q300,50 600,70 T1000,30"
                  stroke="#00FF00"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="12,6"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 3.5, repeat: Infinity, delay: 1 }}
                />
              </svg>
              
              {/* Floating Quantum Particles */}
              <div className="absolute inset-0 overflow-hidden">
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 bg-cyan-400 rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    animate={{
                      x: [0, Math.random() * 100 - 50],
                      y: [0, Math.random() * 100 - 50],
                      opacity: [0, 1, 0],
                      scale: [0, 1, 0],
                    }}
                    transition={{
                      duration: 3 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 2,
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Performance Indicators */}
            <div className="grid grid-cols-4 gap-4 mt-6">
              <div className="text-center">
                <div className="text-lg font-bold text-cyan-400">{metrics.quantumLevel.toFixed(1)}%</div>
                <div className="text-xs text-gray-400">Quantum Level</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-400">{metrics.processingPower.toFixed(1)}%</div>
                <div className="text-xs text-gray-400">Processing</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-400">{metrics.neuralEfficiency.toFixed(1)}%</div>
                <div className="text-xs text-gray-400">Neural</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-400">{metrics.systemLoad.toFixed(1)}%</div>
                <div className="text-xs text-gray-400">Load</div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Linear Metrics Panel */}
        <div className="col-span-4 space-y-4">
          <LinearMetric
            title="Revenue Intelligence"
            value={`$${(metrics.revenue / 1000000).toFixed(1)}`}
            unit="M"
            color="#00FF00"
            trend={18.5}
            icon={DollarSign}
          />
          
          <LinearMetric
            title="Customer Network"
            value={metrics.customers.toLocaleString()}
            unit=""
            color="#00FFFF"
            trend={12.3}
            icon={Users}
          />
          
          <LinearMetric
            title="Product Matrix"
            value={metrics.products}
            unit=""
            color="#8B5CF6"
            trend={8.7}
            icon={Package}
          />
          
          <LinearMetric
            title="System Performance"
            value={metrics.performance.toFixed(1)}
            unit="%"
            color="#FF4500"
            trend={15.2}
            icon={Gauge}
          />

          {/* Quantum Controls */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl border border-purple-400/30 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-purple-400">QUANTUM CONTROLS</h3>
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <div className="space-y-3">
              <button className="w-full p-3 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-400/30 rounded-lg text-cyan-400 hover:bg-cyan-600/30 transition-all">
                <div className="flex items-center justify-center space-x-2">
                  <Activity className="w-4 h-4" />
                  <span className="text-sm font-mono">BOOST QUANTUM</span>
                </div>
              </button>
              <button className="w-full p-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-400/30 rounded-lg text-green-400 hover:bg-green-600/30 transition-all">
                <div className="flex items-center justify-center space-x-2">
                  <Target className="w-4 h-4" />
                  <span className="text-sm font-mono">OPTIMIZE NEURAL</span>
                </div>
              </button>
              <button className="w-full p-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-400/30 rounded-lg text-purple-400 hover:bg-purple-600/30 transition-all">
                <div className="flex items-center justify-center space-x-2">
                  <Gauge className="w-4 h-4" />
                  <span className="text-sm font-mono">SYSTEM TUNE</span>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}