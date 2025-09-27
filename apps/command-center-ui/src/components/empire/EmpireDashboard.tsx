// ROYAL EQUIPS QUANTUM COMMAND CENTER - ENTERPRISE QUANTUM LEVEL
// Even Bill Gates doesn't have this level of sophistication
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Text3D, Stars } from '@react-three/drei';
import { 
  Zap, Brain, Cpu, Activity, Shield, Layers, 
  Command, Network, Database, Rocket, Eye, 
  Gauge, Target, Lightning, Orbit, Atom
} from 'lucide-react';
import QuantumAgentNetwork from './QuantumAgentNetwork';
import IntelligenceCenter from './IntelligenceCenter';
import QuantumProductMatrix from './QuantumProductMatrix';
import NeuralAnalytics from './NeuralAnalytics';
import QuantumMetrics from './QuantumMetrics';
import HolographicInterface from './HolographicInterface';
import { useEmpireStore } from '@/store/empire-store';

type QuantumView = 'command' | 'neural' | 'quantum' | 'intelligence' | 'matrix' | 'analytics' | 'holographic';

const quantumModules = [
  { 
    id: 'command', 
    label: 'COMMAND', 
    icon: Command, 
    description: 'Quantum Command Operations',
    color: '#FF0080'
  },
  { 
    id: 'neural', 
    label: 'NEURAL', 
    icon: Brain, 
    description: 'AI Neural Networks',
    color: '#00FFFF'
  },
  { 
    id: 'quantum', 
    label: 'QUANTUM', 
    icon: Atom, 
    description: 'Quantum Processing Core',
    color: '#8A2BE2'
  },
  { 
    id: 'intelligence', 
    label: 'INTELLIGENCE', 
    icon: Eye, 
    description: 'Business Intelligence Matrix',
    color: '#00FF00'
  },
  { 
    id: 'matrix', 
    label: 'MATRIX', 
    icon: Network, 
    description: 'Product Reality Matrix',
    color: '#FF4500'
  },
  { 
    id: 'analytics', 
    label: 'ANALYTICS', 
    icon: Activity, 
    description: 'Quantum Analytics Engine',
    color: '#FFD700'
  },
  { 
    id: 'holographic', 
    label: 'HOLO', 
    icon: Layers, 
    description: 'Holographic Interface',
    color: '#FF1493'
  },
];

