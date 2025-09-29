import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Volume2, 
  VolumeX, 
  Settings, 
  Maximize2,
  Minimize2,
  Power,
  Wifi,
  Battery,
  Shield,
  Activity,
  Clock,
  Zap
} from 'lucide-react';
import HolographicAIAvatar from './HolographicAIAvatar';
import WorkstationArray from './WorkstationPanel';
import { useEmpireStore } from '../../store/empire-store';

// Ambient sound control
interface AmbientSoundProps {
  enabled: boolean;
  onToggle: () => void;
}

const AmbientSoundControl: React.FC<AmbientSoundProps> = ({ enabled, onToggle }) => (
  <motion.button
    onClick={onToggle}
    className="flex items-center space-x-2 px-3 py-2 bg-black/60 border border-cyan-500/30 rounded-lg hover:border-cyan-400/50 transition-colors"
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
  >
    {enabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
    <span className="text-xs font-mono text-white">AMBIENT</span>
  </motion.button>
);

// System status indicator
const SystemStatus = () => {
  const { isConnected, agents } = useEmpireStore();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemLoad, setSystemLoad] = useState(65);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setSystemLoad(prev => Math.max(45, Math.min(95, prev + (Math.random() - 0.5) * 5)));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30">
      <motion.div
        className="bg-black/80 backdrop-blur-md border border-cyan-500/30 rounded-xl px-6 py-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex items-center space-x-8">
          {/* Time */}
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-white font-mono text-sm">
              {currentTime.toLocaleTimeString()}
            </span>
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <Wifi className={`w-4 h-4 ${isConnected ? 'text-green-400' : 'text-red-400'}`} />
            <span className={`text-xs font-mono ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>

          {/* System Load */}
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-mono text-white">
              CPU: {systemLoad.toFixed(0)}%
            </span>
            <div className="w-16 h-2 bg-black/40 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 transition-all duration-1000"
                style={{ width: `${systemLoad}%` }}
              />
            </div>
          </div>

          {/* Active Agents */}
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-mono text-white">
              AGENTS: {agents?.length || 0}
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Control panel
const ControlPanel = ({ onFullscreen, isFullscreen, ambientEnabled, onAmbientToggle }: any) => (
  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
    <motion.div
      className="flex items-center space-x-4 bg-black/80 backdrop-blur-md border border-cyan-500/30 rounded-xl px-6 py-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      <AmbientSoundControl enabled={ambientEnabled} onToggle={onAmbientToggle} />
      
      <motion.button
        onClick={onFullscreen}
        className="flex items-center space-x-2 px-3 py-2 bg-black/60 border border-cyan-500/30 rounded-lg hover:border-cyan-400/50 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isFullscreen ? <Minimize2 className="w-4 h-4 text-cyan-400" /> : <Maximize2 className="w-4 h-4 text-cyan-400" />}
        <span className="text-xs font-mono text-white">FULLSCREEN</span>
      </motion.button>

      <motion.button
        className="flex items-center space-x-2 px-3 py-2 bg-black/60 border border-green-500/30 rounded-lg hover:border-green-400/50 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Power className="w-4 h-4 text-green-400" />
        <span className="text-xs font-mono text-white">POWER</span>
      </motion.button>
    </motion.div>
  </div>
);

// Neural network background effect
const NeuralNetworkBackground = () => {
  const [nodes, setNodes] = useState<Array<{ x: number; y: number; id: number }>>([]);

  useEffect(() => {
    const generateNodes = () => {
      const newNodes = Array.from({ length: 20 }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        id: i
      }));
      setNodes(newNodes);
    };

    generateNodes();
    const interval = setInterval(generateNodes, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <defs>
          <linearGradient id="connection-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#05f4ff', stopOpacity: 0.6 }} />
            <stop offset="100%" style={{ stopColor: '#ff1fbf', stopOpacity: 0.2 }} />
          </linearGradient>
        </defs>
        
        {/* Draw connections between nearby nodes */}
        {nodes.map((node, i) => 
          nodes.slice(i + 1).map((otherNode, j) => {
            const distance = Math.sqrt(
              Math.pow(node.x - otherNode.x, 2) + Math.pow(node.y - otherNode.y, 2)
            );
            
            if (distance < 30) {
              return (
                <motion.line
                  key={`${node.id}-${otherNode.id}`}
                  x1={`${node.x}%`}
                  y1={`${node.y}%`}
                  x2={`${otherNode.x}%`}
                  y2={`${otherNode.y}%`}
                  stroke="url(#connection-gradient)"
                  strokeWidth="1"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.6 }}
                  transition={{ duration: 2, ease: "easeInOut" }}
                />
              );
            }
            return null;
          })
        )}
        
        {/* Draw nodes */}
        {nodes.map((node) => (
          <motion.circle
            key={node.id}
            cx={`${node.x}%`}
            cy={`${node.y}%`}
            r="2"
            fill="#05f4ff"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.8 }}
            transition={{ duration: 0.5, delay: node.id * 0.1 }}
          >
            <animate
              attributeName="r"
              values="2;4;2"
              dur="3s"
              repeatCount="indefinite"
            />
          </motion.circle>
        ))}
      </svg>
    </div>
  );
};

// Alert system
const AlertSystem = () => {
  const [alerts, setAlerts] = useState<Array<{ id: string; message: string; type: 'info' | 'warning' | 'error' }>>([]);

  useEffect(() => {
    const alertMessages = [
      { message: 'AI Systems Online', type: 'info' as const },
      { message: 'Neural Network Optimized', type: 'info' as const },
      { message: 'Quantum Processors Synchronized', type: 'info' as const },
      { message: 'High Network Activity Detected', type: 'warning' as const },
      { message: 'All Systems Operational', type: 'info' as const }
    ];

    const interval = setInterval(() => {
      const randomAlert = alertMessages[Math.floor(Math.random() * alertMessages.length)];
      const newAlert = {
        id: Date.now().toString(),
        ...randomAlert
      };

      setAlerts(prev => [...prev.slice(-2), newAlert]);

      // Remove alert after 5 seconds
      setTimeout(() => {
        setAlerts(prev => prev.filter(alert => alert.id !== newAlert.id));
      }, 5000);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-20 right-4 z-30 space-y-2">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            className={`
              px-4 py-2 rounded-lg border backdrop-blur-md max-w-xs
              ${alert.type === 'error' ? 'bg-red-900/20 border-red-500/30 text-red-300' :
                alert.type === 'warning' ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300' :
                'bg-blue-900/20 border-blue-500/30 text-blue-300'}
            `}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                alert.type === 'error' ? 'bg-red-400' :
                alert.type === 'warning' ? 'bg-yellow-400' :
                'bg-blue-400'
              } animate-pulse`} />
              <span className="text-xs font-mono">{alert.message}</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Main Futuristic Command Center Component
export default function FuturisticCommandCenter() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ambientEnabled, setAmbientEnabled] = useState(false);
  const [aiStatus, setAiStatus] = useState('initializing');

  const handleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const handleKeyboardShortcuts = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'F11':
        event.preventDefault();
        handleFullscreen();
        break;
      case 'Escape':
        if (isFullscreen) {
          setIsFullscreen(false);
        }
        break;
      case 'm':
      case 'M':
        if (event.ctrlKey) {
          event.preventDefault();
          setAmbientEnabled(!ambientEnabled);
        }
        break;
    }
  }, [handleFullscreen, isFullscreen, ambientEnabled]);

  useEffect(() => {
    // Initialize AI status
    setTimeout(() => setAiStatus('online'), 2000);
    
    // Add keyboard shortcuts
    window.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Handle fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcuts);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [handleKeyboardShortcuts]);

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden">
      {/* Neural network background */}
      <NeuralNetworkBackground />
      
      {/* Ambient background effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-radial from-cyan-500/5 via-transparent to-transparent animate-pulse" />
        <div className="absolute inset-0 bg-gradient-conic from-cyan-500/10 via-purple-500/10 to-cyan-500/10 animate-spin-slow" />
      </div>

      {/* Grid overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(5, 244, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(5, 244, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* System Status */}
      <SystemStatus />

      {/* Alert System */}
      <AlertSystem />

      {/* Central Holographic AI Avatar */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="w-96 h-96">
          <HolographicAIAvatar />
        </div>
      </div>

      {/* Workstation Panels */}
      <WorkstationArray />

      {/* Control Panel */}
      <ControlPanel
        onFullscreen={handleFullscreen}
        isFullscreen={isFullscreen}
        ambientEnabled={ambientEnabled}
        onAmbientToggle={() => setAmbientEnabled(!ambientEnabled)}
      />

      {/* Initialization overlay */}
      <AnimatePresence>
        {aiStatus === 'initializing' && (
          <motion.div
            className="absolute inset-0 bg-black/90 flex items-center justify-center z-50"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <div className="text-center">
              <motion.div
                className="w-20 h-20 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <motion.h2
                className="text-2xl font-bold text-cyan-400 font-mono mb-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                INITIALIZING AI SYSTEMS
              </motion.h2>
              <motion.p
                className="text-white/60 font-mono"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                Neural networks coming online...
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard shortcuts info */}
      <div className="absolute bottom-4 left-4 z-30">
        <motion.div
          className="bg-black/60 backdrop-blur-md border border-gray-600/30 rounded-lg p-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 3 }}
        >
          <div className="text-xs text-gray-400 font-mono space-y-1">
            <div>F11 - Fullscreen</div>
            <div>Ctrl+M - Toggle Ambient</div>
            <div>ESC - Exit Fullscreen</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}