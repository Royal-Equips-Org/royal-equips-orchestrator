// AI Chat Interface Component
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
  Settings
} from 'lucide-react';
import { useChatMessages, useEmpireStore } from '@/store/empire-store';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/types/empire';

const mockMessages: ChatMessage[] = [
  {
    id: "msg_001",
    role: "assistant",
    content: "👑 Royal Equips Empire Command Center online. I'm your Master AI Assistant. How can I help you manage your empire today?",
    timestamp: new Date(Date.now() - 300000),
    agent_id: "master_ai"
  },
  {
    id: "msg_002", 
    role: "user",
    content: "Show me the current status of all agents",
    timestamp: new Date(Date.now() - 240000)
  },
  {
    id: "msg_003",
    role: "assistant", 
    content: "Here's your current agent status:\n\n🔍 **Product Research Agent**: ACTIVE - 127 discoveries, 89% success rate\n🏭 **Supplier Intelligence**: ACTIVE - 89 suppliers vetted\n🤖 **Master Coordinator**: ACTIVE - Managing 6 workflows\n⚠️ **Marketing Agent**: ERROR - API connection failed\n\nWould you like me to restart the Marketing Agent?",
    timestamp: new Date(Date.now() - 200000),
    agent_id: "master_ai"
  }
];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isAgent = message.role === 'agent';

  const getAvatar = () => {
    if (isUser) return <User className="w-4 h-4" />;
    if (isAgent) return <Zap className="w-4 h-4" />;
    return <Brain className="w-4 h-4" />;
  };

  const getAvatarBg = () => {
    if (isUser) return 'bg-blue-500';
    if (isAgent) return 'bg-purple-500';
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
        "w-8 h-8 rounded-full flex items-center justify-center text-white",
        getAvatarBg()
      )}>
        {getAvatar()}
      </div>

      {/* Message */}
      <div className={cn(
        "max-w-[70%] px-4 py-2 rounded-lg",
        isUser 
          ? "bg-blue-500/20 text-blue-100 border border-blue-500/30" 
          : "bg-gray-800/50 text-gray-100 border border-gray-700"
      )}>
        <div className="text-sm whitespace-pre-wrap">
          {message.content}
        </div>
        <div className="text-xs opacity-50 mt-1">
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </motion.div>
  );
}

function QuickActions({ onAction }: { onAction: (action: string) => void }) {
  const actions = [
    { label: "Agent Status", icon: Bot, action: "status" },
    { label: "Revenue Report", icon: Zap, action: "revenue" },
    { label: "Product Research", icon: Search, action: "research" },
    { label: "System Settings", icon: Settings, action: "settings" }
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {actions.map((action) => (
        <motion.button
          key={action.action}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onAction(action.action)}
          className="px-3 py-1 text-xs bg-gray-700/50 hover:bg-gray-600/50 rounded-full border border-gray-600 flex items-center space-x-1"
        >
          <action.icon className="w-3 h-3" />
          <span>{action.label}</span>
        </motion.button>
      ))}
    </div>
  );
}

export default function AIChatInterface() {
  const chatMessages = useChatMessages();
  const { addChatMessage } = useEmpireStore();
  
  // Use mock messages if none in store
  const displayMessages = chatMessages.length > 0 ? chatMessages : mockMessages;
  
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    addChatMessage(userMessage);
    setMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I'm analyzing that request for you...",
        "Let me check the current empire status and get back to you.",
        "Processing your command through the agent network...",
        "That's an interesting question. Let me consult the relevant agents.",
        "I'll need to run some calculations on that. Give me a moment..."
      ];
      
      const aiResponse: ChatMessage = {
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
        agent_id: 'master_ai'
      };
      
      addChatMessage(aiResponse);
      setIsTyping(false);
    }, 2000);
  };

  const handleQuickAction = (action: string) => {
    const actionMessages = {
      status: "Show me the current status of all agents",
      revenue: "What's our current revenue progress?", 
      research: "Run product research on trending items",
      settings: "Open system configuration panel"
    };

    setMessage(actionMessages[action as keyof typeof actionMessages] || action);
  };

  const toggleVoice = () => {
    setIsListening(!isListening);
    // Voice recognition would be implemented here
  };

  return (
    <div className="h-96 flex flex-col">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <AnimatePresence>
          {displayMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}
        </AnimatePresence>
        
        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 mb-4"
          >
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
              <Brain className="w-4 h-4" />
            </div>
            <div className="bg-gray-800/50 px-4 py-2 rounded-lg border border-gray-700">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
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
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything about your empire..."
              className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-hologram pr-10"
            />
            
            {/* Voice Button */}
            <button
              onClick={toggleVoice}
              className={cn(
                "absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded",
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
            disabled={!message.trim()}
            className="px-4 py-2 bg-hologram hover:bg-hologram/80 text-black rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
        
        <div className="text-xs text-gray-500 mt-2 text-center">
          💡 Try: "Run product research", "Show agent status", "What's our revenue?"
        </div>
      </div>
    </div>
  );
}