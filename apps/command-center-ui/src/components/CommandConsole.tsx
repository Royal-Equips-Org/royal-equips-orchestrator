import React, { useState, useRef, useEffect } from 'react'
import { Terminal, Send } from 'lucide-react'

interface ConsoleMessage {
  id: string
  type: 'command' | 'response' | 'error' | 'info'
  message: string
  timestamp: string
}

const CommandConsole: React.FC = () => {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ConsoleMessage[]>([
    {
      id: '1',
      type: 'info',
      message: 'Royal Equips Command Console v1.0 initialized',
      timestamp: new Date().toLocaleTimeString()
    },
    {
      id: '2',
      type: 'info', 
      message: 'Type "help" for available commands',
      timestamp: new Date().toLocaleTimeString()
    }
  ])
  const [commandHistory, setCommandHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const processCommand = (command: string): ConsoleMessage => {
    const timestamp = new Date().toLocaleTimeString()
    
    switch (command.toLowerCase().trim()) {
      case 'help':
        return {
          id: Date.now().toString(),
          type: 'response',
          message: 'Available commands:\n• help - Show this help\n• status - Show system status\n• agents - List all agents\n• sync - Sync all data\n• rollback - Emergency rollback\n• clear - Clear console\n• /approve-run - Approve pending operations',
          timestamp
        }
      
      case 'status':
        return {
          id: Date.now().toString(),
          type: 'response', 
          message: '🟢 System Status: OPERATIONAL\n📊 Active Agents: 5\n🔄 Sync Status: UP TO DATE\n💰 Revenue Today: €2,347\n⚡ Uptime: 2h 34m',
          timestamp
        }

      case 'agents':
        return {
          id: Date.now().toString(),
          type: 'response',
          message: 'Active Agents:\n🔍 ProductResearchAgent - RUNNING\n💰 PricingAgent - IDLE\n📦 InventoryAgent - RUNNING (WARNING)\n🛒 OrdersAgent - RUNNING\n👁️ ObserverAgent - RUNNING',
          timestamp
        }

      case 'sync':
        return {
          id: Date.now().toString(),
          type: 'response',
          message: '🔄 Initiating full system sync...\n✅ Shopify sync complete\n✅ Supabase sync complete\n✅ BigQuery sync complete\n🎉 All systems synchronized',
          timestamp
        }

      case 'clear':
        setMessages([])
        return {
          id: Date.now().toString(),
          type: 'info',
          message: 'Console cleared',
          timestamp
        }

      case '/approve-run':
        return {
          id: Date.now().toString(),
          type: 'response',
          message: '✅ All pending operations approved and executed\n📊 3 pricing updates applied\n🛒 2 new products created\n📦 Inventory synchronized',
          timestamp
        }

      case 'rollback':
        return {
          id: Date.now().toString(),
          type: 'response',
          message: '🚨 Emergency rollback initiated...\n⏪ Rolling back last 5 operations\n✅ Rollback complete - System restored to stable state',
          timestamp
        }

      default:
        if (command.startsWith('/')) {
          return {
            id: Date.now().toString(),
            type: 'response',
            message: `🤖 AI Command: "${command}"\n🎯 Processing autonomous directive...\n✅ Command queued for execution`,
            timestamp
          }
        }
        
        return {
          id: Date.now().toString(),
          type: 'error',
          message: `Unknown command: "${command}". Type "help" for available commands.`,
          timestamp
        }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const command = input.trim()
    
    // Add command to messages
    const commandMessage: ConsoleMessage = {
      id: Date.now().toString(),
      type: 'command',
      message: command,
      timestamp: new Date().toLocaleTimeString()
    }

    // Process command and get response
    const response = processCommand(command)
    
    if (command.toLowerCase() === 'clear') {
      setMessages([response])
    } else {
      setMessages(prev => [...prev, commandMessage, response])
    }
    
    // Add to history
    setCommandHistory(prev => [command, ...prev])
    setHistoryIndex(-1)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (historyIndex < commandHistory.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setInput(commandHistory[newIndex])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(commandHistory[newIndex])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setInput('')
      }
    }
  }

  const getMessageStyle = (type: string) => {
    switch (type) {
      case 'command':
        return 'text-hologram'
      case 'response':
        return 'text-green-400'
      case 'error':
        return 'text-red-400'
      case 'info':
        return 'text-yellow-400'
      default:
        return 'text-white'
    }
  }

  const getMessagePrefix = (type: string) => {
    switch (type) {
      case 'command':
        return '$ '
      case 'response':
        return '> '
      case 'error':
        return '! '
      case 'info':
        return 'ℹ '
      default:
        return ''
    }
  }

  return (
    <div className="glass-panel rounded-lg overflow-hidden h-48">
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-4 py-2 flex items-center space-x-2">
        <Terminal className="w-4 h-4 text-hologram" />
        <span className="text-sm font-bold hologram-text">COMMAND CONSOLE</span>
        <div className="flex-1"></div>
        <span className="text-xs opacity-70">Press ↑/↓ for history</span>
      </div>
      
      <div className="h-32 overflow-y-auto p-2 font-mono text-sm bg-black bg-opacity-80">
        {messages.map((message) => (
          <div key={message.id} className="mb-1">
            <span className="text-gray-500 text-xs mr-2">[{message.timestamp}]</span>
            <span className={getMessageStyle(message.type)}>
              {getMessagePrefix(message.type)}
              {message.message.split('\n').map((line, i) => (
                <div key={i} className={i > 0 ? 'ml-12' : ''}>
                  {line}
                </div>
              ))}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-2 border-t border-hologram border-opacity-30">
        <div className="flex items-center space-x-2">
          <span className="text-hologram font-mono">$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white font-mono text-sm focus:outline-none focus:ring-1 focus:ring-hologram rounded px-2 py-1"
            placeholder="Enter command... (try 'help')"
            autoComplete="off"
          />
          <button
            type="submit"
            className="p-1 text-hologram hover:bg-hologram hover:bg-opacity-20 rounded transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}

export default CommandConsole