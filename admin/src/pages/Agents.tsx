import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/Card';
import { useAgentStatus } from '../hooks/useWebSocket';
import { ParticleBackground } from '../components/ParticleBackground';
import { apiClient } from '../utils/api';
import './Agents.css';

interface Agent {
  id: string;
  name: string;
  status: 'running' | 'idle' | 'error';
  lastRun: Date;
  performance: {
    speed: number;
    successRate: number;
    errors: number;
  };
  currentTask?: string;
  resources?: {
    cpu: number;
    memory: number;
  };
}

export const Agents: React.FC = () => {
  const { agents: liveAgents, connected } = useAgentStatus();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [godMode, setGodMode] = useState(false);
  const [emergencyStop, setEmergencyStop] = useState(false);

  // Enhanced mock data when WebSocket is not available
  const [agents, setAgents] = useState<Agent[]>([
    {
      id: 'product_research',
      name: 'Product Research Agent',
      status: 'running',
      lastRun: new Date(Date.now() - 300000), // 5 minutes ago
      performance: { speed: 95.2, successRate: 98.7, errors: 2 },
      currentTask: 'Analyzing trending automotive accessories',
      resources: { cpu: 23.4, memory: 67.8 }
    },
    {
      id: 'inventory_forecasting',
      name: 'Inventory Forecasting Agent',
      status: 'running',
      lastRun: new Date(Date.now() - 1800000), // 30 minutes ago
      performance: { speed: 87.3, successRate: 96.4, errors: 1 },
      currentTask: 'Updating demand predictions for Q2',
      resources: { cpu: 45.2, memory: 82.3 }
    },
    {
      id: 'pricing_optimizer',
      name: 'Pricing Optimizer Agent',
      status: 'idle',
      lastRun: new Date(Date.now() - 3600000), // 1 hour ago
      performance: { speed: 92.1, successRate: 94.8, errors: 4 },
      resources: { cpu: 12.1, memory: 34.5 }
    },
    {
      id: 'marketing_automation',
      name: 'Marketing Automation Agent',
      status: 'running',
      lastRun: new Date(Date.now() - 600000), // 10 minutes ago
      performance: { speed: 88.9, successRate: 97.2, errors: 1 },
      currentTask: 'Generating email campaign content',
      resources: { cpu: 38.7, memory: 71.2 }
    },
    {
      id: 'customer_support',
      name: 'Customer Support Agent',
      status: 'error',
      lastRun: new Date(Date.now() - 7200000), // 2 hours ago
      performance: { speed: 76.4, successRate: 89.3, errors: 8 },
      resources: { cpu: 8.3, memory: 28.9 }
    },
    {
      id: 'order_management',
      name: 'Order Management Agent',
      status: 'running',
      lastRun: new Date(Date.now() - 120000), // 2 minutes ago
      performance: { speed: 93.7, successRate: 99.1, errors: 0 },
      currentTask: 'Processing order fulfillment batch',
      resources: { cpu: 29.8, memory: 55.6 }
    }
  ]);

  // Update agents with live data when available
  useEffect(() => {
    if (connected && liveAgents.length > 0) {
      setAgents(liveAgents.map(agent => ({
        ...agent,
        resources: {
          cpu: Math.random() * 100,
          memory: Math.random() * 100
        }
      })));
    }
  }, [liveAgents, connected]);

  const handleAgentCommand = async (agentId: string, command: 'start' | 'stop' | 'restart') => {
    try {
      // Simulate API call
      console.log(`${command}ing agent ${agentId}`);
      
      // Update local state optimistically
      setAgents(prev => prev.map(agent => 
        agent.id === agentId 
          ? {
              ...agent,
              status: command === 'start' ? 'running' : command === 'stop' ? 'idle' : 'running',
              lastRun: command !== 'stop' ? new Date() : agent.lastRun
            }
          : agent
      ));
    } catch (error) {
      console.error(`Failed to ${command} agent:`, error);
    }
  };

  const handleGodMode = () => {
    setGodMode(!godMode);
    if (!godMode) {
      // Start all agents in god mode
      setAgents(prev => prev.map(agent => ({
        ...agent,
        status: 'running' as const,
        lastRun: new Date()
      })));
    }
  };

  const handleEmergencyStop = () => {
    setEmergencyStop(true);
    setAgents(prev => prev.map(agent => ({
      ...agent,
      status: 'idle' as const,
      currentTask: undefined
    })));
    
    setTimeout(() => setEmergencyStop(false), 3000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return '#00ff41';
      case 'idle': return '#ffaa00';
      case 'error': return '#ff4444';
      default: return '#888888';
    }
  };

  const getPerformanceLevel = (performance: Agent['performance']) => {
    const avg = (performance.speed + performance.successRate) / 2;
    if (avg >= 95) return { level: 'Excellent', color: '#00ff41' };
    if (avg >= 85) return { level: 'Good', color: '#ffaa00' };
    if (avg >= 70) return { level: 'Fair', color: '#ff8800' };
    return { level: 'Poor', color: '#ff4444' };
  };

  return (
    <>
      <ParticleBackground particleCount={1000} speed={0.2} color="#ff00ff" />
      
      <motion.div 
        className="agents"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="agents-header">
          <motion.h1 
            className="page-title"
            initial={{ y: -50 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Agent Command Center
          </motion.h1>
          <motion.p 
            className="page-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Multi-Agent orchestration and monitoring
          </motion.p>
          
          {connected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              style={{ 
                display: 'inline-block', 
                background: 'rgba(255, 0, 255, 0.2)', 
                padding: '4px 12px', 
                borderRadius: '16px',
                border: '1px solid #ff00ff',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#ff00ff',
                marginTop: '8px'
              }}
            >
              🔮 NEURAL LINK ACTIVE
            </motion.div>
          )}
        </div>

        {/* Master Control Panel */}
        <motion.div 
          className="master-control-panel"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Card title="Master Control Interface" className="control-card">
            <div className="control-buttons">
              <motion.button
                className={`god-mode-btn ${godMode ? 'active' : ''}`}
                onClick={handleGodMode}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="btn-icon">⚡</span>
                {godMode ? 'GOD MODE ACTIVE' : 'ENABLE GOD MODE'}
              </motion.button>
              
              <motion.button
                className={`emergency-stop-btn ${emergencyStop ? 'active' : ''}`}
                onClick={handleEmergencyStop}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={emergencyStop}
              >
                <span className="btn-icon">🛑</span>
                {emergencyStop ? 'STOPPING...' : 'EMERGENCY STOP'}
              </motion.button>
              
              <div className="system-stats">
                <div className="stat">
                  <span className="stat-value">{agents.filter(a => a.status === 'running').length}</span>
                  <span className="stat-label">ACTIVE</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{agents.filter(a => a.status === 'error').length}</span>
                  <span className="stat-label">ERRORS</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{Math.round(agents.reduce((acc, a) => acc + a.performance.successRate, 0) / agents.length)}%</span>
                  <span className="stat-label">AVG SUCCESS</span>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Agent Status Cards */}
        <motion.div 
          className="agents-grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <AnimatePresence>
            {agents.map((agent, index) => {
              const perfLevel = getPerformanceLevel(agent.performance);
              
              return (
                <motion.div
                  key={agent.id}
                  layout
                  initial={{ opacity: 0, y: 50, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  onClick={() => setSelectedAgent(agent)}
                  className="agent-card-wrapper"
                >
                  <Card 
                    title={agent.name} 
                    className={`agent-card ${agent.status}`}
                  >
                    <div className="agent-status-header">
                      <div className="status-indicator">
                        <motion.div 
                          className="status-dot"
                          style={{ backgroundColor: getStatusColor(agent.status) }}
                          animate={{
                            scale: agent.status === 'running' ? [1, 1.2, 1] : 1,
                            opacity: agent.status === 'running' ? [1, 0.6, 1] : 0.8
                          }}
                          transition={{ 
                            duration: 2, 
                            repeat: agent.status === 'running' ? Infinity : 0 
                          }}
                        />
                        <span className="status-text">{agent.status.toUpperCase()}</span>
                      </div>
                      
                      <div className="performance-badge" style={{ color: perfLevel.color }}>
                        {perfLevel.level}
                      </div>
                    </div>

                    {agent.currentTask && (
                      <motion.div 
                        className="current-task"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        <span className="task-label">Current Task:</span>
                        <span className="task-text">{agent.currentTask}</span>
                      </motion.div>
                    )}

                    <div className="agent-metrics">
                      <div className="metric-row">
                        <span className="metric-label">Speed</span>
                        <div className="metric-bar">
                          <motion.div
                            className="metric-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${agent.performance.speed}%` }}
                            transition={{ duration: 1, delay: 0.3 }}
                            style={{ backgroundColor: '#00ffff' }}
                          />
                        </div>
                        <span className="metric-value">{agent.performance.speed.toFixed(1)}%</span>
                      </div>

                      <div className="metric-row">
                        <span className="metric-label">Success</span>
                        <div className="metric-bar">
                          <motion.div
                            className="metric-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${agent.performance.successRate}%` }}
                            transition={{ duration: 1, delay: 0.4 }}
                            style={{ backgroundColor: '#00ff41' }}
                          />
                        </div>
                        <span className="metric-value">{agent.performance.successRate.toFixed(1)}%</span>
                      </div>

                      {agent.resources && (
                        <>
                          <div className="metric-row">
                            <span className="metric-label">CPU</span>
                            <div className="metric-bar">
                              <motion.div
                                className="metric-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${agent.resources.cpu}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                                style={{ backgroundColor: '#ff00ff' }}
                              />
                            </div>
                            <span className="metric-value">{agent.resources.cpu.toFixed(1)}%</span>
                          </div>
                          
                          <div className="metric-row">
                            <span className="metric-label">Memory</span>
                            <div className="metric-bar">
                              <motion.div
                                className="metric-fill"
                                initial={{ width: 0 }}
                                animate={{ width: `${agent.resources.memory}%` }}
                                transition={{ duration: 1, delay: 0.6 }}
                                style={{ backgroundColor: '#ffaa00' }}
                              />
                            </div>
                            <span className="metric-value">{agent.resources.memory.toFixed(1)}%</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="agent-controls">
                      <motion.button
                        className="control-btn start"
                        onClick={(e) => { e.stopPropagation(); handleAgentCommand(agent.id, 'start'); }}
                        disabled={agent.status === 'running'}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        ▶
                      </motion.button>
                      
                      <motion.button
                        className="control-btn stop"
                        onClick={(e) => { e.stopPropagation(); handleAgentCommand(agent.id, 'stop'); }}
                        disabled={agent.status === 'idle'}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        ⏸
                      </motion.button>
                      
                      <motion.button
                        className="control-btn restart"
                        onClick={(e) => { e.stopPropagation(); handleAgentCommand(agent.id, 'restart'); }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        🔄
                      </motion.button>
                    </div>

                    <div className="last-run">
                      <span>Last run: {agent.lastRun.toLocaleTimeString()}</span>
                      {agent.performance.errors > 0 && (
                        <span className="error-count">
                          {agent.performance.errors} errors
                        </span>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </>
  );
};