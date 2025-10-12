import { Suspense, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import HolographicFemaleAI from './HolographicFemaleAI'
import CircularCommandRoom from './CircularCommandRoom'
import { useEmpireStore } from '../../store/empire-store'

interface ExactCommandCenterProps {
  className?: string
}

export default function ExactCommandCenter({ className = '' }: ExactCommandCenterProps) {
  const [aiStatus, setAiStatus] = useState<'idle' | 'active' | 'alert' | 'processing'>('active')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  
  const { isConnected, agents, metrics } = useEmpireStore()

  // Update time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Update AI status based on real business data
  useEffect(() => {
    if (!isConnected) {
      setAiStatus('alert')
    } else if (agents?.some(agent => agent.status === 'active')) {
      setAiStatus('processing')
    } else {
      setAiStatus('active')
    }
  }, [isConnected, agents])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'F11':
          e.preventDefault()
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.()
            setIsFullscreen(true)
          } else {
            document.exitFullscreen?.()
            setIsFullscreen(false)
          }
          break
        case 'Escape':
          if (document.fullscreenElement) {
            e.preventDefault()
            document.exitFullscreen?.()
            setIsFullscreen(false)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  return (
    <div className={`relative w-full h-screen bg-black overflow-hidden ${className}`}>
      {/* Deep space background with subtle pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-blue-950">
        {/* Star field effect */}
        <div className="absolute inset-0 opacity-30">
          {Array.from({ length: 100 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-px h-px bg-cyan-300 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(rgba(0, 204, 255, 0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 204, 255, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px'
            }}
          />
        </div>
      </div>

      {/* Main holographic command center */}
      <div className="absolute inset-0">
        {/* Circular command room with monitors */}
        <CircularCommandRoom />
        
        {/* Central 3D holographic AI */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[800px] h-[800px] pointer-events-auto">
            <Canvas
              camera={{ position: [0, 2, 12], fov: 45 }}
              gl={{ antialias: true, alpha: true }}
            >
              <Suspense fallback={null}>
                <OrbitControls 
                  enablePan={false} 
                  enableZoom={false}
                  enableRotate={true}
                  autoRotate={false}
                  maxPolarAngle={Math.PI / 2}
                  minPolarAngle={Math.PI / 4}
                />
                
                {/* Enhanced lighting for dramatic effect */}
                <ambientLight intensity={0.2} />
                <pointLight 
                  position={[0, 8, 0]} 
                  intensity={2} 
                  color="#00ccff" 
                  distance={20}
                />
                <pointLight 
                  position={[5, 3, 5]} 
                  intensity={1} 
                  color="#0088ff" 
                  distance={15}
                />
                <pointLight 
                  position={[-5, 3, -5]} 
                  intensity={0.8} 
                  color="#0066cc" 
                  distance={15}
                />
                <spotLight
                  position={[0, 15, 0]}
                  angle={0.6}
                  penumbra={0.5}
                  intensity={1.5}
                  color="#00aaff"
                  castShadow
                />
                
                {/* Environment for reflections */}
                <Environment preset="night" />
                
                <HolographicFemaleAI 
                  systemStatus={aiStatus}
                  scale={1.2}
                />
              </Suspense>
            </Canvas>
          </div>
        </div>
      </div>

      {/* Status overlay (minimal, like reference) */}
      <motion.div 
        className="absolute top-4 left-4 right-4 z-50 flex justify-between items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <div className="flex items-center gap-6 text-cyan-400 font-mono text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            <span>NEURAL NET {isConnected ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
          <div>
            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
          </div>
          <div>
            AGENTS: {agents?.filter(a => a.status === 'active').length || 0}
          </div>
          <div>
            THREAT LEVEL: {aiStatus === 'alert' ? 'HIGH' : aiStatus === 'processing' ? 'MEDIUM' : 'LOW'}
          </div>
        </div>
      </motion.div>

      {/* Bottom status bar */}
      <motion.div 
        className="absolute bottom-4 left-4 right-4 z-50 flex justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <div className="bg-black/40 backdrop-blur-sm border border-cyan-400/30 rounded-lg px-6 py-3">
          <div className="flex items-center gap-8 text-cyan-400 font-mono text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <span>CORE: {Math.round((metrics?.automation_level || 65) * 1.2)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>MEM: {Math.round((metrics?.system_uptime || 73) / 100 * 85)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span>NET: {Math.round((metrics?.active_agents || 3) * 30.33)}%</span>
            </div>
            
            <div className="border-l border-cyan-400/30 pl-6 ml-6">
              <span className="text-cyan-300">
                MISSION STATUS: {isConnected ? 'OPERATIONAL' : 'STANDBY'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Keyboard shortcuts hint */}
      <div className="absolute top-4 right-4 text-cyan-400/60 font-mono text-xs">
        F11: FULLSCREEN | ESC: EXIT
      </div>

      {/* Connection lost overlay */}
      <AnimatePresence>
        {!isConnected && (
          <motion.div
            className="absolute inset-0 bg-red-900/20 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <motion.div 
                className="text-red-400 text-3xl font-mono mb-4"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                CONNECTION LOST
              </motion.div>
              <div className="text-red-300 text-lg font-mono">ATTEMPTING NEURAL LINK RESTORATION...</div>
              <div className="flex justify-center mt-6 gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 bg-red-400 rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ 
                      duration: 1.5, 
                      repeat: Infinity, 
                      delay: i * 0.2 
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Holographic scan lines effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute inset-0 opacity-10"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 204, 255, 0.1) 2px,
              rgba(0, 204, 255, 0.1) 4px
            )`
          }}
          animate={{ y: [-100, 100] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </div>

      {/* Atmospheric particles */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-cyan-400/40 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`
            }}
            animate={{
              y: [-20, 20],
              x: [-10, 10],
              opacity: [0.2, 0.8, 0.2]
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>
    </div>
  )
}