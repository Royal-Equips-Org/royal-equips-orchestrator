import { useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Activity, Database, TrendingUp, ShoppingCart } from 'lucide-react'
import AgentStatusPanel from './components/AgentStatusPanel'
import KPIVisualization from './components/KPIVisualization'
import CommandConsole from './components/CommandConsole'

interface SystemMetrics {
  agents_active: number
  requests_total: number
  uptime_seconds: number
}

function App() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/metrics')
        const data = await response.json()
        setMetrics(data.metrics)
        setIsConnected(true)
      } catch (error) {
        console.error('Failed to fetch metrics:', error)
        setIsConnected(false)
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Scanner Effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="scanner-line absolute w-full h-px bg-gradient-to-r from-transparent via-hologram to-transparent opacity-30"></div>
      </div>

      {/* Header */}
      <header className="glass-panel p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold hologram-text">
              👑 ROYAL EQUIPS EMPIRE
            </h1>
            <div className="text-sm opacity-70">
              Autonomous AI Command Center v1.0
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              <Activity className="w-4 h-4" />
              <span className="text-sm">{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
            </div>
            {metrics && (
              <div className="text-sm opacity-70">
                Uptime: {Math.floor(metrics.uptime_seconds / 60)}m
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-4 p-4 h-[calc(100vh-120px)]">
        
        {/* Left Panel - Agent Status */}
        <div className="col-span-3">
          <AgentStatusPanel />
        </div>

        {/* Center Panel - 3D Visualization */}
        <div className="col-span-6">
          <div className="glass-panel h-full rounded-lg overflow-hidden">
            <div className="h-8 bg-gradient-to-r from-royal-blue to-royal-gold flex items-center px-4">
              <span className="text-xs font-bold">HOLOGRAPHIC COMMAND CENTER</span>
            </div>
            <div className="h-[calc(100%-2rem)]">
              <Canvas camera={{ position: [0, 0, 10], fov: 60 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                
                <KPIVisualization metrics={metrics} />
                
                <OrbitControls 
                  enablePan={true} 
                  enableZoom={true} 
                  enableRotate={true}
                />
              </Canvas>
            </div>
          </div>
        </div>

        {/* Right Panel - Controls & Metrics */}
        <div className="col-span-3 space-y-4">
          
          {/* Live Metrics */}
          <div className="glass-panel p-4 rounded-lg">
            <h3 className="text-lg font-bold mb-4 hologram-text">📊 LIVE METRICS</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-hologram" />
                  <span className="text-sm">Active Agents</span>
                </div>
                <span className="text-hologram font-bold">
                  {metrics?.agents_active || 0}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-green-400" />
                  <span className="text-sm">API Requests</span>
                </div>
                <span className="text-green-400 font-bold">
                  {metrics?.requests_total || 0}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm">Success Rate</span>
                </div>
                <span className="text-yellow-400 font-bold">100%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-4 h-4 text-purple-400" />
                  <span className="text-sm">Revenue Today</span>
                </div>
                <span className="text-purple-400 font-bold">€2,347</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="glass-panel p-4 rounded-lg">
            <h3 className="text-lg font-bold mb-4 hologram-text">⚡ QUICK ACTIONS</h3>
            <div className="space-y-2">
              <button className="w-full p-2 hologram-border rounded bg-transparent hover:bg-hologram hover:bg-opacity-10 transition-colors text-sm">
                🔄 Sync All Agents
              </button>
              <button className="w-full p-2 hologram-border rounded bg-transparent hover:bg-hologram hover:bg-opacity-10 transition-colors text-sm">
                📊 Generate Report
              </button>
              <button className="w-full p-2 hologram-border rounded bg-transparent hover:bg-hologram hover:bg-opacity-10 transition-colors text-sm">
                🚀 Launch New Store
              </button>
              <button className="w-full p-2 hologram-border rounded bg-transparent hover:bg-hologram hover:bg-opacity-10 transition-colors text-sm">
                🔧 Emergency Stop
              </button>
            </div>
          </div>

          {/* System Alerts */}
          <div className="glass-panel p-4 rounded-lg">
            <h3 className="text-lg font-bold mb-4 hologram-text">🚨 ALERTS</h3>
            <div className="space-y-2">
              <div className="flex items-start space-x-2 text-xs p-2 bg-green-500 bg-opacity-20 rounded">
                <Activity className="w-3 h-3 text-green-400 mt-0.5" />
                <div>
                  <div className="text-green-400 font-bold">System Online</div>
                  <div className="opacity-70">All agents operational</div>
                </div>
              </div>
              
              <div className="flex items-start space-x-2 text-xs p-2 bg-blue-500 bg-opacity-20 rounded">
                <Database className="w-3 h-3 text-blue-400 mt-0.5" />
                <div>
                  <div className="text-blue-400 font-bold">Sync Complete</div>
                  <div className="opacity-70">Shopify data updated</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Command Console */}
        <div className="col-span-12">
          <CommandConsole />
        </div>
      </div>
    </div>
  )
}

export default App