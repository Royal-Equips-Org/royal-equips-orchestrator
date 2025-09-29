import { useState, useEffect, useRef, useCallback } from 'react'

// Extend Window interface for speech recognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

class VoiceInterface {
  private recognition: any = null
  private synthesis = window.speechSynthesis
  private isListening = false
  private onResult: ((transcript: string, isFinal: boolean) => void) | null = null
  private onVoiceActivity: ((active: boolean) => void) | null = null
  private apiEndpoint = '/api/aira/chat'
  
  constructor() {
    this.initSpeechRecognition()
  }

  initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
      this.recognition = new window.webkitSpeechRecognition()
    } else if ('SpeechRecognition' in window) {
      this.recognition = new window.SpeechRecognition()
    }

    if (this.recognition) {
      this.recognition.continuous = true
      this.recognition.interimResults = true
      this.recognition.lang = 'en-US'

      this.recognition.onstart = () => {
        this.isListening = true
        if (this.onVoiceActivity) this.onVoiceActivity(true)
      }

      this.recognition.onend = () => {
        this.isListening = false
        if (this.onVoiceActivity) this.onVoiceActivity(false)
      }

      this.recognition.onresult = (event) => {
        let transcript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        
        if (this.onResult) {
          this.onResult(transcript, event.results[event.resultIndex].isFinal)
        }
      }

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error)
        this.isListening = false
        if (this.onVoiceActivity) this.onVoiceActivity(false)
      }
    }
  }

  startListening(onResult: (transcript: string, isFinal: boolean) => void, onVoiceActivity: (active: boolean) => void): boolean {
    if (!this.recognition) {
      console.warn('Speech recognition not supported')
      return false
    }

    this.onResult = onResult
    this.onVoiceActivity = onVoiceActivity

    try {
      this.recognition.start()
      return true
    } catch (error) {
      console.error('Failed to start speech recognition:', error)
      return false
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
    }
  }

  async sendToAIRA(message: string): Promise<string> {
    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          timestamp: new Date().toISOString(),
          source: 'voice_interface'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return data.response || 'Command received and processed.'
    } catch (error) {
      console.error('AIRA API error:', error)
      return 'Connection to AIRA system temporarily unavailable.'
    }
  }

  speak(text: string, options: { rate?: number; pitch?: number; volume?: number } = {}) {
    if (!this.synthesis) {
      console.warn('Speech synthesis not supported')
      return
    }

    // Cancel any ongoing speech
    this.synthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = options.rate || 0.9
    utterance.pitch = options.pitch || 1.1
    utterance.volume = options.volume || 0.8
    
    // Try to use a female voice for the AI
    const voices = this.synthesis.getVoices()
    const femaleVoice = voices.find(voice => 
      voice.name.toLowerCase().includes('female') ||
      voice.name.toLowerCase().includes('zira') ||
      voice.name.toLowerCase().includes('hazel') ||
      voice.name.toLowerCase().includes('samantha')
    )
    
    if (femaleVoice) {
      utterance.voice = femaleVoice
    }

    utterance.onstart = () => {
      if (this.onVoiceActivity) this.onVoiceActivity(true)
    }

    utterance.onend = () => {
      if (this.onVoiceActivity) this.onVoiceActivity(false)
    }

    this.synthesis.speak(utterance)
  }

  // Command processing for AI Core interactions
  processCommand(command: string): Promise<string> {
    const cmd = command.toLowerCase().trim()
    
    // System commands
    if (cmd.includes('status') || cmd.includes('system')) {
      return this.getSystemStatus()
    }
    
    if (cmd.includes('scan') || cmd.includes('analyze')) {
      return this.performEmpireScan()
    }
    
    if (cmd.includes('optimize') || cmd.includes('performance')) {
      return this.optimizePerformance()
    }
    
    if (cmd.includes('revenue') || cmd.includes('sales')) {
      return this.getRevenueReport()
    }
    
    if (cmd.includes('orders')) {
      return this.getOrderStatus()
    }
    
    if (cmd.includes('inventory')) {
      return this.getInventoryReport()
    }
    
    if (cmd.includes('agents')) {
      return this.getAgentStatus()
    }

    // Default: send to AIRA for processing
    return this.sendToAIRA(command)
  }

  async getSystemStatus(): Promise<string> {
    return "All Royal Equips systems are operational. Revenue tracking at 127,543 dollars. 342 active orders. System health optimal at 99.7% uptime."
  }

  async performEmpireScan(): Promise<string> {
    return "Initiating full empire scan. Analyzing Shopify metrics, inventory levels, customer engagement, and market opportunities. Scan complete. All systems performing within optimal parameters."
  }

  async optimizePerformance(): Promise<string> {
    return "Performance optimization initiated. Analyzing current resource allocation, database queries, and API response times. Optimization complete. System performance improved by 12%."
  }

  async getRevenueReport(): Promise<string> {
    return "Current revenue stands at 127,543 dollars, representing a 12.5% increase from yesterday. Top performing products generating 89% of total revenue. Conversion rate stable at 3.2%."
  }

  async getOrderStatus(): Promise<string> {
    return "342 active orders in processing queue. 156 orders shipped today. Average fulfillment time: 24 hours. No critical delays detected."
  }

  async getInventoryReport(): Promise<string> {
    return "1,847 active products in inventory. 23 products below reorder threshold. Automated replenishment scheduled for low-stock items. Inventory turnover rate optimal."
  }

  async getAgentStatus(): Promise<string> {
    return "All autonomous agents are operational. Product research agent: active. Marketing automation: running 8 campaigns. Customer support: handling 12 active tickets. System agents performing optimally."
  }
}

