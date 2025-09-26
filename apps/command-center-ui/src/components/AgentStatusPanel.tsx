import { useEffect } from 'react';
import { Activity, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useEmpireStore } from '@/store/empire-store';

export default function AgentStatusPanel() {
  const { 
    agents, 
    agentsLoading, 
    agentsError, 
    loadAgents 
  } = useEmpireStore();

  useEffect(() => {
    // Load real agent data from API
    loadAgents();
  }, [loadAgents]);

  const getStatusIcon = (status: string, health: string) => {
    if (status === 'active' && health === 'good') {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    } else if (status === 'active' && health === 'warning') {
      return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    } else if (status === 'error' || health === 'critical') {
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    } else {
      return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string, health: string) => {
    if (status === 'active' && health === 'good') return 'text-green-400';
    if (status === 'active' && health === 'warning') return 'text-yellow-400';
    if (status === 'error' || health === 'critical') return 'text-red-400'; 
    return 'text-gray-400';
  };

  const formatLastExecution = (lastExecution?: Date) => {
    if (!lastExecution) return 'Never';
    
    const now = new Date();
    const diff = now.getTime() - lastExecution.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (seconds < 60) return `${seconds} sec ago`;
    if (minutes < 60) return `${minutes} min ago`;
    return lastExecution.toLocaleTimeString();
  };

  if (agentsLoading) {
    return (
      <div className="glass-panel h-full rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Activity className="w-5 h-5 text-hologram" />
          <h2 className="text-lg font-bold hologram-text">AGENT STATUS</h2>
        </div>
        <div className="text-center py-8">
          <div className="text-hologram">Loading agents...</div>
        </div>
      </div>
    );
  }

  if (agentsError) {
    return (
      <div className="glass-panel h-full rounded-lg p-4">
        <div className="flex items-center space-x-2 mb-4">
          <Activity className="w-5 h-5 text-hologram" />
          <h2 className="text-lg font-bold hologram-text">AGENT STATUS</h2>
        </div>
        <div className="text-center py-8">
          <div className="text-red-400">Failed to load agents</div>
          <div className="text-xs text-gray-400 mt-2">{agentsError}</div>
          <button 
            onClick={() => loadAgents()}
            className="mt-4 px-4 py-2 bg-hologram bg-opacity-20 text-hologram rounded hover:bg-opacity-30 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const activeAgents = agents.filter(a => a.status === 'active').length;
  const warningAgents = agents.filter(a => a.health === 'warning').length;
  const criticalAgents = agents.filter(a => a.health === 'critical').length;

  return (
    <div className="glass-panel h-full rounded-lg p-4">
      <div className="flex items-center space-x-2 mb-4">
        <Activity className="w-5 h-5 text-hologram" />
        <h2 className="text-lg font-bold hologram-text">AGENT STATUS</h2>
      </div>
      
      {agents.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400">No agents registered yet</div>
        </div>
      ) : (
        <>
          <div className="space-y-3 max-h-[calc(100%-120px)] overflow-y-auto">
            {agents.map((agent) => (
              <div 
                key={agent.id}
                className="hologram-border rounded p-3 hover:bg-hologram hover:bg-opacity-5 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(agent.status, agent.health)}
                    <span className="text-sm font-medium">{agent.name}</span>
                    <span className="text-xs">{agent.emoji}</span>
                  </div>
                  <span className={`text-xs uppercase ${getStatusColor(agent.status, agent.health)}`}>
                    {agent.status}
                  </span>
                </div>
                
                <div className="text-xs opacity-70">
                  Last execution: {formatLastExecution(agent.last_execution)}
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${
                      agent.health === 'good' ? 'bg-green-400' :
                      agent.health === 'warning' ? 'bg-yellow-400' : 
                      'bg-red-400'
                    }`}></div>
                    <span className="text-xs capitalize">{agent.health}</span>
                  </div>
                  
                  <div className="text-xs text-gray-400">
                    Score: {agent.performance_score}%
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-hologram border-opacity-30">
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="text-green-400 font-bold">{activeAgents}</div>
                <div className="opacity-70">Active</div>
              </div>
              <div>
                <div className="text-yellow-400 font-bold">{warningAgents}</div>
                <div className="opacity-70">Warning</div>
              </div>
              <div>
                <div className="text-red-400 font-bold">{criticalAgents}</div>
                <div className="opacity-70">Critical</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}