// Agent Network Grid Component
import { motion } from 'framer-motion';
import { Cpu, Activity, AlertTriangle, CheckCircle, Clock, Zap, RefreshCw } from 'lucide-react';
import { useEmpireStore, useLoadingStates, useErrorStates } from '@/store/empire-store';
import { cn } from '@/lib/utils';
import type { Agent } from '@/types/empire';
import { useEffect } from 'react';

function getStatusColor(status: Agent['status']) {
  switch (status) {
    case 'active': return 'text-green-400 bg-green-400/10 border-green-400/30';
    case 'deploying': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    case 'inactive': return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    case 'error': return 'text-red-400 bg-red-400/10 border-red-400/30';
    default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
  }
}

function getStatusIcon(status: Agent['status']) {
  switch (status) {
    case 'active': return <CheckCircle className="w-4 h-4" />;
    case 'deploying': return <Clock className="w-4 h-4" />;
    case 'inactive': return <Activity className="w-4 h-4 opacity-50" />;
    case 'error': return <AlertTriangle className="w-4 h-4" />;
    default: return <Activity className="w-4 h-4 opacity-50" />;
  }
}

function getHealthColor(health: Agent['health']) {
  switch (health) {
    case 'good': return 'text-green-400';
    case 'warning': return 'text-yellow-400';
    case 'critical': return 'text-red-400';
    default: return 'text-gray-400';
  }
}

function AgentCard({ agent }: { agent: Agent }) {
  const setSelectedAgent = useEmpireStore(state => state.setSelectedAgent);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "relative p-4 rounded-lg border backdrop-blur-sm cursor-pointer transition-all duration-200",
        getStatusColor(agent.status)
      )}
      onClick={() => setSelectedAgent(agent.id)}
    >
      {/* Status indicator */}
      <div className="absolute top-2 right-2 flex items-center space-x-1">
        {getStatusIcon(agent.status)}
        <div className="text-xs opacity-75">
          {agent.performance_score}%
        </div>
      </div>

      {/* Agent info */}
      <div className="pr-16">
        <div className="font-semibold flex items-center space-x-2">
          <span className="text-2xl">{agent.emoji}</span>
          <span>{agent.name}</span>
        </div>
        <div className="text-sm opacity-75 mt-1">
          Type: {agent.type} • Health: <span className={getHealthColor(agent.health)}>{agent.health}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <div className="opacity-60">Discoveries</div>
          <div className="font-semibold">{agent.discoveries_count}</div>
        </div>
        <div>
          <div className="opacity-60">Success Rate</div>
          <div className="font-semibold">{agent.success_rate}%</div>
        </div>
      </div>

      {/* Performance bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs mb-1">
          <span>Performance</span>
          <span>{agent.performance_score}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div
            className={cn(
              "h-1.5 rounded-full transition-all duration-300",
              agent.status === 'active' ? 'bg-green-400' :
              agent.status === 'deploying' ? 'bg-yellow-400' :
              agent.status === 'error' ? 'bg-red-400' : 'bg-gray-400'
            )}
            style={{ width: `${Math.min(agent.performance_score, 100)}%` }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="p-4 rounded-lg border border-gray-500/30 bg-gray-500/10 animate-pulse">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-8 h-8 bg-gray-500 rounded"></div>
            <div className="w-24 h-4 bg-gray-500 rounded"></div>
          </div>
          <div className="w-32 h-3 bg-gray-500 rounded mb-2"></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="w-16 h-3 bg-gray-500 rounded"></div>
            <div className="w-16 h-3 bg-gray-500 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-red-500/10 border border-red-500/30 rounded-lg">
      <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
      <h3 className="text-lg font-semibold text-red-400 mb-2">Failed to Load Agents</h3>
      <p className="text-gray-300 mb-4 text-center">{error}</p>
      <button
        onClick={onRetry}
        className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        <span>Retry</span>
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-500/10 border border-gray-500/30 rounded-lg">
      <Cpu className="w-12 h-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-400 mb-2">No Agents Registered</h3>
      <p className="text-gray-300 text-center">No agents are currently registered in the system.</p>
    </div>
  );
}

export default function AgentNetworkGrid() {
  const agents = useEmpireStore(state => state.agents);
  const loadAgents = useEmpireStore(state => state.loadAgents);
  const { agentsLoading } = useLoadingStates();
  const { agentsError } = useErrorStates();

  // Load agents on mount
  useEffect(() => {
    if (agents.length === 0 && !agentsLoading && !agentsError) {
      loadAgents();
    }
  }, [agents.length, agentsLoading, agentsError, loadAgents]);

  // Group agents by status for stats
  const agentStats = {
    active: agents.filter(a => a.status === 'active'),
    deploying: agents.filter(a => a.status === 'deploying'),  
    inactive: agents.filter(a => a.status === 'inactive'),
    error: agents.filter(a => a.status === 'error')
  };

  if (agentsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center">
            <Cpu className="w-6 h-6 mr-2 text-blue-400" />
            Agent Network
          </h2>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading agents...</span>
          </div>
        </div>
        <LoadingGrid />
      </div>
    );
  }

  if (agentsError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center">
            <Cpu className="w-6 h-6 mr-2 text-blue-400" />
            Agent Network
          </h2>
        </div>
        <ErrorState error={agentsError} onRetry={loadAgents} />
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center">
            <Cpu className="w-6 h-6 mr-2 text-blue-400" />
            Agent Network
          </h2>
        </div>
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold flex items-center">
          <Cpu className="w-6 h-6 mr-2 text-blue-400" />
          Agent Network
        </h2>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>{agentStats.active.length} Active</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
            <span>{agentStats.deploying.length} Deploying</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <span>{agentStats.error.length} Error</span>
          </div>
        </div>
      </div>

      {/* Agent grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <AgentCard 
            key={agent.id} 
            agent={agent} 
          />
        ))}
      </div>
    </div>
  );
}