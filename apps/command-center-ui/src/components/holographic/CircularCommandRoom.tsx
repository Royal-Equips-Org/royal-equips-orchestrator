import { useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { LineChart, Line, AreaChart, Area, ResponsiveContainer } from 'recharts'

interface CircularCommandRoomProps {
  className?: string
}

// Generate realistic data for different chart types
const generateChartData = (type: 'line' | 'area' | 'network') => {
  return Array.from({ length: 30 }, (_, i) => ({
    time: i,
    value: Math.floor(Math.random() * 100),
    secondary: Math.floor(Math.random() * 80),
    tertiary: Math.floor(Math.random() * 60)
  }))
}

// World map points for global displays
const worldPoints = [
  { x: 15, y: 45, active: true },
  { x: 25, y: 35, active: false },
  { x: 45, y: 40, active: true },
  { x: 60, y: 30, active: true },
  { x: 75, y: 25, active: false },
  { x: 80, y: 55, active: true },
  { x: 35, y: 65, active: false },
  { x: 55, y: 70, active: true },
]

// Individual monitor component
const MonitorDisplay = ({ type = 'chart', size = 'large', data }: { 
  type?: 'chart' | 'map' | 'radar' | 'network' | 'data',
  size?: 'small' | 'large',
  data?: any
}) => {
  const chartData = useMemo(() => generateChartData('line'), [])
  
  const sizeClasses = size === 'large' ? 'w-64 h-48' : 'w-32 h-24'
  
  const renderContent = () => {
    switch (type) {
      case 'map':
        return (
          <div className="relative w-full h-full bg-cyan-950/20 border border-cyan-400/30 rounded">
            {/* World map outline */}
            <svg viewBox="0 0 100 80" className="w-full h-full opacity-60">
              <path 
                d="M10 25 L35 20 L55 25 L75 22 L90 28 L85 45 L70 50 L45 55 L20 50 L10 40 Z" 
                fill="none" 
                stroke="#00ccff" 
                strokeWidth="0.5"
              />
              <path 
                d="M15 35 L40 32 L60 38 L80 35 L85 42 L75 55 L50 60 L25 55 L15 45 Z" 
                fill="none" 
                stroke="#00ccff" 
                strokeWidth="0.5"
              />
            </svg>
            
            {/* Activity points */}
            {worldPoints.map((point, i) => (
              <div
                key={i}
                className={`absolute w-1 h-1 rounded-full ${
                  point.active ? 'bg-cyan-400 animate-pulse' : 'bg-cyan-600'
                }`}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              >
                {point.active && (
                  <div className="absolute inset-0 bg-cyan-400 rounded-full animate-ping opacity-75"></div>
                )}
              </div>
            ))}
          </div>
        )
      
      case 'radar':
        return (
          <div className="relative w-full h-full bg-cyan-950/20 border border-cyan-400/30 rounded flex items-center justify-center">
            {/* Radar circles */}
            <div className="relative w-3/4 h-3/4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className={`absolute border border-cyan-400/40 rounded-full`}
                  style={{
                    width: `${(i + 1) * 25}%`,
                    height: `${(i + 1) * 25}%`,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)'
                  }}
                />
              ))}
              
              {/* Radar sweep */}
              <motion.div
                className="absolute top-1/2 left-1/2 w-px h-1/2 bg-gradient-to-t from-cyan-400 to-transparent origin-bottom"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                style={{ transformOrigin: 'bottom center' }}
              />
              
              {/* Radar dots */}
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 bg-cyan-400 rounded-full animate-pulse"
                  style={{
                    left: `${30 + Math.random() * 40}%`,
                    top: `${30 + Math.random() * 40}%`
                  }}
                />
              ))}
            </div>
          </div>
        )
      
      case 'network':
        return (
          <div className="relative w-full h-full bg-cyan-950/20 border border-cyan-400/30 rounded p-2">
            {/* Network nodes */}
            {Array.from({ length: 8 }).map((_, i) => {
              const angle = (i / 8) * 2 * Math.PI
              const radius = 30 + Math.random() * 20
              const x = 50 + Math.cos(angle) * radius
              const y = 50 + Math.sin(angle) * radius
              
              return (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-cyan-400 rounded-full animate-pulse"
                  style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.2}s` }}
                />
              )
            })}
            
            {/* Connection lines */}
            <svg className="absolute inset-0 w-full h-full opacity-40">
              <line x1="20%" y1="30%" x2="80%" y2="40%" stroke="#00ccff" strokeWidth="1"/>
              <line x1="30%" y1="60%" x2="70%" y2="20%" stroke="#00ccff" strokeWidth="1"/>
              <line x1="40%" y1="80%" x2="60%" y2="30%" stroke="#00ccff" strokeWidth="1"/>
            </svg>
          </div>
        )
      
      case 'data':
        return (
          <div className="w-full h-full bg-cyan-950/20 border border-cyan-400/30 rounded p-3 text-cyan-400 font-mono text-xs">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>STATUS</span>
                <span className="text-green-400">ONLINE</span>
              </div>
              <div className="flex justify-between">
                <span>AGENTS</span>
                <span>12/15</span>
              </div>
              <div className="flex justify-between">
                <span>THREAT LVL</span>
                <span className="text-yellow-400">LOW</span>
              </div>
              <div className="flex justify-between">
                <span>UPTIME</span>
                <span>99.7%</span>
              </div>
              <div className="w-full bg-cyan-900/30 h-1 rounded mt-2">
                <motion.div 
                  className="bg-cyan-400 h-full rounded"
                  initial={{ width: 0 }}
                  animate={{ width: '75%' }}
                  transition={{ duration: 2 }}
                />
              </div>
            </div>
          </div>
        )
      
      default:
        return (
          <div className="w-full h-full bg-cyan-950/20 border border-cyan-400/30 rounded">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#00ccff" 
                  strokeWidth={1}
                  dot={false}
                  animationDuration={3000}
                />
                <Line 
                  type="monotone" 
                  dataKey="secondary" 
                  stroke="#0088cc" 
                  strokeWidth={1}
                  dot={false}
                  animationDuration={3500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
    }
  }
  
  return (
    <motion.div 
      className={`${sizeClasses} ${size === 'large' ? 'opacity-90' : 'opacity-70'}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: size === 'large' ? 0.9 : 0.7, scale: 1 }}
      transition={{ duration: 1, delay: Math.random() * 2 }}
    >
      {renderContent()}
    </motion.div>
  )
}

