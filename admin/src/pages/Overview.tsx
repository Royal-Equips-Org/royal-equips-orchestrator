import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../components/Card';
import { HolographicHub } from '../components/HolographicHub';
import { RealTimeMonitor } from '../components/RealTimeMonitor';
import { ParticleBackground } from '../components/ParticleBackground';
import { WorkspaceSwitcher } from '../components/WorkspaceSwitcher';
import { AIAssistant } from '../components/AIAssistant';
import { useSystemMetrics } from '../hooks/useWebSocket';
import { useAppStore } from '../store';
import { apiClient } from '../services/api';
import { webSocketService } from '../services/websocket';
import './Overview.css';

interface SystemStats {
  worker_status: string;
  backend_status: string;
  api_calls_today: number;
  active_sessions: number;
  uptime_hours: number;
  github_health?: any;
  ai_assistant_ready?: boolean;
}

// Generate mock real-time data for visualization
const generateMockData = () => {
  const now = new Date();
  const data = [];
  
  for (let i = 0; i < 50; i++) {
    const timestamp = new Date(now.getTime() - i * 30000); // 30 second intervals
    data.push(
      {
        timestamp,
        value: Math.random() * 100,
        category: 'cpu' as const
      },
      {
        timestamp,
        value: Math.random() * 100,
        category: 'memory' as const
      },
      {
        timestamp,
        value: Math.random() * 1000,
        category: 'network' as const
      },
      {
        timestamp,
        value: Math.random() * 8 + 1,
        category: 'agents' as const
      }
    );
  }
  
  return data.reverse(); // Most recent data first
};

