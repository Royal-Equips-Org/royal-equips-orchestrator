// AIRA AI Chat Interface Component - Production Integration
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Mic, 
  MicOff, 
  Bot, 
  User, 
  Zap,
  Brain,
  Search,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useEmpireStore, useChatMessages } from '@/store/empire-store';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/empire';

// AIRA API Configuration
const AIRA_API_URL = '';

interface AIRAResponse {
  content: string;
  agent_name: string;
  plan?: {
    goal: string;
    actions: Array<{
      type: string;
      args: Record<string, any>;
    }>;
  };
  risk?: {
    level: 'LOW' | 'MEDIUM' | 'HIGH';
    score: number;
  };
  verifications?: Array<{
    type: string;
    result: string;
    pass: boolean;
  }>;
  approvals?: Array<{
    reason: string;
    risk: number;
  }>;
  tool_calls?: Array<{
    tool: string;
    args: Record<string, any>;
    dry_run: boolean;
  }>;
  next_steps?: string[];
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.sender === 'user';

  const getAvatar = () => {
    if (isUser) return <User className="w-4 h-4" />;
    return <Brain className="w-4 h-4" />;
  };

  const getAvatarBg = () => {
    if (isUser) return 'bg-blue-500';
    return 'bg-green-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3 mb-4",
        isUser && "flex-row-reverse"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0",
        getAvatarBg()
      )}>
        {getAvatar()}
      </div>

      {/* Message */}
      <div className={cn(
        "max-w-[85%] px-4 py-3 rounded-lg",
        isUser 
          ? "bg-blue-500/20 text-blue-100 border border-blue-500/30" 
          : "bg-gray-800/50 text-gray-100 border border-gray-700"
      )}>
        <div className="text-sm whitespace-pre-wrap leading-relaxed">
          {message.content}
        </div>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-600/30">
          <div className="text-xs opacity-50">
            {message.timestamp.toLocaleTimeString()}
          </div>
          {message.agentName && (
            <div className="text-xs font-medium text-green-400">
              {message.agentName}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function QuickActions({ onAction }: { onAction: (action: string) => void }) {
  const actions = [
    { label: "Agent Status", icon: Bot, action: "Show me the current status of all agents" },
    { label: "Revenue Report", icon: Zap, action: "What's our current revenue progress and performance?" },
    { label: "Product Research", icon: Search, action: "Run product research on trending items" },
    { label: "System Health", icon: Settings, action: "Check the health status of all services" }
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {actions.map((action) => (
        <motion.button
          key={action.label}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onAction(action.action)}
          className="px-3 py-1 text-xs bg-gray-700/50 hover:bg-gray-600/50 rounded-full border border-gray-600 flex items-center space-x-1 transition-colors"
        >
          <action.icon className="w-3 h-3" />
          <span>{action.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

function AIRAStatusIndicator({ response }: { response?: AIRAResponse }) {
  if (!response?.risk) return null;

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'HIGH': return 'text-red-400 bg-red-500/20 border-red-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'LOW': return <CheckCircle className="w-3 h-3" />;
      case 'MEDIUM': return <AlertTriangle className="w-3 h-3" />;
      case 'HIGH': return <XCircle className="w-3 h-3" />;
      default: return <AlertTriangle className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex items-center justify-between px-3 py-2 mb-3 rounded-lg border bg-gray-800/30 border-gray-700">
      <div className="flex items-center space-x-2">
        <Brain className="w-4 h-4 text-hologram" />
        <span className="text-sm font-medium text-hologram">AIRA Analysis</span>
      </div>
      <div className={cn(
        "flex items-center space-x-1 px-2 py-1 rounded-full border text-xs font-medium",
        getRiskColor(response.risk.level)
      )}>
        {getRiskIcon(response.risk.level)}
        <span>{response.risk.level}</span>
        <span className="opacity-70">({(response.risk.score * 100).toFixed(0)}%)</span>
      </div>
    </div>
  );
}

export default function AIChatInterface() {
  const chatMessages = useChatMessages();
  const sendUserChat = useEmpireStore(state => state.sendUserChat);
  
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAIRAResponse, setLastAIRAResponse] = useState<AIRAResponse | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const _sendToAIRA = async (userMessage: string): Promise<AIRAResponse> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000); // 15 seconds timeout
    try {
      const response = await fetch(`${AIRA_API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: userMessage,
          context: {
            timestamp: new Date().toISOString(),
            source: 'command_center_ui'
          }
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`AIRA API Error: ${response.status} ${response.statusText}`);
      }

      return response.json();
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('AIRA API request timed out. Please try again later.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim() || isProcessing) return;

    setMessage('');
    setIsProcessing(true);
    setLastAIRAResponse(null);

    try {
      // Use the store's sendUserChat method which handles optimistic updates
      await sendUserChat(message);
    } catch (error) {
      console.error('Chat send error:', error);
      // Error handling is done in the store
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickAction = (action: string) => {
    setMessage(action);
  };

  const toggleVoice = () => {
    setIsListening(!isListening);
    // Voice recognition would be implemented here
  };

  return (
    <div className="h-[500px] flex flex-col bg-black/40 backdrop-blur-md border border-cyan-500/30 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-hologram" />
          <h3 className="text-lg font-semibold text-hologram">AIRA Assistant</h3>
        </div>
        <div className="text-xs text-gray-400">
          Main Empire Agent
        </div>
      </div>

      {/* AIRA Status */}
      {lastAIRAResponse && (
        <div className="px-4 pt-3">
          <AIRAStatusIndicator response={lastAIRAResponse} />
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <AnimatePresence>
          {chatMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>
        
        {/* Processing Indicator */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 mb-4"
          >
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
              <Brain className="w-4 h-4" />
            </div>
            <div className="bg-gray-800/50 px-4 py-3 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-hologram rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-hologram rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-hologram rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
                <span className="text-sm text-hologram">AIRA is analyzing...</span>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4">
        <QuickActions onAction={handleQuickAction} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder="Ask AIRA anything about your empire..."
              disabled={isProcessing}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-hologram pr-10 disabled:opacity-50"
            />
            
            {/* Voice Button */}
            <button
              onClick={toggleVoice}
              disabled={isProcessing}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded disabled:opacity-50",
                isListening 
                  ? "text-red-400 bg-red-500/20" 
                  : "text-gray-400 hover:text-white"
              )}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendMessage}
            disabled={!message.trim() || isProcessing}
            className="px-4 py-2 bg-hologram hover:bg-hologram/80 text-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
        
        <div className="text-xs text-gray-500 mt-2 text-center">
          💡 Try: "Deploy to production", "Check agent status", "Analyze sales performance"
        </div>
      </div>
    </div>
  );
}