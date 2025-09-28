import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  Zap, 
  Activity, 
  Shield, 
  MessageSquare,
  Play,
  RefreshCw,
  Settings,
  AlertTriangle,
  CheckCircle,
  Eye,
  Target
} from 'lucide-react';
import { useEmpireStore } from '../../store/empire-store';

interface AIRAStatus {
  online: boolean;
  processing: boolean;
  activeAgents: number;
  totalOperations: number;
  successRate: number;
  lastHeartbeat: string;
  systemHealth: 'excellent' | 'good' | 'degraded' | 'critical';
  capabilities: string[];
}

interface AIRAOperation {
  id: string;
  type: 'scan' | 'analyze' | 'optimize' | 'deploy' | 'fix';
  status: 'queued' | 'running' | 'completed' | 'failed';
  description: string;
  progress: number;
  startTime: string;
  duration?: number;
}

export default function AiraModule() {
  const [airaStatus, setAiraStatus] = useState<AIRAStatus>({
    online: true,
    processing: false,
    activeAgents: 3,
    totalOperations: 147,
    successRate: 94.7,
    lastHeartbeat: new Date().toISOString(),
    systemHealth: 'excellent',
    capabilities: [
      'Empire Analysis',
      'Code Generation', 
      'System Optimization',
      'Security Scanning',
      'Performance Monitoring',
      'Autonomous Decision Making'
    ]
  });

  const [operations, setOperations] = useState<AIRAOperation[]>([
    {
      id: 'op_001',
      type: 'scan',
      status: 'running',
      description: 'Comprehensive Empire Security Scan',
      progress: 67,
      startTime: new Date(Date.now() - 45000).toISOString()
    },
    {
      id: 'op_002', 
      type: 'optimize',
      status: 'completed',
      description: 'Database Query Optimization',
      progress: 100,
      startTime: new Date(Date.now() - 300000).toISOString(),
      duration: 234000
    },
    {
      id: 'op_003',
      type: 'analyze',
      status: 'queued',
      description: 'Revenue Pattern Analysis',
      progress: 0,
      startTime: new Date().toISOString()
    }
  ]);

  const [chatMode, setChatMode] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{
    type: 'user' | 'aira';
    message: string;
    timestamp: string;
  }>>([
    {
      type: 'aira',
      message: 'AIRA AI Empire Agent online. How may I assist with your empire operations today?',
      timestamp: new Date().toISOString()
    }
  ]);

  const { isConnected } = useEmpireStore();

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setAiraStatus(prev => ({
        ...prev,
        lastHeartbeat: new Date().toISOString(),
        totalOperations: prev.totalOperations + Math.floor(Math.random() * 3)
      }));

      // Update operation progress
      setOperations(prev => prev.map(op => {
        if (op.status === 'running') {
          return {
            ...op,
            progress: Math.min(100, op.progress + Math.floor(Math.random() * 5))
          };
        }
        return op;
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = {
      type: 'user' as const,
      message: chatInput.trim(),
      timestamp: new Date().toISOString()
    };

    setChatHistory(prev => [...prev, userMessage]);
    setChatInput('');

    // Simulate AIRA response
    setTimeout(() => {
      const responses = [
        'Analyzing request... I can help implement that functionality.',
        'Empire scan initiated. Monitoring system performance metrics.',
        'Deploying optimization protocols. Expected completion in 2.3 minutes.',
        'Security protocols updated. All systems remain secure.',
        'Performance metrics nominal. No issues detected.'
      ];

      const airaResponse = {
        type: 'aira' as const,
        message: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date().toISOString()
      };

      setChatHistory(prev => [...prev, airaResponse]);
    }, 1000);
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-cyan-400';
      case 'degraded': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case 'scan': return Eye;
      case 'analyze': return Brain;
      case 'optimize': return Zap;
      case 'deploy': return Play;
      case 'fix': return Settings;
      default: return Activity;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Brain className="w-12 h-12 text-cyan-400" />
              {airaStatus.online && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse" />
              )}
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
                AIRA
              </h1>
              <p className="text-lg text-gray-400">AI Empire Agent • Command Center Integration</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => setChatMode(!chatMode)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                chatMode 
                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                  : 'border-gray-600 text-gray-300 hover:border-cyan-400'
              }`}
            >
              <MessageSquare className="w-4 h-4 inline-block mr-2" />
              {chatMode ? 'Exit Chat' : 'Chat Mode'}
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Overview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-1 bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30"
        >
          <h2 className="text-xl font-bold text-cyan-400 mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            System Status
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Connection</span>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                )}
                <span className={isConnected ? 'text-green-400' : 'text-red-400'}>
                  {isConnected ? 'Online' : 'Offline'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-300">Health</span>
              <span className={getHealthColor(airaStatus.systemHealth)}>
                {airaStatus.systemHealth.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-300">Active Agents</span>
              <span className="text-white font-mono">{airaStatus.activeAgents}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-300">Total Operations</span>
              <span className="text-white font-mono">{airaStatus.totalOperations}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-300">Success Rate</span>
              <span className="text-green-400 font-mono">{airaStatus.successRate}%</span>
            </div>

            <div className="pt-4 border-t border-gray-700/50">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Capabilities</h3>
              <div className="space-y-1">
                {airaStatus.capabilities.map((capability, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                    <span className="text-sm text-gray-300">{capability}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content Area */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-2"
        >
          <AnimatePresence mode="wait">
            {chatMode ? (
              /* Chat Interface */
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-gray-900/40 backdrop-blur-sm rounded-2xl border border-gray-700/30 h-[600px] flex flex-col"
              >
                <div className="p-4 border-b border-gray-700/30">
                  <h2 className="text-xl font-bold text-cyan-400 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    AIRA Chat Interface
                  </h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] p-3 rounded-lg ${
                          message.type === 'user'
                            ? 'bg-cyan-600/20 text-cyan-100 border border-cyan-500/30'
                            : 'bg-gray-800/60 text-gray-100 border border-gray-700/50'
                        }`}
                      >
                        <p className="text-sm">{message.message}</p>
                        <span className="text-xs opacity-60 mt-1 block">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <form onSubmit={handleChatSubmit} className="p-4 border-t border-gray-700/30">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask AIRA anything about your empire..."
                      className="flex-1 px-4 py-2 bg-gray-800/60 border border-gray-700/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="px-4 py-2 bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 rounded-lg hover:bg-cyan-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              /* Operations Dashboard */
              <motion.div
                key="operations"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-cyan-400 flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Active Operations
                  </h2>
                  <button className="p-2 text-gray-400 hover:text-cyan-400 rounded-lg hover:bg-gray-800/60">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4">
                  {operations.map((operation) => {
                    const OperationIcon = getOperationIcon(operation.type);
                    
                    return (
                      <div
                        key={operation.id}
                        className="p-4 bg-black/40 rounded-lg border border-gray-700/50"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <OperationIcon className="w-5 h-5 text-cyan-400" />
                            <div>
                              <h3 className="font-medium text-white">{operation.description}</h3>
                              <p className="text-sm text-gray-400 capitalize">
                                {operation.type} • {operation.status}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {operation.status === 'running' && (
                              <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
                            )}
                            {operation.status === 'completed' && (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            )}
                            {operation.status === 'failed' && (
                              <AlertTriangle className="w-4 h-4 text-red-400" />
                            )}
                            <span className="text-sm font-mono text-gray-300">
                              {operation.progress}%
                            </span>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-800/60 rounded-full h-2">
                          <motion.div
                            className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-magenta-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${operation.progress}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Actions */}
                <div className="mt-8 pt-6 border-t border-gray-700/50">
                  <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button className="p-3 bg-black/40 rounded-lg border border-gray-700/50 text-left hover:border-cyan-400/50 transition-colors">
                      <Target className="w-5 h-5 text-cyan-400 mb-2" />
                      <div className="text-sm font-medium text-white">Empire Scan</div>
                      <div className="text-xs text-gray-400">Full system analysis</div>
                    </button>
                    
                    <button className="p-3 bg-black/40 rounded-lg border border-gray-700/50 text-left hover:border-cyan-400/50 transition-colors">
                      <Zap className="w-5 h-5 text-yellow-400 mb-2" />
                      <div className="text-sm font-medium text-white">Optimize</div>
                      <div className="text-xs text-gray-400">Performance tuning</div>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}