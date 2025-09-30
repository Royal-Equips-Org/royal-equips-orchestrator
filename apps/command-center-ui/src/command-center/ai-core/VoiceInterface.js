import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEmpireStore } from '../../store/empire-store'
import { empireService } from '../../services/empire-service'
import { logger } from '../../services/log'

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : undefined

const SpeechGrammarList = typeof window !== 'undefined'
  ? (window.SpeechGrammarList || window.webkitSpeechGrammarList)
  : undefined

const SUPPORTED_COMMANDS = [
  'boost engines',
  'run engine boost',
  'engage auto sync',
  'launch auto sync',
  'open command logs',
  'show command logs',
  'activate full autopilot',
  'deactivate autopilot',
  'toggle emergency stop',
]

export function useVoiceInterface({ onTranscript, onCommand, enabled = true, registerCommandEvent }) {
  const sendUserChat = useEmpireStore(state => state.sendUserChat)
  const addChatMessage = useEmpireStore(state => state.addChatMessage)
  const toggleAutopilot = useEmpireStore(state => state.toggleAutopilot)
  const triggerEmergencyStop = useEmpireStore(state => state.triggerEmergencyStop)

  const [supported] = useState(() => Boolean(SpeechRecognition))
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const [lastCommand, setLastCommand] = useState(null)
  const recognitionRef = useRef(null)
  const synthesisRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null)

  const grammar = useMemo(() => {
    if (!SpeechGrammarList) return null
    const list = new SpeechGrammarList()
    const grammarRule = `#JSGF V1.0; grammar commands; public <command> = ${SUPPORTED_COMMANDS.join(' | ')} ;`
    list.addFromString(grammarRule, 1)
    return list
  }, [])

  const speak = useCallback(async (text) => {
    if (!synthesisRef.current || !text) return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1.08
    utterance.pitch = 1.12
    utterance.volume = 0.85
    setSpeaking(true)
    await empireService.logInteraction({
      source: 'tts',
      message: text,
      timestamp: new Date().toISOString(),
    })
    utterance.onend = () => {
      setSpeaking(false)
    }
    synthesisRef.current.speak(utterance)
  }, [])

  const handleCommand = useCallback(async (text) => {
    const normalized = text.toLowerCase()
    setLastCommand(normalized)

    addChatMessage({
      id: `voice_${Date.now()}`,
      content: `🎙️ Voice command received: "${text}"`,
      sender: 'ai',
      agentName: 'AIRA',
      timestamp: new Date(),
    })

    let actionHandled = false

    if (normalized.includes('engine') && normalized.includes('boost')) {
      await empireService.triggerEngineBoost()
      actionHandled = true
      onCommand?.({ type: 'engine-boost' })
      await speak('Engine boost engaged. Power relays stabilized.')
    } else if (normalized.includes('auto') && normalized.includes('sync')) {
      await empireService.triggerAutoSync()
      actionHandled = true
      onCommand?.({ type: 'auto-sync' })
      await speak('Auto synchronization initiated across Shopify, Supabase and BigQuery.')
    } else if (normalized.includes('log')) {
      onCommand?.({ type: 'open-logs' })
      actionHandled = true
      await speak('Displaying command logs.')
    } else if (normalized.includes('autopilot')) {
      toggleAutopilot()
      actionHandled = true
      onCommand?.({ type: 'toggle-autopilot' })
      await speak('Autopilot state toggled.')
    } else if (normalized.includes('emergency')) {
      triggerEmergencyStop()
      actionHandled = true
      onCommand?.({ type: 'emergency-stop' })
      await speak('Emergency stop acknowledged. Operations halted.')
    }

    await empireService.logInteraction({
      source: 'voice',
      command: text,
      handled: actionHandled,
      timestamp: new Date().toISOString(),
    })

    if (!actionHandled) {
      await sendUserChat(text)
      await speak('Directive relayed to AIRA for execution.')
    }
  }, [addChatMessage, onCommand, sendUserChat, speak, toggleAutopilot, triggerEmergencyStop])

  useEffect(() => {
    if (!supported || !enabled) {
      return undefined
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.maxAlternatives = 3
    recognitionRef.current = recognition

    if (grammar) {
      recognition.grammars = grammar
    }

    recognition.onresult = async (event) => {
      let interimTranscript = ''
      let finalTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const text = result[0].transcript.trim()
        if (result.isFinal) {
          finalTranscript += `${text} `
        } else {
          interimTranscript += `${text} `
        }
      }

      const combinedTranscript = `${finalTranscript || interimTranscript}`.trim()
      setTranscript(combinedTranscript)
      onTranscript?.(combinedTranscript)

      if (finalTranscript) {
        try {
          if (registerCommandEvent) {
            registerCommandEvent()
          }
          await handleCommand(finalTranscript.trim())
        } catch (commandError) {
          setError(commandError)
          logger.error('Voice command handling failed', { error: commandError })
        }
      }
    }

    recognition.onerror = (event) => {
      setError(event.error)
      logger.error('Speech recognition error', { error: event.error })
    }

    recognition.onend = () => {
      setListening(false)
    }

    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [enabled, grammar, handleCommand, onTranscript, registerCommandEvent, supported])

  const startListening = useCallback(() => {
    if (!supported || !recognitionRef.current) return
    if (listening) return
    setTranscript('')
    setError(null)
    recognitionRef.current.start()
    setListening(true)
  }, [listening, supported])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return
    recognitionRef.current.stop()
    setListening(false)
  }, [])

  useEffect(() => {
    return () => {
      if (synthesisRef.current) {
        synthesisRef.current.cancel()
      }
    }
  }, [])

  return {
    supported,
    listening,
    speaking,
    transcript,
    error,
    lastCommand,
    startListening,
    stopListening,
    speak,
  }
}

export default useVoiceInterface
