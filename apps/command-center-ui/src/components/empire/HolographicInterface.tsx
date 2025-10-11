// HOLOGRAPHIC INTERFACE - ULTIMATE 3D QUANTUM EXPERIENCE
import { motion } from 'framer-motion';
import { useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Text3D, Sphere, Box, Torus, Float, Stars, Html } from '@react-three/drei';
import { Layers, Eye, Zap, Orbit, Atom, Shield, Brain } from 'lucide-react';
import * as THREE from 'three';

function HolographicSphere({ position, color, data }: any) {
  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <group position={position}>
        <Sphere args={[0.8]} position={[0, 0, 0]}>
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.3}
            transparent
            opacity={0.7}
            wireframe={false}
          />
        </Sphere>
        <Html distanceFactor={15} position={[0, 1.5, 0]}>
          <div className="bg-black/80 backdrop-blur-sm rounded-lg p-2 text-xs text-white font-mono border border-cyan-500/30">
            <div className="text-cyan-400">{data.title}</div>
            <div className="text-white">{data.value}</div>
          </div>
        </Html>
      </group>
    </Float>
  );
}

function QuantumTorus({ position, color }: any) {
  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1}>
      <Torus args={[2, 0.3, 16, 32]} position={position} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          transparent
          opacity={0.6}
          wireframe={true}
        />
      </Torus>
    </Float>
  );
}

function DataCube({ position, data }: any) {
  return (
    <Float speed={1} rotationIntensity={2} floatIntensity={1.5}>
      <group position={position}>
        <Box args={[1, 1, 1]}>
          <meshStandardMaterial
            color="#8B5CF6"
            emissive="#8B5CF6"
            emissiveIntensity={0.2}
            transparent
            opacity={0.8}
            wireframe={true}
          />
        </Box>
        <Text3D
          font="/fonts/helvetiker_regular.typeface.json"
          size={0.15}
          height={0.02}
          position={[0, 1.2, 0]}
        >
          {data.label}
          <meshStandardMaterial color="#FFFFFF" />
        </Text3D>
      </group>
    </Float>
  );
}