export default function EmpireDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentView, setCurrentView] = useState<QuantumView>('command');
  const [quantumEnergy, setQuantumEnergy] = useState(100);
  const [neuralActivity, setNeuralActivity] = useState(85);
  const { metrics, agents, isConnected } = useEmpireStore();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setQuantumEnergy(prev => Math.min(100, prev + Math.random() * 2 - 1));
      setNeuralActivity(prev => Math.max(60, Math.min(100, prev + Math.random() * 10 - 5)));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const renderQuantumView = () => {
    switch (currentView) {
      case 'neural':
        return <QuantumAgentNetwork />;
      case 'quantum':
        return <IntelligenceCenter />;
      case 'intelligence':
        return <NeuralAnalytics />;
      case 'matrix':
        return <QuantumProductMatrix />;
      case 'analytics':
        return <QuantumMetrics />;
      case 'holographic':
        return <HolographicInterface />;
      case 'command':
      default:
        return (
          <div className="relative h-full">
            {/* 3D Quantum Scene Background */}
            <div className="absolute inset-0 opacity-20">
              <Canvas>
                <PerspectiveCamera makeDefault position={[0, 0, 10]} />
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <Stars radius={300} depth={60} count={20000} factor={7} saturation={0} fade />
                <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.5} />
                <Environment preset="night" />
              </Canvas>
            </div>

            {/* Quantum Command Grid */}
            <div className="relative z-10 p-8 h-full">
              <div className="grid grid-cols-3 gap-6 h-full">
                {/* Central Command Matrix */}
                <div className="col-span-2 row-span-2">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-full bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-pink-900/20 backdrop-blur-xl rounded-3xl border border-cyan-500/30 p-6 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5 animate-pulse" />
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-6">
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                          QUANTUM COMMAND MATRIX
                        </h2>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-green-400 text-sm font-mono">ONLINE</span>
                          </div>
                          <div className="px-3 py-1 bg-gradient-to-r from-purple-600/20 to-cyan-600/20 rounded-full border border-purple-400/30">
                            <span className="text-xs font-mono text-purple-300">QUANTUM LVL: {quantumEnergy.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Real-time Metrics Grid */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-2xl p-4 border border-green-400/30"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-green-400 text-sm font-mono">REVENUE</p>
                              <p className="text-2xl font-bold text-white">${metrics?.revenue || '1.2M'}</p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-green-400" />
                          </div>
                        </motion.div>

                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-sm rounded-2xl p-4 border border-blue-400/30"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-blue-400 text-sm font-mono">AGENTS</p>
                              <p className="text-2xl font-bold text-white">{agents?.length || 5}</p>
                            </div>
                            <Brain className="w-8 h-8 text-blue-400" />
                          </div>
                        </motion.div>

                        <motion.div 
                          whileHover={{ scale: 1.05 }}
                          className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-2xl p-4 border border-purple-400/30"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-purple-400 text-sm font-mono">NEURAL</p>
                              <p className="text-2xl font-bold text-white">{neuralActivity.toFixed(0)}%</p>
                            </div>
                            <Activity className="w-8 h-8 text-purple-400" />
                          </div>
                        </motion.div>
                      </div>

                      {/* Quantum Operations Console */}
                      <div className="bg-black/20 rounded-2xl p-4 border border-cyan-500/20">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-cyan-400 font-mono text-sm">QUANTUM OPERATIONS</span>
                          <div className="flex space-x-2">
                            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                            <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                          </div>
                        </div>
                        <div className="space-y-2 font-mono text-xs">
                          <div className="text-green-400">[{currentTime.toLocaleTimeString()}] → Quantum processors online</div>
                          <div className="text-blue-400">[{currentTime.toLocaleTimeString()}] → Neural networks synchronized</div>
                          <div className="text-purple-400">[{currentTime.toLocaleTimeString()}] → Intelligence matrix active</div>
                          <div className="text-cyan-400">[{currentTime.toLocaleTimeString()}] → Holographic interface ready</div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Quantum Modules Panel */}
                <div className="space-y-4">
                  {quantumModules.slice(0, 4).map((module, index) => (
                    <motion.button
                      key={module.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.05, x: -5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentView(module.id as QuantumView)}
                      className={`w-full p-4 rounded-2xl border backdrop-blur-xl transition-all duration-300 ${
                        currentView === module.id
                          ? `bg-gradient-to-r from-${module.color}/20 to-${module.color}/10 border-${module.color}/50`
                          : 'bg-gray-900/20 border-gray-700/30 hover:border-cyan-500/50'
                      }`}
                      style={{ backgroundColor: currentView === module.id ? `${module.color}20` : undefined }}
                    >
                      <div className="flex items-center space-x-3">
                        <module.icon className="w-6 h-6" style={{ color: module.color }} />
                        <div className="text-left">
                          <p className="font-bold text-white text-sm">{module.label}</p>
                          <p className="text-xs opacity-70" style={{ color: module.color }}>
                            {module.description}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Additional Quantum Modules */}
                <div className="space-y-4">
                  {quantumModules.slice(4).map((module, index) => (
                    <motion.button
                      key={module.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (index + 4) * 0.1 }}
                      whileHover={{ scale: 1.05, x: -5 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setCurrentView(module.id as QuantumView)}
                      className={`w-full p-4 rounded-2xl border backdrop-blur-xl transition-all duration-300 ${
                        currentView === module.id
                          ? `bg-gradient-to-r from-${module.color}/20 to-${module.color}/10 border-${module.color}/50`
                          : 'bg-gray-900/20 border-gray-700/30 hover:border-cyan-500/50'
                      }`}
                      style={{ backgroundColor: currentView === module.id ? `${module.color}20` : undefined }}
                    >
                      <div className="flex items-center space-x-3">
                        <module.icon className="w-6 h-6" style={{ color: module.color }} />
                        <div className="text-left">
                          <p className="font-bold text-white text-sm">{module.label}</p>
                          <p className="text-xs opacity-70" style={{ color: module.color }}>
                            {module.description}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="h-screen w-full relative overflow-hidden">
      {/* Quantum Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-black">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/10 via-purple-500/5 to-transparent animate-pulse" />
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg,_transparent,_#8b5cf6,_transparent,_#06b6d4,_transparent)] opacity-10 animate-spin" style={{ animationDuration: '30s' }} />
      </div>

      {/* Quantum Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-20 p-6 bg-black/10 backdrop-blur-xl border-b border-cyan-500/20"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 flex items-center justify-center"
            >
              <Rocket className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                ROYAL EQUIPS QUANTUM EMPIRE
              </h1>
              <p className="text-cyan-300 text-sm font-mono">Enterprise Quantum Command Center • Level: ULTIMATE</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-mono text-sm">SECURE</span>
            </div>
            <div className="flex items-center space-x-2">
              <Lightning className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-mono text-sm">{quantumEnergy.toFixed(1)}% POWER</span>
            </div>
            <div className="px-4 py-2 bg-gradient-to-r from-purple-600/20 to-cyan-600/20 rounded-full border border-purple-400/30">
              <span className="text-white font-mono text-sm">
                {currentTime.toLocaleTimeString()} UTC
              </span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Quantum Interface */}
      <div className="relative z-10 h-[calc(100vh-100px)]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            <Suspense 
              fallback={
                <div className="h-full flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full"
                  />
                </div>
              }
            >
              {renderQuantumView()}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Quantum Status Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-black/20 backdrop-blur-xl border-t border-cyan-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-sm font-mono">Quantum Core: ACTIVE</span>
            </div>
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 text-sm font-mono">Neural Networks: SYNCHRONIZED</span>
            </div>
            <div className="flex items-center space-x-2">
              <Orbit className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 text-sm font-mono">Holographic Interface: READY</span>
            </div>
          </div>
          
          <div className="text-xs font-mono text-gray-400">
            Build: QUANTUM-v{process.env.REACT_APP_VERSION || '3.0.0'} • Status: OPERATIONAL
          </div>
        </div>
      </div>
    </div>
  );
}