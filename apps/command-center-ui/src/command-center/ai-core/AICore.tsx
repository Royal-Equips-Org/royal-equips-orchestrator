import React from 'react'
import Hologram3D from './Hologram3D'
import DataPanels from './DataPanels'
import { useLiveData } from './hooks/useLiveData'

interface AICoreProps {
  onExit: () => void
  isFullscreen: boolean
}

const AICore: React.FC<AICoreProps> = ({ onExit, isFullscreen }) => {
  const { metrics, agents, opportunities, campaigns, dataStreams, liveIntensity } = useLiveData()

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 overflow-hidden">
      {/* Exit button */}
      <button
        onClick={onExit}
        className="absolute top-4 right-4 z-50 bg-red-600/20 hover:bg-red-600/40 border border-red-400/50 text-red-200 px-3 py-1 rounded text-sm transition-colors"
      >
        Exit AI Core
      </button>

      {/* Hologram display */}
      <div className="absolute inset-0">
        <Hologram3D
          metrics={metrics || undefined}
          agents={agents || undefined}
          opportunities={opportunities || undefined}
          liveIntensity={liveIntensity}
          dataStreams={dataStreams}
        />
      </div>

      {/* Data panels overlay */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 w-80 max-h-96 overflow-y-auto">
        <DataPanels
          dataStreams={dataStreams}
          metrics={metrics || undefined}
          agents={agents || undefined}
          campaigns={campaigns || undefined}
          liveIntensity={liveIntensity}
        />
      </div>

      {/* Status indicator */}
      <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-sm border border-cyan-400/30 rounded-lg px-4 py-2">
        <div className="text-cyan-300 text-sm font-mono">
          AI CORE ACTIVE • {liveIntensity?.wsStatus?.connected ? 'CONNECTED' : 'OFFLINE'}
        </div>
      </div>
    </div>
  )
}

export default AICore