// Human operator silhouette
const OperatorSilhouette = ({ position }: { position: number }) => {
  return (
    <div 
      className="absolute bottom-8 w-16 h-20 opacity-30"
      style={{
        left: `${position}%`,
        transform: 'translateX(-50%)'
      }}
    >
      {/* Head */}
      <div className="absolute top-0 left-1/2 w-4 h-4 bg-cyan-900 rounded-full transform -translate-x-1/2"></div>
      
      {/* Body */}
      <div className="absolute top-4 left-1/2 w-6 h-8 bg-cyan-900 rounded transform -translate-x-1/2"></div>
      
      {/* Arms */}
      <div className="absolute top-5 left-2 w-3 h-6 bg-cyan-900 rounded transform rotate-12"></div>
      <div className="absolute top-5 right-2 w-3 h-6 bg-cyan-900 rounded transform -rotate-12"></div>
      
      {/* Legs */}
      <div className="absolute top-12 left-3 w-2 h-8 bg-cyan-900 rounded"></div>
      <div className="absolute top-12 right-3 w-2 h-8 bg-cyan-900 rounded"></div>
    </div>
  )
}

export default function CircularCommandRoom({ className = '' }: CircularCommandRoomProps) {
  // Generate monitor positions in a circle
  const monitors = useMemo(() => {
    const monitorCount = 24
    const positions = []
    
    for (let i = 0; i < monitorCount; i++) {
      const angle = (i / monitorCount) * 2 * Math.PI
      const radius = 45 // percentage from center
      const x = 50 + Math.cos(angle) * radius
      const y = 50 + Math.sin(angle) * radius
      
      positions.push({
        x,
        y,
        angle: angle * (180 / Math.PI),
        type: ['chart', 'map', 'radar', 'network', 'data'][Math.floor(Math.random() * 5)],
        size: Math.random() > 0.7 ? 'large' : 'small'
      })
    }
    
    return positions
  }, [])
  
  // Operator positions
  const operators = [15, 35, 65, 85]
  
  return (
    <div className={`relative w-full h-full ${className}`}>
      {/* Circular monitor arrangement */}
      {monitors.map((monitor, i) => (
        <div
          key={i}
          className="absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${monitor.x}%`,
            top: `${monitor.y}%`,
            transform: `translate(-50%, -50%) rotate(${monitor.angle + 90}deg)`
          }}
        >
          <div style={{ transform: `rotate(${-(monitor.angle + 90)}deg)` }}>
            <MonitorDisplay 
              type={monitor.type as any}
              size={monitor.size as any}
            />
          </div>
        </div>
      ))}
      
      {/* Human operators */}
      {operators.map((position, i) => (
        <OperatorSilhouette key={i} position={position} />
      ))}
      
      {/* Curved desk/console indicators */}
      <div className="absolute bottom-4 left-0 right-0 h-12">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="absolute bottom-0 w-24 h-3 bg-cyan-900/20 border-t border-cyan-400/30 rounded-t"
            style={{
              left: `${10 + i * 10}%`,
              transform: 'translateX(-50%)'
            }}
          />
        ))}
      </div>
      
      {/* Ambient room lighting effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top lighting */}
        <div className="absolute top-0 left-1/2 w-96 h-96 bg-cyan-400/5 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
        
        {/* Side lighting */}
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-cyan-400/3 rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-cyan-400/3 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
        
        {/* Floor reflection */}
        <div className="absolute bottom-0 left-1/2 w-full h-32 bg-gradient-to-t from-cyan-400/5 to-transparent transform -translate-x-1/2"></div>
      </div>
    </div>
  )
}