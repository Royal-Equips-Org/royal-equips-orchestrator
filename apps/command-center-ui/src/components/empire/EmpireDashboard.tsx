// Royal Equips Empire Command Center - Main Dashboard
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { 
  Activity, 
  Globe, 
  Zap, 
  Target, 
  Users, 
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

import { useEmpireStore, useEmpireMetrics, useActiveAgents, useCriticalAlerts } from '@/store/empire-store';
import { cn } from '@/lib/utils';
import EmpireVisualization3D from './EmpireVisualization3D';
import AgentNetworkGrid from './AgentNetworkGrid';
import RevenueTracker from './RevenueTracker';
import ProductOpportunityCards from './ProductOpportunityCards';
import AIChatInterface from './AIChatInterface';
import EmergencyControls from './EmergencyControls';

export default function EmpireDashboard() {
  const metrics = useEmpireMetrics();
  const activeAgents = useActiveAgents();
  const criticalAlerts = useCriticalAlerts();
  const { 
    connectionStatus
  } = useEmpireStore();

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="scanner-line absolute w-full h-px bg-gradient-to-r from-transparent via-hologram to-transparent opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-black to-purple-900/10"></div>
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-panel p-6 mb-6 relative z-10"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center"
            >
              👑
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold hologram-text mb-1">
                ROYAL EQUIPS EMPIRE COMMAND CENTER
              </h1>
              <p className="text-sm opacity-70">
                Autonomous E-commerce Empire • {currentTime.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className={cn(
              "flex items-center space-x-2 px-3 py-1 rounded-full text-xs",
              connectionStatus === 'connected' && "bg-green-500/20 text-green-400",
              connectionStatus === 'disconnected' && "bg-red-500/20 text-red-400",
              connectionStatus === 'reconnecting' && "bg-yellow-500/20 text-yellow-400"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                connectionStatus === 'connected' && "bg-green-400",
                connectionStatus === 'disconnected' && "bg-red-400",
                connectionStatus === 'reconnecting' && "bg-yellow-400 animate-pulse"
              )} />
              <span className="uppercase font-medium">{connectionStatus}</span>
            </div>

            {/* Active Agents */}
            <div className="text-right">
              <div className="text-xl font-bold text-hologram">
                {activeAgents.length}
              </div>
              <div className="text-xs opacity-70">Active Agents</div>
            </div>
          </div>
        </div>

        {/* Alert Bar */}
        <AnimatePresence>
          {criticalAlerts.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center space-x-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-red-200">
                {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? 's' : ''} Require Attention
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-6 px-6 pb-6">
        {/* Left Column - 3D Visualization */}
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="col-span-12 lg:col-span-6 h-96"
        >
          <div className="glass-panel h-full p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Globe className="w-5 h-5 mr-2 text-hologram" />
              Empire Network Visualization
            </h3>
            <div className="h-full">
              <Canvas camera={{ position: [0, 0, 8], fov: 60 }}>
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
                <ambientLight intensity={0.3} />
                <pointLight position={[10, 10, 10]} />
                <EmpireVisualization3D />
                <OrbitControls enablePan={false} enableZoom={true} />
              </Canvas>
            </div>
          </div>
        </motion.div>

        {/* Right Column - Metrics */}
        <motion.div 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="col-span-12 lg:col-span-6 space-y-4"
        >
          {/* Revenue Tracker */}
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Target className="w-5 h-5 mr-2 text-yellow-400" />
              Revenue Progress to $100M
            </h3>
            <RevenueTracker />
          </div>

          {/* Empire Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-4">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-5 h-5 text-green-400" />
                <span className="text-2xl font-bold text-green-400">
                  {metrics?.automation_level || 0}%
                </span>
              </div>
              <p className="text-sm opacity-70">Automation Level</p>
            </div>

            <div className="glass-panel p-4">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <span className="text-2xl font-bold text-blue-400">
                  {metrics?.daily_discoveries || 0}
                </span>
              </div>
              <p className="text-sm opacity-70">Daily Discoveries</p>
            </div>
          </div>
        </motion.div>

        {/* Agent Network Grid */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="col-span-12 lg:col-span-8"
        >
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-purple-400" />
              Agent Network Status
            </h3>
            <AgentNetworkGrid />
          </div>
        </motion.div>

        {/* Emergency Controls */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="col-span-12 lg:col-span-4"
        >
          <div className="glass-panel p-6 h-full">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-red-400" />
              Empire Controls
            </h3>
            <EmergencyControls />
          </div>
        </motion.div>

        {/* Product Opportunities */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="col-span-12"
        >
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              💎 Product Opportunities
            </h3>
            <ProductOpportunityCards />
          </div>
        </motion.div>

        {/* AI Chat Interface */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="col-span-12"
        >
          <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              🤖 AI Chat Interface
            </h3>
            <AIChatInterface />
          </div>
        </motion.div>
      </div>
    </div>
  );
}