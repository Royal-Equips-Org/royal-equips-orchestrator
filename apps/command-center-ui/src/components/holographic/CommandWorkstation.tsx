import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, AreaChart, Area, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { Globe, Activity, TrendingUp, Shield, Target, Zap } from 'lucide-react'

interface WorkstationProps {
  position: 'left' | 'right' | 'top' | 'bottom'
  data?: any
  isActive?: boolean
  onActivate?: () => void
}

const generateMockData = () => {
  return Array.from({ length: 20 }, (_, i) => ({
    time: i,
    value: Math.floor(Math.random() * 100),
    secondary: Math.floor(Math.random() * 80),
    network: Math.floor(Math.random() * 60)
  }))
}

const worldMapPoints = [
  { x: 20, y: 30, pulse: true },
  { x: 45, y: 25, pulse: false },
  { x: 70, y: 40, pulse: true },
  { x: 15, y: 60, pulse: false },
  { x: 85, y: 35, pulse: true },
  { x: 60, y: 70, pulse: false },
]

export default function CommandWorkstation({ position, isActive = false, onActivate }: WorkstationProps) {
  const [chartData] = useState(generateMockData)
  const workstationRef = useRef<HTMLDivElement>(null)
  
  const positionClasses = {
    left: 'left-4 top-1/2 -translate-y-1/2',
    right: 'right-4 top-1/2 -translate-y-1/2',
    top: 'top-4 left-1/2 -translate-x-1/2',
    bottom: 'bottom-4 left-1/2 -translate-x-1/2'
  }
  
  const rotationClasses = {
    left: 'rotate-3',
    right: '-rotate-3',
    top: 'rotate-1',
    bottom: '-rotate-1'
  }

  return (
    <motion.div
      ref={workstationRef}
      className={`absolute ${positionClasses[position]} ${rotationClasses[position]} w-80 h-64 cursor-pointer`}
      onClick={onActivate}
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ 
        opacity: isActive ? 1 : 0.7, 
        scale: isActive ? 1.05 : 1,
        boxShadow: isActive ? '0 0 30px rgba(5, 244, 255, 0.5)' : '0 0 15px rgba(5, 244, 255, 0.2)'
      }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.1, opacity: 1 }}
    >
      {/* Workstation Frame */}  
      <div className="relative w-full h-full bg-black/80 border border-cyan-400/50 rounded-lg backdrop-blur-sm overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-2 bg-cyan-900/20 border-b border-cyan-400/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-cyan-400 font-mono">STATION-{position.toUpperCase()}</span>
          </div>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-1 h-1 bg-cyan-400/60 rounded-full"></div>
            ))}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="p-3 h-full grid grid-cols-2 gap-2">
          {/* World Map Panel */}
          <div className="bg-cyan-950/30 border border-cyan-400/20 rounded p-2 relative overflow-hidden">
            <div className="absolute top-1 left-1 text-[8px] text-cyan-400 font-mono">GLOBAL</div>
            <div className="relative w-full h-full">
              {/* Simplified world map outline */}
              <svg viewBox="0 0 100 60" className="w-full h-full opacity-60">
                <path 
                  d="M10 20 L30 15 L50 20 L70 18 L90 22 L88 35 L75 40 L50 45 L25 42 L10 35 Z" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="0.5" 
                  className="text-cyan-400"
                />
                <path 
                  d="M15 30 L35 28 L55 32 L75 30 L85 33 L80 45 L60 50 L40 48 L20 45 L15 35 Z" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="0.5" 
                  className="text-cyan-400"
                />
              </svg>
              
              {/* Activity Points */}
              {worldMapPoints.map((point, i) => (
                <div
                  key={i}
                  className={`absolute w-1 h-1 bg-cyan-400 rounded-full ${point.pulse ? 'animate-pulse' : ''}`}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                >
                  <div className="absolute inset-0 bg-cyan-400 rounded-full animate-ping opacity-75"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Chart */}
          <div className="bg-cyan-950/30 border border-cyan-400/20 rounded p-2">
            <div className="text-[8px] text-cyan-400 font-mono mb-1">ACTIVITY</div>
            <ResponsiveContainer width="100%" height="80%">
              <LineChart data={chartData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#05f4ff" 
                  strokeWidth={1}
                  dot={false}
                  animationDuration={2000}
                />
                <Line 
                  type="monotone" 
                  dataKey="secondary" 
                  stroke="#ff1fbf" 
                  strokeWidth={1}
                  dot={false}
                  animationDuration={2500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* System Metrics */}
          <div className="bg-cyan-950/30 border border-cyan-400/20 rounded p-2">
            <div className="text-[8px] text-cyan-400 font-mono mb-1">METRICS</div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-cyan-300">CPU</span>
                <span className="text-cyan-400">87%</span>
              </div>
              <div className="w-full bg-cyan-900/30 h-1 rounded">
                <motion.div 
                  className="bg-cyan-400 h-full rounded"
                  initial={{ width: 0 }}
                  animate={{ width: '87%' }}
                  transition={{ duration: 1, delay: 0.5 }}
                />
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-cyan-300">MEM</span>
                <span className="text-cyan-400">73%</span>
              </div>
              <div className="w-full bg-cyan-900/30 h-1 rounded">
                <motion.div 
                  className="bg-cyan-400 h-full rounded"
                  initial={{ width: 0 }}
                  animate={{ width: '73%' }}
                  transition={{ duration: 1, delay: 0.7 }}
                />
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-cyan-300">NET</span>
                <span className="text-cyan-400">91%</span>
              </div>
              <div className="w-full bg-cyan-900/30 h-1 rounded">
                <motion.div 
                  className="bg-cyan-400 h-full rounded"
                  initial={{ width: 0 }}
                  animate={{ width: '91%' }}
                  transition={{ duration: 1, delay: 0.9 }}
                />
              </div>
            </div>
          </div>

          {/* Network Diagram */}
          <div className="bg-cyan-950/30 border border-cyan-400/20 rounded p-2 relative">
            <div className="text-[8px] text-cyan-400 font-mono mb-1">NETWORK</div>
            <div className="relative w-full h-full">
              {/* Network nodes */}
              <div className="absolute top-2 left-2 w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <div className="absolute top-4 right-3 w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-500"></div>
              <div className="absolute bottom-3 left-4 w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-1000"></div>
              <div className="absolute bottom-2 right-2 w-2 h-2 bg-cyan-400 rounded-full animate-pulse delay-1500"></div>
              
              {/* Connection lines */}
              <svg className="absolute inset-0 w-full h-full opacity-40">
                <line x1="12" y1="12" x2="45" y2="20" stroke="#05f4ff" strokeWidth="0.5"/>
                <line x1="45" y1="20" x2="20" y2="50" stroke="#05f4ff" strokeWidth="0.5"/>
                <line x1="20" y1="50" x2="50" y2="55" stroke="#05f4ff" strokeWidth="0.5"/>
                <line x1="12" y1="12" x2="50" y2="55" stroke="#05f4ff" strokeWidth="0.5"/>
              </svg>
              
              {/* Data flow animation */}
              <motion.div
                className="absolute w-1 h-1 bg-cyan-400 rounded-full"
                animate={{
                  x: [12, 45, 20, 50, 12],
                  y: [12, 20, 50, 55, 12]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="absolute bottom-1 right-2 flex gap-1">
          <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
          <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse delay-300"></div>
          <div className="w-1 h-1 bg-cyan-400 rounded-full animate-pulse delay-600"></div>
        </div>

        {/* Holographic glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/5 to-transparent rounded-lg pointer-events-none"></div>
      </div>
    </motion.div>
  )
}