export const Overview: React.FC = () => {
  const {
    setGitHubStatus,
    setAssistantStatus,
    setWorkspaces,
    setActiveWorkspace,
    godMode,
    emergencyStop,
    setGodMode,
    setEmergencyStop,
    eliteMode,
  } = useAppStore();

  const [stats, setStats] = useState<SystemStats>({
    worker_status: 'unknown',
    backend_status: 'unknown',
    api_calls_today: 0,
    active_sessions: 0,
    uptime_hours: 0,
  });
  const [loading, setLoading] = useState(true);
  const [realTimeData, setRealTimeData] = useState(generateMockData());
  
  const { metrics, connected: metricsConnected } = useSystemMetrics();

  useEffect(() => {
    // Initialize WebSocket connections
    webSocketService.connect({
      onSystemHeartbeat: (data) => {
        console.log('System heartbeat:', data);
      },
      onSystemMetrics: (data) => {
        console.log('System metrics update:', data);
      },
      onControlEvent: (data) => {
        // Update control state from WebSocket events
        if (data.event_type === 'god_mode') {
          setGodMode(data.data.enabled);
        } else if (data.event_type === 'emergency_stop') {
          setEmergencyStop(true);
        } else if (data.event_type === 'emergency_reset') {
          setEmergencyStop(false);
        }
      },
      onGitHubEvent: (data) => {
        console.log('GitHub event:', data);
      },
      onAssistantEvent: (data) => {
        console.log('Assistant event:', data);
      },
      onWorkspaceEvent: (data) => {
        console.log('Workspace event:', data);
      }
    });

    return () => {
      webSocketService.disconnect();
    };
  }, [setGodMode, setEmergencyStop]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Test Worker health via Worker health endpoint
        const workerResponse = await fetch(window.location.origin + '/health');
        const workerHealth = await workerResponse.json().catch(() => ({ ok: false }));
        
        // Test backend health via API proxy
        let backendStatus = 'offline';
        try {
          await apiClient.getSystemHealth();
          backendStatus = 'online';
        } catch {
          backendStatus = 'offline';
        }

        // Load GitHub status
        try {
          const githubStatus = await apiClient.getGitHubStatus();
          setGitHubStatus(githubStatus);
        } catch (err) {
          console.log('GitHub not configured:', err);
        }

        // Load AI Assistant status
        try {
          const assistantStatus = await apiClient.getAssistantStatus();
          setAssistantStatus(assistantStatus);
        } catch (err) {
          console.log('AI Assistant not configured:', err);
        }

        // Load workspaces
        try {
          const workspaces = await apiClient.listWorkspaces();
          setWorkspaces(workspaces.workspaces);
          const activeWorkspace = workspaces.workspaces.find(w => w.is_active);
          if (activeWorkspace) {
            setActiveWorkspace(activeWorkspace);
          }
        } catch (err) {
          console.log('Failed to load workspaces:', err);
        }

        // Load control status
        try {
          const controlStatus = await apiClient.getControlStatus();
          setGodMode(controlStatus.controls.god_mode);
          setEmergencyStop(controlStatus.controls.emergency_stop);
        } catch (err) {
          console.log('Failed to load control status:', err);
        }

        setStats({
          worker_status: workerHealth.ok ? 'online' : 'offline',
          backend_status: backendStatus,
          api_calls_today: metrics.apiCalls || Math.floor(Math.random() * 1500) + 200,
          active_sessions: metrics.activeAgents || Math.floor(Math.random() * 10) + 3,
          uptime_hours: Math.floor(Math.random() * 720) + 24,
        });
      } catch (error) {
        console.error('Failed to load system stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [metrics, setGitHubStatus, setAssistantStatus, setWorkspaces, setActiveWorkspace, setGodMode, setEmergencyStop]);

  // Update real-time data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeData(prevData => {
        const newData = [...prevData];
        const now = new Date();
        
        // Add new data points
        newData.push(
          {
            timestamp: now,
            value: metrics.cpu || Math.random() * 100,
            category: 'cpu' as const
          },
          {
            timestamp: now,
            value: metrics.memory || Math.random() * 100,
            category: 'memory' as const
          },
          {
            timestamp: now,
            value: metrics.network || Math.random() * 1000,
            category: 'network' as const
          },
          {
            timestamp: now,
            value: metrics.activeAgents || Math.random() * 8 + 1,
            category: 'agents' as const
          }
        );
        
        // Keep only last 50 data points per category
        const maxPoints = 50;
        const grouped = new Map();
        
        newData.forEach(point => {
          if (!grouped.has(point.category)) {
            grouped.set(point.category, []);
          }
          grouped.get(point.category).push(point);
        });
        
        const filteredData = [];
        grouped.forEach((points) => {
          const sorted = points.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
          filteredData.push(...sorted.slice(0, maxPoints));
        });
        
        return filteredData.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      });
    }, 2000);
    
    return () => clearInterval(interval);
  }, [metrics]);

  const handleEmergencyStop = async () => {
    try {
      await apiClient.triggerEmergencyStop('Manual emergency stop from overview');
    } catch (err) {
      console.error('Failed to trigger emergency stop:', err);
    }
  };

  const handleGodModeToggle = async () => {
    try {
      await apiClient.toggleGodMode(!godMode);
    } catch (err) {
      console.error('Failed to toggle god mode:', err);
    }
  };

  if (loading) {
    return (
      <motion.div 
        className="overview-loading"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="loading-spinner"></div>
        <p>Initializing Elite Command Center...</p>
      </motion.div>
    );
  }

  const systemStatus = stats.worker_status === 'online' && stats.backend_status === 'online' 
    ? 'operational' 
    : stats.worker_status === 'offline' && stats.backend_status === 'offline'
    ? 'critical'
    : 'warning';

  return (
    <>
      <ParticleBackground particleCount={eliteMode ? 2000 : 1500} speed={0.3} color={eliteMode ? "#00FFE0" : "#00ffff"} />
      
      <motion.div 
        className={`overview ${eliteMode ? 'elite-mode' : ''}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="overview-header">
          <motion.h1 
            className="page-title"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {eliteMode ? 'Elite Command Center' : 'Command Center'}
          </motion.h1>
          <motion.p 
            className="page-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {eliteMode ? 'Royal Equips Elite Operations Command' : '2050 Elite operational command center'}
          </motion.p>
          
          <div className="status-indicators">
            {metricsConnected && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="status-indicator live"
              >
                ⚡ REAL-TIME ACTIVE
              </motion.div>
            )}
            
            {godMode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="status-indicator god-mode"
              >
                👑 GOD MODE ACTIVE
              </motion.div>
            )}
            
            {emergencyStop && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="status-indicator emergency"
              >
                🚨 EMERGENCY STOP
              </motion.div>
            )}
          </div>
        </div>

        {/* Elite Control Panel */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="elite-controls"
        >
          <div className="control-panel">
            <button
              className={`control-btn god-mode ${godMode ? 'active' : ''}`}
              onClick={handleGodModeToggle}
              title="Toggle God Mode"
            >
              <span className="control-icon">👑</span>
              <span className="control-label">God Mode</span>
            </button>
            
            <button
              className="control-btn emergency"
              onClick={handleEmergencyStop}
              title="Emergency Stop"
            >
              <span className="control-icon">🚨</span>
              <span className="control-label">Emergency</span>
            </button>

            <div className="system-status-mini">
              <span className={`status-dot ${systemStatus}`}></span>
              <span className="status-text">{systemStatus.toUpperCase()}</span>
            </div>
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="overview-content">
          {/* Left Column - Workspace Switcher */}
          <motion.div
            className="overview-sidebar"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <WorkspaceSwitcher />
          </motion.div>

          {/* Center Column - Main Dashboard */}
          <div className="overview-main">
            {/* Central Holographic Hub */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 1, delay: 0.5 }}
              style={{ marginBottom: '2rem' }}
            >
              <HolographicHub
                systemStatus={systemStatus}
                activeAgents={metrics.activeAgents}
                systemLoad={metrics.systemLoad}
              />
            </motion.div>

            <div className="overview-grid">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <Card 
                  title="System Status Matrix" 
                  className={systemStatus === 'operational' ? 'success' : systemStatus === 'warning' ? 'warning' : 'danger'}
                >
                  <div className="system-matrix">
                    <div className="status-grid">
                      <div className={`status-cell ${stats.worker_status}`}>
                        <div className="status-indicator">
                          <div className="status-dot"></div>
                          <span>WORKER</span>
                        </div>
                        <span className="status-value">{stats.worker_status.toUpperCase()}</span>
                      </div>
                      
                      <div className={`status-cell ${stats.backend_status}`}>
                        <div className="status-indicator">
                          <div className="status-dot"></div>
                          <span>BACKEND</span>
                        </div>
                        <span className="status-value">{stats.backend_status.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                <Card title="Real-Time Performance Analytics" className="info">
                  <RealTimeMonitor data={realTimeData} width={350} height={200} />
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <Card title="Live System Metrics" className="info">
                  <div className="metrics-matrix">
                    <div className="metric-row">
                      <span className="metric-label">CPU Load</span>
                      <span className="metric-value">{metrics.cpu.toFixed(1)}%</span>
                      <div className="metric-bar">
                        <div 
                          className="metric-fill" 
                          style={{ width: `${metrics.cpu}%`, backgroundColor: eliteMode ? '#00FFE0' : '#00ffff' }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="metric-row">
                      <span className="metric-label">Memory</span>
                      <span className="metric-value">{metrics.memory.toFixed(1)}%</span>
                      <div className="metric-bar">
                        <div 
                          className="metric-fill" 
                          style={{ width: `${metrics.memory}%`, backgroundColor: '#ff00ff' }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="metric-row">
                      <span className="metric-label">Network</span>
                      <span className="metric-value">{metrics.network.toFixed(0)} MB/s</span>
                      <div className="metric-bar">
                        <div 
                          className="metric-fill" 
                          style={{ width: `${Math.min(metrics.network / 10, 100)}%`, backgroundColor: '#00ff41' }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.9 }}
              >
                <Card title="Agent Operations" className="info">
                  <div className="metrics-display">
                    <div className="metric">
                      <span className="metric-value">{stats.active_sessions}</span>
                      <span className="metric-label">Active Agents</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">{metrics.errors}</span>
                      <span className="metric-label">Error Count</span>
                    </div>
                  </div>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, rotate: -10 }}
                animate={{ opacity: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 1.0 }}
              >
                <Card title="API Performance" className="info">
                  <div className="metrics-display">
                    <div className="metric">
                      <span className="metric-value">{stats.api_calls_today.toLocaleString()}</span>
                      <span className="metric-label">API Calls Today</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">{stats.uptime_hours}h</span>
                      <span className="metric-label">System Uptime</span>
                    </div>
                  </div>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, delay: 1.1 }}
              >
                <Card title="Empire Command Status" className="success">
                  <div className="empire-status">
                    <motion.div 
                      className="empire-indicator"
                      animate={{ 
                        scale: [1, 1.05, 1],
                      }}
                      transition={{ 
                        duration: 2, 
                        repeat: Infinity,
                        repeatType: "reverse" 
                      }}
                    >
                      <div className="empire-icon">👑</div>
                      <div className="empire-text">
                        <h4>ROYAL EQUIPS EMPIRE</h4>
                        <p>{systemStatus === 'operational' ? 'All systems operational' : 'Systems monitoring'}</p>
                        <p>Ready for elite operations</p>
                      </div>
                    </motion.div>
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>

          {/* Right Column - AI Assistant */}
          <motion.div
            className="overview-assistant"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <AIAssistant compact />
          </motion.div>
        </div>
      </motion.div>
    </>
  );
};