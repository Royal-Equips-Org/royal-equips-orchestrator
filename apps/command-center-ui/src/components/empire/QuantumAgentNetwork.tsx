// QUANTUM AGENT NETWORK - ENTERPRISE NEURAL INTELLIGENCE
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text3D, Sphere, Line } from '@react-three/drei';
import { Brain, Cpu, Network, Zap, Activity, Target } from 'lucide-react';
import { useEmpireStore } from '@/store/empire-store';

function QuantumAgentNode({ position, agent, onClick }: any) {
  return (
    <group position={position} onClick={onClick}>
      <Sphere args={[0.5]} position={[0, 0, 0]}>
        <meshStandardMaterial
          color={agent.status === 'active' ? '#00FF00' : '#FF4444'}
          emissive={agent.status === 'active' ? '#004400' : '#440000'}
          emissiveIntensity={0.3}
        />
      </Sphere>
      <Text3D
        font="/fonts/helvetiker_regular.typeface.json"
        size={0.2}
        height={0.02}
        position={[0, 0.8, 0]}
      >
        {agent.name}
        <meshStandardMaterial color="#FFFFFF" />
      </Text3D>
    </group>
  );
}

export default function QuantumAgentNetwork() {
  const { agents } = useEmpireStore();
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [neuralActivity, setNeuralActivity] = useState(92);

  useEffect(() => {
    const interval = setInterval(() => {
      setNeuralActivity(prev => Math.max(70, Math.min(100, prev + Math.random() * 10 - 5)));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full p-8">
      <div className="grid grid-cols-3 gap-6 h-full">
        {/* 3D Neural Network Visualization */}
        <div className="col-span-2 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20 backdrop-blur-xl rounded-3xl border border-cyan-500/30 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              QUANTUM NEURAL NETWORK
            </h2>
            <div className="flex items-center space-x-4">
              <div className="px-3 py-1 bg-green-500/20 rounded-full border border-green-400/30">
                <span className="text-xs font-mono text-green-300">NEURAL: {neuralActivity.toFixed(0)}%</span>
              </div>
            </div>
          </div>

          <div className="h-[500px] rounded-2xl overflow-hidden bg-black/20">
            <Canvas camera={{ position: [0, 0, 10] }}>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} />
              <OrbitControls enableZoom={true} autoRotate autoRotateSpeed={1} />
              
              {agents.map((agent, index) => (
                <QuantumAgentNode
                  key={agent.id}
                  position={[
                    Math.cos(index * 2 * Math.PI / agents.length) * 3,
                    Math.sin(index * 2 * Math.PI / agents.length) * 3,
                    0
                  ]}
                  agent={agent}
                  onClick={() => setSelectedAgent(agent)}
                />
              ))}
            </Canvas>
          </div>
        </div>

        {/* Agent Control Panel */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-2xl border border-green-400/30 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-green-400">ACTIVE AGENTS</h3>
              <Brain className="w-6 h-6 text-green-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-2">
              {agents.filter(a => a.status === 'active').length}/{agents.length}
            </div>
            <div className="text-sm text-green-300">Neural networks synchronized</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-2xl border border-blue-400/30 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-blue-400">PROCESSING POWER</h3>
              <Cpu className="w-6 h-6 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white mb-2">{neuralActivity.toFixed(0)}%</div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-400 to-cyan-400 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${neuralActivity}%` }}
              />
            </div>
          </motion.div>

          {/* Agent Details */}
          <div className="space-y-3">
            {agents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.1 }}
                whileHover={{ scale: 1.02, x: -5 }}
                className={`p-4 rounded-xl border backdrop-blur-xl transition-all cursor-pointer ${
                  selectedAgent?.id === agent.id 
                    ? 'bg-purple-500/20 border-purple-400/50' 
                    : 'bg-gray-900/20 border-gray-700/30 hover:border-cyan-500/50'
                }`}
                onClick={() => setSelectedAgent(agent)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm">{agent.name}</span>
                  <div className={`w-3 h-3 rounded-full ${
                    agent.status === 'active' ? 'bg-green-400 animate-pulse' : 
                    agent.status === 'idle' ? 'bg-yellow-400' : 'bg-red-400'
                  }`} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{agent.type}</span>
                  <span className="text-cyan-400 font-mono">
                    {agent.last_execution ? new Date(agent.last_execution).toLocaleTimeString() : '--:--:--'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quantum Operations */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl border border-purple-400/30 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-purple-400">QUANTUM OPS</h3>
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <div className="space-y-3">
              <button className="w-full p-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-400/30 rounded-lg text-green-400 hover:bg-green-600/30 transition-all">
                <div className="flex items-center justify-center space-x-2">
                  <Target className="w-4 h-4" />
                  <span className="text-sm font-mono">DEPLOY ALL</span>
                </div>
              </button>
              <button className="w-full p-3 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-400/30 rounded-lg text-yellow-400 hover:bg-yellow-600/30 transition-all">
                <div className="flex items-center justify-center space-x-2">
                  <Activity className="w-4 h-4" />
                  <span className="text-sm font-mono">SYNC NEURAL</span>
                </div>
              </button>
              <button className="w-full p-3 bg-gradient-to-r from-red-600/20 to-pink-600/20 border border-red-400/30 rounded-lg text-red-400 hover:bg-red-600/30 transition-all">
                <div className="flex items-center justify-center space-x-2">
                  <Network className="w-4 h-4" />
                  <span className="text-sm font-mono">EMERGENCY STOP</span>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}