export default function HolographicInterface() {
  const [holographicData] = useState([
    { id: 1, title: 'REVENUE', value: '$2.4M', position: [3, 2, 0], color: '#00FF00' },
    { id: 2, title: 'CUSTOMERS', value: '45.6K', position: [-3, 1, 2], color: '#00FFFF' },
    { id: 3, title: 'PRODUCTS', value: '99', position: [0, -2, -3], color: '#FF0080' },
    { id: 4, title: 'AGENTS', value: '5', position: [2, 0, 3], color: '#FFD700' },
    { id: 5, title: 'QUANTUM', value: '96.7%', position: [-2, 2, -1], color: '#8B5CF6' },
  ]);

  const [cubeData] = useState([
    { label: 'AI', position: [4, -1, 1] },
    { label: 'ML', position: [-4, 0, -2] },
    { label: 'QC', position: [1, 3, -1] },
    { label: 'NN', position: [-1, -3, 2] },
  ]);

  const [holographicLevel, setHolographicLevel] = useState(94.2);
  const [dimensionalStability, setDimensionalStability] = useState(97.8);

  useEffect(() => {
    const interval = setInterval(() => {
      setHolographicLevel(prev => Math.max(85, Math.min(100, prev + Math.random() * 6 - 3)));
      setDimensionalStability(prev => Math.max(90, Math.min(100, prev + Math.random() * 4 - 2)));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-full p-8">
      <div className="grid grid-cols-12 gap-6 h-full">
        {/* Main Holographic Display */}
        <div className="col-span-9 bg-gradient-to-br from-purple-900/20 via-blue-900/20 to-cyan-900/20 backdrop-blur-xl rounded-3xl border border-cyan-500/30 p-6 relative overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              HOLOGRAPHIC INTERFACE
            </h2>
            <div className="flex items-center space-x-4">
              <div className="px-4 py-2 bg-green-500/20 rounded-full border border-green-400/30">
                <span className="text-sm font-mono text-green-300">HOLO: {holographicLevel.toFixed(1)}%</span>
              </div>
              <div className="px-4 py-2 bg-purple-500/20 rounded-full border border-purple-400/30">
                <span className="text-sm font-mono text-purple-300">DIM: {dimensionalStability.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* 3D Holographic Scene */}
          <div className="h-[500px] rounded-2xl overflow-hidden bg-black/20 border border-cyan-500/20">
            <Canvas camera={{ position: [8, 5, 8], fov: 60 }}>
              <ambientLight intensity={0.3} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8B5CF6" />
              <spotLight position={[0, 15, 0]} intensity={1} color="#00FFFF" />

              {/* Stars Background */}
              <Stars radius={300} depth={60} count={5000} factor={4} saturation={0} fade />

              {/* Central Quantum Core */}
              <Float speed={0.5} rotationIntensity={1} floatIntensity={0.5}>
                <Sphere args={[1.5]} position={[0, 0, 0]}>
                  <meshStandardMaterial
                    color="#00FFFF"
                    emissive="#00FFFF"
                    emissiveIntensity={0.4}
                    transparent
                    opacity={0.3}
                    wireframe={false}
                  />
                </Sphere>
              </Float>

              {/* Orbital Rings */}
              <QuantumTorus position={[0, 0, 0]} color="#8B5CF6" />
              <QuantumTorus position={[0, 0, 0]} color="#FF0080" />
              <QuantumTorus position={[0, 0, 0]} color="#00FF00" />

              {/* Data Spheres */}
              {holographicData.map(item => (
                <HolographicSphere
                  key={item.id}
                  position={item.position}
                  color={item.color}
                  data={item}
                />
              ))}

              {/* Data Cubes */}
              {cubeData.map((cube, index) => (
                <DataCube
                  key={index}
                  position={cube.position}
                  data={cube}
                />
              ))}

              {/* Environment */}
              <Environment preset="night" />
              <OrbitControls 
                enableZoom={true} 
                autoRotate 
                autoRotateSpeed={0.5}
                maxDistance={20}
                minDistance={5}
              />
            </Canvas>
          </div>

          {/* Holographic Controls */}
          <div className="mt-6 grid grid-cols-4 gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-400/30 rounded-xl text-cyan-400 hover:bg-cyan-600/30 transition-all"
            >
              <div className="flex items-center justify-center space-x-2">
                <Eye className="w-5 h-5" />
                <span className="text-sm font-mono">FOCUS</span>
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-400/30 rounded-xl text-purple-400 hover:bg-purple-600/30 transition-all"
            >
              <div className="flex items-center justify-center space-x-2">
                <Orbit className="w-5 h-5" />
                <span className="text-sm font-mono">ROTATE</span>
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-400/30 rounded-xl text-green-400 hover:bg-green-600/30 transition-all"
            >
              <div className="flex items-center justify-center space-x-2">
                <Zap className="w-5 h-5" />
                <span className="text-sm font-mono">ENHANCE</span>
              </div>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-3 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-400/30 rounded-xl text-yellow-400 hover:bg-yellow-600/30 transition-all"
            >
              <div className="flex items-center justify-center space-x-2">
                <Atom className="w-5 h-5" />
                <span className="text-sm font-mono">QUANTUM</span>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Holographic Controls Panel */}
        <div className="col-span-3 space-y-6">
          {/* Holographic Status */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-xl rounded-2xl border border-cyan-400/30 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-cyan-400">HOLO STATUS</h3>
              <Layers className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-300">Holographic Level</span>
                  <span className="text-sm text-cyan-400">{holographicLevel.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div 
                    className="bg-gradient-to-r from-cyan-400 to-blue-400 h-2 rounded-full"
                    style={{ width: `${holographicLevel}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-300">Dimensional Stability</span>
                  <span className="text-sm text-purple-400">{dimensionalStability.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <motion.div 
                    className="bg-gradient-to-r from-purple-400 to-pink-400 h-2 rounded-full"
                    style={{ width: `${dimensionalStability}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Dimensional Controls */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl border border-purple-400/30 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-purple-400">DIMENSIONS</h3>
              <Atom className="w-6 h-6 text-purple-400" />
            </div>
            <div className="space-y-3">
              <button className="w-full p-3 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border border-cyan-400/30 rounded-lg text-cyan-400 hover:bg-cyan-600/30 transition-all">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-sm font-mono">X-DIMENSION</span>
                </div>
              </button>
              <button className="w-full p-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border border-green-400/30 rounded-lg text-green-400 hover:bg-green-600/30 transition-all">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-sm font-mono">Y-DIMENSION</span>
                </div>
              </button>
              <button className="w-full p-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-400/30 rounded-lg text-purple-400 hover:bg-purple-600/30 transition-all">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-sm font-mono">Z-DIMENSION</span>
                </div>
              </button>
              <button className="w-full p-3 bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border border-yellow-400/30 rounded-lg text-yellow-400 hover:bg-yellow-600/30 transition-all">
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-sm font-mono">Q-DIMENSION</span>
                </div>
              </button>
            </div>
          </motion.div>

          {/* Quantum Parameters */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-2xl border border-green-400/30 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-green-400">QUANTUM PARAMS</h3>
              <Shield className="w-6 h-6 text-green-400" />
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Coherence</span>
                <span className="text-green-400 font-mono">98.7%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Entanglement</span>
                <span className="text-cyan-400 font-mono">94.3%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Superposition</span>
                <span className="text-purple-400 font-mono">91.8%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Tunneling</span>
                <span className="text-yellow-400 font-mono">96.1%</span>
              </div>
            </div>
          </motion.div>

          {/* Neural Interface */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-orange-500/10 to-red-500/10 backdrop-blur-xl rounded-2xl border border-orange-400/30 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-orange-400">NEURAL LINK</h3>
              <Brain className="w-6 h-6 text-orange-400" />
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-black/20 rounded-lg border border-green-400/20">
                <div className="text-sm text-white mb-1">Neural Bridge</div>
                <div className="text-xs text-green-400">Connection: STABLE</div>
              </div>
              <div className="p-3 bg-black/20 rounded-lg border border-cyan-400/20">
                <div className="text-sm text-white mb-1">Consciousness Link</div>
                <div className="text-xs text-cyan-400">Sync: 96.4%</div>
              </div>
              <div className="p-3 bg-black/20 rounded-lg border border-purple-400/20">
                <div className="text-sm text-white mb-1">Thought Interface</div>
                <div className="text-xs text-purple-400">Bandwidth: OPTIMAL</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}