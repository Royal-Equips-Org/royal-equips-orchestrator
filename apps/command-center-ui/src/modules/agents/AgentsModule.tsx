import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Activity, 
  Play, 
  Pause, 
  Square,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Cpu,
  Zap,
  MessageSquare,
  Settings,
  Plus
} from 'lucide-react';
import { useEmpireStore } from '../../store/empire-store';
import { ensureArray } from '../../utils/array-utils';
import { logger } from '../../services/log';

interface Agent {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'idle' | 'error' | 'stopped';
  health: number;
  lastActivity: string;
  totalTasks: number;
  completedTasks: number;
  errorCount: number;
  performance: {
    avgResponseTime: number;
    successRate: number;
    throughput: number;
  };
  capabilities: string[];
}

interface AgentSession {
  id: string;
  status: string;
  created_at: string;
}

export default function AgentsModule() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const { isConnected } = useEmpireStore();

  // Business logic validation for agents data
  const normalizeAgentPayload = (rawData: unknown): Record<string, unknown>[] => {
    const collections: unknown[] = [];

    const agentLike = (candidate: unknown): candidate is Record<string, unknown> => {
      if (!candidate || typeof candidate !== 'object') {
        return false;
      }

      const record = candidate as Record<string, unknown>;
      const identifier = record.id ?? record.agent_id ?? record.uuid ?? record.slug;
      const status = record.status ?? record.agent_status;
      const agentType = record.type ?? record.agent_type;

      if (typeof identifier !== 'string' || identifier.length === 0) {
        return false;
      }

      if (
        typeof status !== 'string' &&
        typeof agentType !== 'string' &&
        typeof record.name !== 'string'
      ) {
        return false;
      }

      return true;
    };

    // Handle plain array response (e.g., [agent1, agent2])
    if (Array.isArray(rawData)) {
      collections.push(...rawData);
    } else if (rawData && typeof rawData === 'object') {
      const payload = rawData as Record<string, unknown>;

      if (Array.isArray(payload.agents)) {
        collections.push(...payload.agents);
      }

      if (Array.isArray(payload.data)) {
        collections.push(...payload.data);
      }

      if (typeof payload.data === 'object' && payload.data !== null) {
        const nested = payload.data as Record<string, unknown>;
        if (Array.isArray(nested.agents)) {
          collections.push(...nested.agents);
        }
        if (Array.isArray(nested.results)) {
          collections.push(...nested.results);
        }
      }

      if (Array.isArray(payload.results)) {
        collections.push(...payload.results);
      }

      // If no arrays found but the payload itself looks like an agent, use it
      if (collections.length === 0 && agentLike(payload)) {
        collections.push(payload);
      }
    }

    return collections.filter((candidate): candidate is Record<string, unknown> => agentLike(candidate));
  };

  const validateAndProcessAgentsData = (rawData: unknown): Record<string, unknown>[] => {
    if (!rawData || typeof rawData !== 'object') {
      logger.warn('Agents data invalid type, triggering fallback', {
        event: 'AGENTS_DATA_INVALID',
        rawData: typeof rawData,
        context: 'AgentsModule.validateAndProcessAgentsData'
      });
      return [];
    }

    const agentsArray = normalizeAgentPayload(rawData);

    if (agentsArray.length === 0) {
      logger.warn('No agents data available, triggering empty state recovery', {
        event: 'AGENTS_DATA_EMPTY',
        rawData,
        context: 'AgentsModule.validateAndProcessAgentsData'
      });
      return [];
    }

    logger.info('Successfully processed agents data', {
      event: 'AGENTS_DATA_PROCESSED',
      count: agentsArray.length,
      context: 'AgentsModule.validateAndProcessAgentsData'
    });

    return agentsArray;
  };

  // Autonomous self-healing service layer for agent data fetching
  const fetchAgentDataWithRecovery = async (retryCount = 0): Promise<void> => {
    const maxRetries = 3;
    const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
    
    try {
      logger.info('Starting agent data fetch', { 
        event: 'AGENTS_FETCH_START', 
        attempt: retryCount + 1,
        maxRetries: maxRetries + 1,
        context: 'AgentsModule.fetchAgentDataWithRecovery' 
      });

      // Fetch from real agents endpoint with timeout
      const agentsResponse = await Promise.race([
        fetch('/v1/agents'),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Fetch timeout')), 10000)
        )
      ]);
      
      let agentsData = [];
      
      if (agentsResponse.ok) {
        const rawResponse = await agentsResponse.json();
        agentsData = validateAndProcessAgentsData(rawResponse);
      } else {
        throw new Error(`HTTP ${agentsResponse.status}: ${agentsResponse.statusText}`);
      }

      // Validate and process the data through business logic layer
      const processedAgents = processAgentsBusinessLogic(agentsData);

      if (processedAgents.length === 0) {
        logger.info('No agent records available after processing, skipping auxiliary fetches', {
          event: 'AGENTS_EMPTY_DATASET',
          context: 'AgentsModule.fetchAgentDataWithRecovery'
        });

        setAgents([]);
        setSessions([]);
        setError(null);
        return;
      }

      // Fetch additional data if primary agents exist
      const sessionsData = await fetchSessionsData(processedAgents);
      const metricsData = await fetchMetricsData();
      
      // Enhance agents with system metrics
      const enhancedAgents = enhanceAgentsWithMetrics(processedAgents, metricsData);
      
      setAgents(enhancedAgents);
      setSessions(sessionsData);
      setError(null);
      
      logger.info('Agent data fetch completed successfully', { 
        event: 'AGENTS_FETCH_SUCCESS', 
        agentCount: enhancedAgents.length,
        sessionCount: sessionsData.length,
        context: 'AgentsModule.fetchAgentDataWithRecovery' 
      });
      
    } catch (err) {
      logger.error('Agent data fetch failed', { 
        event: 'AGENTS_FETCH_ERROR', 
        attempt: retryCount + 1,
        maxRetries: maxRetries + 1,
        error: String(err),
        context: 'AgentsModule.fetchAgentDataWithRecovery' 
      });

      // Autonomous recovery: retry with exponential backoff
      if (retryCount < maxRetries) {
        logger.info('Triggering automatic retry with exponential backoff', { 
          event: 'AGENTS_FETCH_RETRY', 
          retryCount: retryCount + 1,
          retryDelay,
          context: 'AgentsModule.fetchAgentDataWithRecovery' 
        });
        
        setTimeout(() => {
          fetchAgentDataWithRecovery(retryCount + 1);
        }, retryDelay);
        return;
      }

      // Final fallback: provide empty state with error
      logger.error('All retry attempts exhausted, entering error state', { 
        event: 'AGENTS_FETCH_FINAL_FAILURE', 
        totalAttempts: maxRetries + 1,
        context: 'AgentsModule.fetchAgentDataWithRecovery' 
      });
      
      setError(err instanceof Error ? err.message : 'Unknown error');
      setAgents([]); // Business logic: return empty array, not undefined
      setSessions([]);
    }
  };

  // Business logic layer: process raw agent data into structured format
  const processAgentsBusinessLogic = (agentsData: any[]): Agent[] => {
    return agentsData.map((agent: any, index: number) => {
      // Calculate real performance metrics from agent data
      const totalExecutions = agent.total_executions || 0;
      const successfulExecutions = agent.successful_executions || 0;
      const failedExecutions = agent.failed_executions || 0;
      const avgExecutionTime = agent.avg_execution_time || 0;
      
      // Real success rate calculation
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;
      
      // Real health calculation based on error rate and performance
      const errorRate = totalExecutions > 0 ? (failedExecutions / totalExecutions) * 100 : 0;
      const health = Math.max(0, Math.min(100, 100 - errorRate));
      
      return {
        id: agent.id || `agent_${index}`,
        name: agent.name || `Agent ${index + 1}`,
        type: agent.type || agent.agent_type || 'Unknown',
        status: (agent.status as 'active' | 'idle' | 'error' | 'stopped') || 'idle',
        health: Math.floor(health),
        lastActivity: agent.last_execution || agent.updated_at || new Date().toISOString(),
        totalTasks: totalExecutions,
        completedTasks: successfulExecutions,
        errorCount: failedExecutions,
        performance: {
          avgResponseTime: Math.floor(avgExecutionTime * 1000), // Convert to ms
          successRate: Math.floor(successRate * 10) / 10, // Round to 1 decimal
          throughput: agent.throughput_per_hour || 0
        },
        capabilities: agent.capabilities || getAgentCapabilities(agent.type || agent.agent_type || 'unknown')
      };
    });
  };

  // Business logic: fetch sessions data with fallback
  const fetchSessionsData = async (agents: Agent[]): Promise<AgentSession[]> => {
    if (agents.length === 0) {
      return [];
    }

    try {
      const agentId = agents[0].id;
      const sessionsResponse = await fetch(`/v1/agents/${agentId}/logs`);
      if (sessionsResponse.ok) {
        const rawSessions = await sessionsResponse.json();
        return ensureArray(rawSessions);
      }
    } catch (err) {
      logger.warn('Failed to fetch sessions, using empty array fallback', { 
        event: 'SESSIONS_FETCH_ERROR', 
        error: String(err),
        context: 'AgentsModule.fetchSessionsData' 
      });
    }
    
    return [];
  };

  // Business logic: fetch metrics data with fallback
  const fetchMetricsData = async (): Promise<any> => {
    try {
      const metricsResponse = await fetch('/v1/metrics');
      if (metricsResponse.ok) {
        return await metricsResponse.json();
      }
    } catch (err) {
      logger.warn('Failed to fetch metrics, using null fallback', { 
        event: 'METRICS_FETCH_ERROR', 
        error: String(err),
        context: 'AgentsModule.fetchMetricsData' 
      });
    }
    
    return null;
  };

  // Business logic: enhance agents with system metrics
  const enhanceAgentsWithMetrics = (agents: Agent[], metricsData: any): Agent[] => {
    const enhancedAgents = [...agents];
    
    // Add system-level agents based on metrics
    if (metricsData?.active_sessions > 0) {
      enhancedAgents.push({
        id: 'system_orchestrator',
        name: 'System Orchestrator',
        type: 'Core System',
        status: 'active',
        health: metricsData.ok ? 95 : 60,
        lastActivity: new Date().toISOString(),
        totalTasks: metricsData.total_requests || 0,
        completedTasks: Math.floor((metricsData.total_requests || 0) * 0.95),
        errorCount: metricsData.total_errors || 0,
        performance: {
          avgResponseTime: 120,
          successRate: (((metricsData.total_requests || 0) - (metricsData.total_errors || 0)) / Math.max(metricsData.total_requests || 1, 1)) * 100,
          throughput: metricsData.active_sessions || 0
        },
        capabilities: ['Request Orchestration', 'Session Management', 'Error Handling']
      });
    }
    
    return enhancedAgents;
  };

  // Fetch real agent data from backend
  const fetchAgentData = async () => {
    setLoading(true);
    setError(null);
    
    await fetchAgentDataWithRecovery();
    
    setLoading(false);
  };

  // Agent management actions
  const createAgentSession = async () => {
    try {
      const agentId = selectedAgent || (agents[0]?.id ?? 'quantum-001');
      const response = await fetch(`/v1/agents/${agentId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        await response.json();
        fetchAgentData();
      }
    } catch (err) {
      console.error('Failed to create agent session:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'idle': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      case 'stopped': return 'text-gray-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return Play;
      case 'idle': return Pause;
      case 'error': return AlertCircle;
      case 'stopped': return Square;
      default: return Clock;
    }
  };

  const formatLastActivity = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getAgentCapabilities = (agentType: string): string[] => {
    const capabilityMap: Record<string, string[]> = {
      'product_research': ['Product Discovery', 'Market Analysis', 'Trend Identification', 'Competitor Research'],
      'inventory_forecasting': ['Demand Prediction', 'Stock Management', 'Prophet Forecasting', 'Shopify Integration'],
      'marketing_automation': ['Email Campaigns', 'Customer Segmentation', 'A/B Testing', 'Behavioral Triggers'],
      'order_management': ['Risk Assessment', 'Supplier Routing', 'Tracking Sync', 'Return Processing'],
      'pricing_optimizer': ['Competitive Analysis', 'Dynamic Pricing', 'Margin Optimization', 'Market Intelligence'],
      'analytics': ['Revenue Analytics', 'Performance Tracking', 'Business Intelligence', 'Report Generation'],
      'customer_support': ['AI Chat', 'Ticket Resolution', 'Knowledge Base', 'Escalation Management'],
      'security': ['Fraud Detection', 'Risk Assessment', 'Compliance Monitoring', 'Threat Analysis']
    };
    
    return capabilityMap[agentType] || ['Task Processing', 'Data Analysis', 'Automation'];
  };

  useEffect(() => {
    fetchAgentData();
    
    // Set up real-time updates
    const interval = setInterval(fetchAgentData, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading && agents.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-lg text-cyan-400">Loading Agent Management System...</p>
        </div>
      </div>
    );
  }

  if (error && agents.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <p className="text-lg text-red-400 mb-4">Failed to load agent data</p>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchAgentData}
            className="px-4 py-2 bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 rounded-lg hover:bg-cyan-600/30"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Agent Management
            </h1>
            <p className="text-lg text-gray-400">Deploy, monitor, and optimize AI agents across your empire</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/40 rounded-lg border border-gray-700/30">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
              <span className="text-sm font-mono">
                {agents.filter(a => a.status === 'active').length} Active
              </span>
            </div>
            
            <button
              onClick={createAgentSession}
              className="px-4 py-2 bg-purple-600/20 border border-purple-500/30 text-purple-300 rounded-lg hover:bg-purple-600/30 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Session
            </button>
            
            <button
              onClick={fetchAgentData}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-cyan-400 rounded-lg hover:bg-gray-800/60 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {agents.map((agent, index) => {
          const StatusIcon = getStatusIcon(agent.status);
          
          return (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedAgent(selectedAgent === agent.id ? null : agent.id)}
              className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30 hover:border-purple-400/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative p-3 rounded-lg bg-black/40">
                    <Users className="w-6 h-6 text-purple-400" />
                    <StatusIcon className={`w-3 h-3 absolute -top-1 -right-1 ${getStatusColor(agent.status)}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{agent.name}</h3>
                    <p className="text-sm text-gray-400">{agent.type}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className={`text-sm font-mono ${getStatusColor(agent.status)} uppercase`}>
                    {agent.status}
                  </div>
                  <div className="text-xs text-gray-400">
                    Health: {agent.health}%
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Tasks Completed:</span>
                  <span className="text-green-400 font-mono">{agent.completedTasks}/{agent.totalTasks}</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Success Rate:</span>
                  <span className="text-cyan-400 font-mono">{agent.performance.successRate.toFixed(1)}%</span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Last Activity:</span>
                  <span className="text-white font-mono">{formatLastActivity(agent.lastActivity)}</span>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedAgent === agent.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 pt-4 border-t border-gray-700/50"
                >
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2">Performance Metrics</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-black/40 p-2 rounded">
                          <div className="text-gray-400">Avg Response</div>
                          <div className="text-white font-mono">{agent.performance.avgResponseTime}ms</div>
                        </div>
                        <div className="bg-black/40 p-2 rounded">
                          <div className="text-gray-400">Throughput</div>
                          <div className="text-white font-mono">{agent.performance.throughput}/min</div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2">Capabilities</h4>
                      <div className="flex flex-wrap gap-1">
                        {agent.capabilities.map((capability, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 rounded-full"
                          >
                            {capability}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Active Sessions */}
      {sessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30"
        >
          <h2 className="text-xl font-bold text-purple-400 mb-6 flex items-center">
            <MessageSquare className="w-5 h-5 mr-2" />
            Active Agent Sessions
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session, index) => (
              <div
                key={session.id}
                className="p-4 bg-black/40 rounded-lg border border-gray-700/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm text-white">Session {session.id.slice(-8)}</span>
                  <CheckCircle className="w-4 h-4 text-green-400" />
                </div>
                <div className="text-xs text-gray-400">
                  Status: <span className="text-green-400">{session.status}</span>
                </div>
                <div className="text-xs text-gray-400">
                  Created: {new Date(session.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}