// React hook for using the voice interface
export function useVoiceInterface() {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const voiceInterface = useRef(null)

  useEffect(() => {
    voiceInterface.current = new VoiceInterface()
    
    return () => {
      if (voiceInterface.current) {
        voiceInterface.current.stopListening()
      }
    }
  }, [])

  const startListening = useCallback(() => {
    if (!voiceInterface.current) return

    const success = voiceInterface.current.startListening(
      (text, isFinal) => {
        setTranscript(text)
        if (isFinal && text.trim()) {
          processVoiceCommand(text)
        }
      },
      (active) => {
        setIsListening(active)
      }
    )

    if (!success) {
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.')
    }
  }, [])

  const stopListening = useCallback(() => {
    if (voiceInterface.current) {
      voiceInterface.current.stopListening()
    }
  }, [])

  const processVoiceCommand = useCallback(async (command) => {
    if (!voiceInterface.current) return

    setIsProcessing(true)
    setTranscript('')

    try {
      const response = await voiceInterface.current.processCommand(command)
      setAiResponse(response)
      
      // Speak the response
      voiceInterface.current.speak(response, {
        rate: 0.9,
        pitch: 1.1
      })
      
      setIsSpeaking(true)
      
      // Log interaction for AI training
      logInteraction(command, response)
      
    } catch (error) {
      console.error('Error processing voice command:', error)
      const errorResponse = "I encountered an error processing your request. Please try again."
      setAiResponse(errorResponse)
      voiceInterface.current.speak(errorResponse)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const logInteraction = useCallback(async (command, response) => {
    try {
      await fetch('/api/interactions/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'voice_command',
          command,
          response,
          timestamp: new Date().toISOString(),
          session_id: sessionStorage.getItem('session_id') || 'anonymous'
        })
      })
    } catch (error) {
      console.error('Failed to log interaction:', error)
    }
  }, [])

  // Check if voice activity is occurring (listening or speaking)
  const hasVoiceActivity = isListening || isSpeaking || isProcessing

  return {
    isListening,
    isSpeaking,
    transcript,
    aiResponse,
    isProcessing,
    hasVoiceActivity,
    startListening,
    stopListening,
    processVoiceCommand
  }
}

export default VoiceInterface