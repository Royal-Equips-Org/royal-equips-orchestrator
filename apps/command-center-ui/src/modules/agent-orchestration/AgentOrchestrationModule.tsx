/**
 * Agent Orchestration Module - Command Center for 100+ Agents
 * 
 * Provides unified control interface for managing all agents in the Royal Equips Empire.
 * Integrated with AIRA for intelligent orchestration and automated coordination.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Agent {
  agent_id: string;
  name: string;
  type: string;
  capabilities: string[];
  status: string;
  version: string;
  last_heartbeat: string;
  execution_count: number;
  error_count: number;
  current_load: number;
  max_concurrent_tasks: number;
}

interface Task {
  task_id: string;
  capability: string;
  priority: string;
  status: string;
  assigned_agent?: string;
  created_at: string;
}

interface OrchestrationStats {
  registry_stats: {
    total_agents: number;
    healthy_agents: number;
    status_breakdown: Record<string, number>;
  };
  task_stats: {
    pending_tasks: number;
    active_tasks: number;
    completed_tasks: number;
  };
}

export default function AgentOrchestrationModule() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<OrchestrationStats | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrchestrationData();
    const interval = setInterval(fetchOrchestrationData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchOrchestrationData = async () => {
    try {
      const [agentsRes, tasksRes, statsRes] = await Promise.all([
        fetch('/api/orchestration/agents'),
        fetch('/api/orchestration/tasks'),
        fetch('/api/orchestration/stats')
      ]);

      if (agentsRes.ok && tasksRes.ok && statsRes.ok) {
        const agentsData = await agentsRes.json();
        const tasksData = await tasksRes.json();
        const statsData = await statsRes.json();

        setAgents(agentsData.agents || []);
        setTasks([
          ...(tasksData.pending_tasks || []),
          ...(tasksData.active_tasks || [])
        ]);
        setStats(statsData);
        setError(null);
      } else {
        setError('Failed to fetch orchestration data');
      }
    } catch (err) {
      console.error('Error fetching orchestration data:', err);
      setError('Error connecting to orchestration system');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ready':
      case 'idle':
        return 'text-green-400';
      case 'running':
        return 'text-cyan-400';
      case 'error':
        return 'text-red-400';
      case 'maintenance':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getLoadColor = (load: number) => {
    if (load < 0.5) return 'bg-green-500';
    if (load < 0.8) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-cyan-400 text-xl">Loading Agent Orchestration...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2">
          🏰 Agent Orchestration Command Center
        </h1>
        <p className="text-gray-400">Unified control for 100+ agents powered by AIRA intelligence</p>
      </motion.div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-6"
          >
            <div className="text-gray-400 text-sm mb-2">Total Agents</div>
            <div className="text-3xl font-bold text-cyan-400">
              {stats.registry_stats.total_agents}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-green-500/30 rounded-lg p-6"
          >
            <div className="text-gray-400 text-sm mb-2">Healthy Agents</div>
            <div className="text-3xl font-bold text-green-400">
              {stats.registry_stats.healthy_agents}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-yellow-500/30 rounded-lg p-6"
          >
            <div className="text-gray-400 text-sm mb-2">Active Tasks</div>
            <div className="text-3xl font-bold text-yellow-400">
              {stats.task_stats.active_tasks}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6"
          >
            <div className="text-gray-400 text-sm mb-2">Pending Tasks</div>
            <div className="text-3xl font-bold text-purple-400">
              {stats.task_stats.pending_tasks}
            </div>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agents List */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-6"
          >
            <h2 className="text-2xl font-bold text-cyan-400 mb-4">Active Agents</h2>
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {agents.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No agents registered. Agents will appear here when they connect.
                </div>
              ) : (
                agents.map((agent) => (
                  <motion.div
                    key={agent.agent_id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelectedAgent(agent)}
                    className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 cursor-pointer hover:border-cyan-500/50 transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{agent.name}</h3>
                        <p className="text-sm text-gray-400">{agent.type}</p>
                      </div>
                      <span className={`text-sm font-medium ${getStatusColor(agent.status)}`}>
                        {agent.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                      <span>⚡ {agent.execution_count} executions</span>
                      <span>❌ {agent.error_count} errors</span>
                      <span>v{agent.version}</span>
                    </div>

                    {/* Load indicator */}
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`${getLoadColor(agent.current_load)} rounded-full h-2 transition-all`}
                        style={{ width: `${agent.current_load * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Load: {Math.round(agent.current_load * 100)}%
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {agent.capabilities.slice(0, 3).map((cap) => (
                        <span
                          key={cap}
                          className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded"
                        >
                          {cap}
                        </span>
                      ))}
                      {agent.capabilities.length > 3 && (
                        <span className="text-xs bg-gray-700 text-gray-400 px-2 py-1 rounded">
                          +{agent.capabilities.length - 3} more
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>

        {/* Tasks and Agent Details */}
        <div className="space-y-6">
          {/* Selected Agent Details */}
          {selectedAgent && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-800/50 backdrop-blur-sm border border-cyan-500/30 rounded-lg p-6"
            >
              <h2 className="text-xl font-bold text-cyan-400 mb-4">Agent Details</h2>
              <div className="space-y-2 text-sm">
                <div><span className="text-gray-400">ID:</span> <span className="text-white">{selectedAgent.agent_id}</span></div>
                <div><span className="text-gray-400">Name:</span> <span className="text-white">{selectedAgent.name}</span></div>
                <div><span className="text-gray-400">Type:</span> <span className="text-white">{selectedAgent.type}</span></div>
                <div><span className="text-gray-400">Max Tasks:</span> <span className="text-white">{selectedAgent.max_concurrent_tasks}</span></div>
                <div>
                  <span className="text-gray-400">Capabilities:</span>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selectedAgent.capabilities.map((cap) => (
                      <span key={cap} className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded">
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Recent Tasks */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6"
          >
            <h2 className="text-xl font-bold text-purple-400 mb-4">Recent Tasks</h2>
            
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {tasks.length === 0 ? (
                <div className="text-center py-4 text-gray-400 text-sm">
                  No active tasks
                </div>
              ) : (
                tasks.slice(0, 10).map((task) => (
                  <div
                    key={task.task_id}
                    className="bg-gray-900/50 border border-gray-700/50 rounded p-3"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-white truncate">{task.task_id}</span>
                      <span className={`text-xs ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">{task.capability}</div>
                    {task.assigned_agent && (
                      <div className="text-xs text-cyan-400 mt-1">→ {task.assigned_agent}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
