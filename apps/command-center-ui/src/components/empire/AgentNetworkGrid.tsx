// Agent Network Grid Component
import { motion } from 'framer-motion';
import { Cpu, Activity, AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react';
import { useAgents, useEmpireStore } from '@/store/empire-store';
import { cn } from '@/lib/utils';
import type { AgentStatus } from '@/types/empire';

const mockAgents: AgentStatus[] = [
  {
    agent_id: "product_research_001",
    agent_name: "Product Research Agent",
    agent_type: "research",
    status: "active",
    performance_score: 94,
    discoveries_count: 127,
    success_rate: 89,
    current_task: "Analyzing outdoor gear trends",
    health_indicators: {
      cpu_usage: 45,
      memory_usage: 67,
      error_rate: 2,
      response_time: 120
    }
  },
  {
    agent_id: "supplier_intel_001",
    agent_name: "Supplier Intelligence Agent",
    agent_type: "supplier",
    status: "active",
    performance_score: 87,
    discoveries_count: 89,
    success_rate: 92,
    current_task: "Vetting new suppliers",
    health_indicators: {
      cpu_usage: 32,
      memory_usage: 54,
      error_rate: 1,
      response_time: 95
    }
  },
  {
    agent_id: "master_coordinator_001",
    agent_name: "Master Agent Coordinator",
    agent_type: "automation",
    status: "active",
    performance_score: 98,
    discoveries_count: 45,
    success_rate: 96,
    current_task: "Orchestrating agent workflows",
    health_indicators: {
      cpu_usage: 23,
      memory_usage: 41,
      error_rate: 0,
      response_time: 75
    }
  },
  {
    agent_id: "market_analysis_001",
    agent_name: "Market Analysis Agent",
    agent_type: "analytics",
    status: "deploying",
    performance_score: 0,
    discoveries_count: 0,
    success_rate: 0,
    current_task: "Initializing market data systems",
    health_indicators: {
      cpu_usage: 15,
      memory_usage: 25,
      error_rate: 0,
      response_time: 200
    }
  },
  {
    agent_id: "pricing_strategy_001",
    agent_name: "Pricing Strategy Agent",
    agent_type: "analytics",
    status: "inactive",
    performance_score: 76,
    discoveries_count: 23,
    success_rate: 84,
    current_task: "Standby",
    health_indicators: {
      cpu_usage: 5,
      memory_usage: 12,
      error_rate: 0,
      response_time: 0
    }
  },
  {
    agent_id: "marketing_orchestrator_001",
    agent_name: "Marketing Campaign Orchestrator",
    agent_type: "marketing",
    status: "error",
    performance_score: 65,
    discoveries_count: 12,
    success_rate: 71,
    current_task: "Error: API connection failed",
    health_indicators: {
      cpu_usage: 78,
      memory_usage: 89,
      error_rate: 15,
      response_time: 450
    }
  }
];

function AgentCard({ agent }: { agent: AgentStatus }) {
  const { setSelectedAgent } = useEmpireStore();

  const getStatusIcon = () => {
    switch (agent.status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'inactive':
        return <Cpu className="w-4 h-4 text-gray-400" />;
      case 'deploying':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return <Cpu className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (agent.status) {
      case 'active':
        return 'border-green-400/30 bg-green-400/5';
      case 'inactive':
        return 'border-gray-400/30 bg-gray-400/5';
      case 'deploying':
        return 'border-yellow-400/30 bg-yellow-400/5';
      case 'error':
        return 'border-red-400/30 bg-red-400/5';
      default:
        return 'border-gray-400/30 bg-gray-400/5';
    }
  };

  const getTypeEmoji = () => {
    switch (agent.agent_type) {
      case 'research':
        return '🔍';
      case 'supplier':
        return '🏭';
      case 'marketing':
        return '📱';
      case 'analytics':
        return '📊';
      case 'automation':
        return '🤖';
      case 'monitoring':
        return '👀';
      default:
        return '⚙️';
    }
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => setSelectedAgent(agent.agent_id)}
      className={cn(
        "p-4 rounded-lg border cursor-pointer transition-all",
        getStatusColor(),
        "hover:border-hologram/50"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{getTypeEmoji()}</span>
          {getStatusIcon()}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-hologram">
            {agent.performance_score}
          </div>
          <div className="text-xs opacity-70">Score</div>
        </div>
      </div>

      <div className="mb-3">
        <h4 className="font-semibold text-sm mb-1 line-clamp-1">
          {agent.agent_name}
        </h4>
        <p className="text-xs opacity-70 line-clamp-2">
          {agent.current_task}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="font-medium">{agent.discoveries_count}</div>
          <div className="opacity-70">Discoveries</div>
        </div>
        <div>
          <div className="font-medium">{agent.success_rate}%</div>
          <div className="opacity-70">Success Rate</div>
        </div>
      </div>

      {/* Health Indicator */}
      <div className="mt-3 flex items-center space-x-1">
        <Activity className="w-3 h-3" />
        <div className="flex-1 bg-gray-700 rounded-full h-1">
          <div 
            className={cn(
              "h-1 rounded-full transition-all",
              agent.status === 'active' && "bg-green-400",
              agent.status === 'deploying' && "bg-yellow-400",
              agent.status === 'error' && "bg-red-400",
              agent.status === 'inactive' && "bg-gray-400"
            )}
            style={{ 
              width: `${agent.status === 'active' ? agent.performance_score : 
                      agent.status === 'deploying' ? 50 : 
                      agent.status === 'error' ? 20 : 0}%` 
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function AgentNetworkGrid() {
  const agents = useAgents();
  
  // Use mock data if no agents in store yet
  const displayAgents = agents.length > 0 ? agents : mockAgents;

  const agentsByStatus = {
    active: displayAgents.filter(a => a.status === 'active'),
    deploying: displayAgents.filter(a => a.status === 'deploying'),
    inactive: displayAgents.filter(a => a.status === 'inactive'),
    error: displayAgents.filter(a => a.status === 'error')
  };

  return (
    <div className="space-y-6">
      {/* Status Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">
            {agentsByStatus.active.length}
          </div>
          <div className="text-xs opacity-70">Active</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {agentsByStatus.deploying.length}
          </div>
          <div className="text-xs opacity-70">Deploying</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-400">
            {agentsByStatus.inactive.length}
          </div>
          <div className="text-xs opacity-70">Inactive</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400">
            {agentsByStatus.error.length}
          </div>
          <div className="text-xs opacity-70">Errors</div>
        </div>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
        {displayAgents.map((agent, index) => (
          <motion.div
            key={agent.agent_id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <AgentCard agent={agent} />
          </motion.div>
        ))}
      </div>

      {/* Coming Soon Placeholder */}
      <div className="text-center py-8 border-2 border-dashed border-gray-600 rounded-lg">
        <Zap className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-gray-400 font-medium">
          94 More Agents Coming Soon
        </p>
        <p className="text-sm text-gray-500 mt-1">
          Full 100+ agent network in development
        </p>
      </div>
    </div>
  );
}