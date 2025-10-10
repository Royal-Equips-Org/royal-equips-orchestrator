import { Suspense, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import HolographicAI from './HolographicAI'
import CommandWorkstation from './CommandWorkstation'
import { useEmpireStore } from '../../store/empire-store'

interface FuturisticCommandCenterProps {
  className?: string
}

export default function FuturisticCommandCenter({ className = '' }: FuturisticCommandCenterProps) {
  const [activeWorkstation, setActiveWorkstation] = useState<string | null>(null)
  const [aiStatus, setAiStatus] = useState<'idle' | 'active' | 'alert' | 'processing'>('active')
  const [ambientMode, setAmbientMode] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  
  const { isConnected, agents, metrics } = useEmpireStore()

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Update AI status based on system state
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
          document.documentElement.requestFullscreen?.()
          break
        case 'Escape':
          e.preventDefault()
          document.exitFullscreen?.()
          break
        case 'm':
        case 'M':
          if (e.ctrlKey) {
            e.preventDefault()
            setAmbientMode(!ambientMode)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [ambientMode])

  return (
    <div className={`relative w-full h-screen bg-black overflow-hidden ${className}`}>
      {/* Animated Background Grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/30 via-black to-blue-950/30"></div>
        <div className="absolute inset-0">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={`h-${i}`}
              className="absolute h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"
              style={{ top: `${i * 5}%`, width: '100%' }}
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={`v-${i}`}
              className="absolute w-px bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent"
              style={{ left: `${i * 5}%`, height: '100%' }}
              animate={{ opacity: [0.1, 0.3, 0.1] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.1 }}
            />
          ))}
        </div>
      </div>

      {/* Top Status Bar */}
      <motion.div 
        className="absolute top-0 left-0 right-0 z-50 flex justify-between items-center p-4 bg-black/50 backdrop-blur-sm border-b border-cyan-400/30"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            <span className="text-cyan-400 font-mono text-sm">
              {isConnected ? 'SYSTEMS ONLINE' : 'CONNECTION LOST'}
            </span>
          </div>
          <div className="text-cyan-300 font-mono text-sm">
            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
          </div>
          <div className="text-cyan-300 font-mono text-sm">
            AGENTS: {agents?.filter(a => a.status === 'active').length || 0}/{agents?.length || 0}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <motion.button
            className="px-3 py-1 bg-cyan-900/30 border border-cyan-400/50 rounded text-cyan-400 text-xs font-mono hover:bg-cyan-400/10 transition-colors"
            onClick={() => setAmbientMode(!ambientMode)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {ambientMode ? 'EXIT AMBIENT' : 'AMBIENT MODE'}
          </motion.button>
          <div className="text-xs text-cyan-400 font-mono">
            F11: FULLSCREEN | CTRL+M: AMBIENT | ESC: EXIT
          </div>
        </div>
      </motion.div>

      {/* Central Holographic AI */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] pointer-events-auto">
          <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
            <Suspense fallback={null}>
              <OrbitControls 
                enablePan={false} 
                enableZoom={false}
                enableRotate={!ambientMode}
                autoRotate={ambientMode}
                autoRotateSpeed={0.5}
              />
              <ambientLight intensity={0.6} />
              <pointLight position={[10, 10, 10]} intensity={1.2} color="#05f4ff" />
              <pointLight position={[-10, -10, -10]} intensity={0.6} color="#ff1fbf" />
              <spotLight
                position={[0, 10, 0]}
                angle={0.3}
                penumbra={1}
                intensity={0.8}
                color="#05f4ff"
                castShadow
              />
              
              <HolographicAI 
                systemStatus={aiStatus}
                scale={ambientMode ? 1.2 : 1}
              />
            </Suspense>
          </Canvas>
        </div>
      </div>

      {/* Command Workstations */}
      <AnimatePresence>
        {!ambientMode && (
          <>
            <CommandWorkstation 
              position="left" 
              isActive={activeWorkstation === 'left'}
              onActivate={() => setActiveWorkstation(activeWorkstation === 'left' ? null : 'left')}
            />
            <CommandWorkstation 
              position="right" 
              isActive={activeWorkstation === 'right'}
              onActivate={() => setActiveWorkstation(activeWorkstation === 'right' ? null : 'right')}
            />
            <CommandWorkstation 
              position="top" 
              isActive={activeWorkstation === 'top'}
              onActivate={() => setActiveWorkstation(activeWorkstation === 'top' ? null : 'top')}
            />
            <CommandWorkstation 
              position="bottom" 
              isActive={activeWorkstation === 'bottom'}
              onActivate={() => setActiveWorkstation(activeWorkstation === 'bottom' ? null : 'bottom')}
            />
          </>
        )}
      </AnimatePresence>

      {/* Bottom Control Panel */}
      <motion.div 
        className="absolute bottom-0 left-0 right-0 z-50"
        initial={{ y: 100 }}
        animate={{ y: ambientMode ? 100 : 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-center p-4 bg-black/50 backdrop-blur-sm border-t border-cyan-400/30">
          <div className="flex items-center gap-8">
            {/* System Metrics */}
            <div className="flex items-center gap-4 text-cyan-400 font-mono text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                <span>CPU: {Math.round((metrics?.automation_level || 65) * 1.2)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>MEM: {Math.round((metrics?.system_uptime || 73) / 100 * 85)}%</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                <span>NET: {Math.round((metrics?.active_agents || 3) * 30.33)}%</span>
              </div>
            </div>

            {/* Mission Status */}
            <div className="px-4 py-2 bg-cyan-900/20 border border-cyan-400/30 rounded">
              <div className="text-cyan-400 font-mono text-xs">MISSION STATUS</div>
              <div className="text-cyan-300 font-mono text-sm">
                {isConnected ? 'OPERATIONAL' : 'STANDBY'}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              {['SCAN', 'ANALYZE', 'EXECUTE'].map((action, i) => (
                <motion.button
                  key={action}
                  className="px-3 py-1 bg-cyan-900/30 border border-cyan-400/50 rounded text-cyan-400 text-xs font-mono hover:bg-cyan-400/10 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    // Add action handling here
                    console.log(`Action: ${action}`)
                  }}
                >
                  {action}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Ambient Sound Visualization (when in ambient mode) */}
      <AnimatePresence>
        {ambientMode && (
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-60"
                style={{
                  left: `${20 + i * 10}%`,
                  top: `${30 + Math.sin(i) * 20}%`
                }}
                animate={{
                  scale: [0.5, 1.5, 0.5],
                  opacity: [0.3, 0.8, 0.3]
                }}
                transition={{
                  duration: 2 + i * 0.3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connection Status Overlay */}
      <AnimatePresence>
        {!isConnected && (
          <motion.div
            className="absolute inset-0 bg-red-900/20 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <div className="text-red-400 text-2xl font-mono mb-4">CONNECTION LOST</div>
              <div className="text-red-300 text-sm font-mono">ATTEMPTING TO RECONNECT...</div>
              <div className="flex justify-center mt-4">
                <div className="w-4 h-4 bg-red-400 rounded-full animate-pulse"></div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}