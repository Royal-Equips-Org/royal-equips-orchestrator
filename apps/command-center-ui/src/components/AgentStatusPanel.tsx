import React, { useState, useEffect } from 'react'
import { Activity, CheckCircle, AlertCircle, Clock } from 'lucide-react'

interface Agent {
  id: string
  name: string
  status: 'active' | 'inactive' | 'error'
  health: 'healthy' | 'warning' | 'critical'
  lastExecution: string
}

const AgentStatusPanel: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([])

  useEffect(() => {
    // Mock agent data - in real implementation, fetch from API
    const mockAgents: Agent[] = [
      {
        id: '1',
        name: 'ProductResearchAgent',
        status: 'active',
        health: 'healthy',
        lastExecution: '2 min ago'
      },
      {
        id: '2', 
        name: 'PricingAgent',
        status: 'inactive',
        health: 'healthy',
        lastExecution: '15 min ago'
      },
      {
        id: '3',
        name: 'InventoryAgent', 
        status: 'active',
        health: 'warning',
        lastExecution: '1 min ago'
      },
      {
        id: '4',
        name: 'OrdersAgent',
        status: 'active',
        health: 'healthy',
        lastExecution: '30 sec ago'
      },
      {
        id: '5',
        name: 'ObserverAgent',
        status: 'active', 
        health: 'healthy',
        lastExecution: 'just now'
      }
    ]
    
    setAgents(mockAgents)
  }, [])

  const getStatusIcon = (status: string, health: string) => {
    if (status === 'active' && health === 'healthy') {
      return <CheckCircle className="w-4 h-4 text-green-400" />
    } else if (status === 'active' && health === 'warning') {
      return <AlertCircle className="w-4 h-4 text-yellow-400" />
    } else if (status === 'error' || health === 'critical') {
      return <AlertCircle className="w-4 h-4 text-red-400" />
    } else {
      return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string, health: string) => {
    if (status === 'active' && health === 'healthy') return 'text-green-400'
    if (status === 'active' && health === 'warning') return 'text-yellow-400' 
    if (status === 'error' || health === 'critical') return 'text-red-400'
    return 'text-gray-400'
  }

  return (
    <div className="glass-panel h-full rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-4">
        <Activity className="w-5 h-5 text-hologram" />
        <h2 className="text-lg font-bold hologram-text">AGENT STATUS</h2>
      </div>
      
      <div className="space-y-3 max-h-[calc(100%-60px)] overflow-y-auto">
        {agents.map((agent) => (
          <div 
            key={agent.id}
            className="hologram-border rounded p-3 hover:bg-hologram hover:bg-opacity-5 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon(agent.status, agent.health)}
                <span className="text-sm font-medium">{agent.name}</span>
              </div>
              <span className={`text-xs uppercase ${getStatusColor(agent.status, agent.health)}`}>
                {agent.status}
              </span>
            </div>
            
            <div className="text-xs opacity-70">
              Last execution: {agent.lastExecution}
            </div>
            
            <div className="flex items-center space-x-2 mt-2">
              <div className={`w-2 h-2 rounded-full ${
                agent.health === 'healthy' ? 'bg-green-400' :
                agent.health === 'warning' ? 'bg-yellow-400' : 
                'bg-red-400'
              }`}></div>
              <span className="text-xs capitalize">{agent.health}</span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-hologram border-opacity-30">
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div className="text-green-400 font-bold">4</div>
            <div className="opacity-70">Active</div>
          </div>
          <div>
            <div className="text-yellow-400 font-bold">1</div>
            <div className="opacity-70">Warning</div>
          </div>
          <div>
            <div className="text-red-400 font-bold">0</div>
            <div className="opacity-70">Critical</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AgentStatusPanel