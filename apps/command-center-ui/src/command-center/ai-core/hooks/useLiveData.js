import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import * as d3 from 'd3'
import { useEmpireStore } from '../../../store/empire-store'
import { empireService } from '../../../services/empire-service'
import { RealTimeService } from '../../../services/realtime-service'
import { logger } from '../../../services/log'

const defaultStreams = {
  revenueStream: Array.from({ length: 12 }).map((_, idx) => ({
    label: d3.utcFormat('%H:%M')(new Date(Date.now() - (11 - idx) * 5 * 60 * 1000)),
    value: 0,
  })),
  logisticsStream: Array.from({ length: 12 }).map((_, idx) => ({
    label: `L-${idx + 1}`,
    value: 0,
  })),
  marketingMix: [
    { label: 'Awareness', value: 25 },
    { label: 'Acquisition', value: 25 },
    { label: 'Retention', value: 25 },
    { label: 'Advocacy', value: 25 }
  ],
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const computeEnergyLevel = (metrics) => {
  if (!metrics) {
    return 0.45
  }
  const agentRatio = metrics.total_agents > 0 ? metrics.active_agents / metrics.total_agents : 0.5
  const revenueRatio = metrics.target_revenue > 0 ? metrics.revenue_progress / metrics.target_revenue : 0.6
  const automation = metrics.automation_level ? metrics.automation_level / 100 : 0.5
  const discoveries = metrics.daily_discoveries ? clamp(metrics.daily_discoveries / 20, 0, 1) : 0.4
  return clamp((agentRatio + revenueRatio + automation + discoveries) / 4, 0.25, 0.95)
}

const computeColorGradient = (energy) => {
  if (energy > 0.8) {
    return '#4de9ff'
  }
  if (energy > 0.6) {
    return '#2bc4ff'
  }
  if (energy > 0.45) {
    return '#16a8ff'
  }
  return '#0f7bff'
}

export function useLiveData() {
  const metrics = useEmpireStore(state => state.metrics)
  const agents = useEmpireStore(state => state.agents)
  const opportunities = useEmpireStore(state => state.productOpportunities)
  const campaigns = useEmpireStore(state => state.marketingCampaigns)
  const refreshAll = useEmpireStore(state => state.refreshAll)

  const [energyLevel, setEnergyLevel] = useState(() => computeEnergyLevel(metrics))
  const [colorTone, setColorTone] = useState(() => computeColorGradient(energyLevel))
  const [commandRate, setCommandRate] = useState(0)
  const [wsStatus, setWsStatus] = useState({ connected: false, reconnecting: false, latency: 0 })
  const [supabaseStatus, setSupabaseStatus] = useState('idle')
  const [dataStreams, setDataStreams] = useState(defaultStreams)
  const [voiceActivity, setVoiceActivity] = useState({ volume: 0, lastTranscript: null })
  const wsRef = useRef(null)
  const supabaseRef = useRef(null)
  const supabaseChannelRef = useRef(null)
  const commandCounter = useRef([])

  const wsUrl = useMemo(() => {
    const explicit = import.meta.env.VITE_REALTIME_URL
    if (explicit) {
      return explicit
    }
    try {
      const { protocol, host } = window.location
      const wsProtocol = protocol === 'https:' ? 'wss' : 'ws'
      return `${wsProtocol}://${host}/ws`
    } catch (error) {
      logger.warn('Falling back to default WebSocket URL', { error })
      return 'ws://localhost:5000/ws'
    }
  }, [])

  const trackCommand = useCallback(() => {
    const now = Date.now()
    commandCounter.current = commandCounter.current.filter(timestamp => now - timestamp < 60000)
    commandCounter.current.push(now)
    setCommandRate(commandCounter.current.length)
  }, [])

  useEffect(() => {
    refreshAll().catch(error => {
      logger.error('Initial live data refresh failed', { error })
    })
  }, [refreshAll])

  useEffect(() => {
    setEnergyLevel(computeEnergyLevel(metrics))
  }, [metrics])

  useEffect(() => {
    setColorTone(computeColorGradient(energyLevel))
  }, [energyLevel])

  useEffect(() => {
    if (!wsRef.current) {
      wsRef.current = new RealTimeService(wsUrl)
    }
    const service = wsRef.current
    let active = true

    service.connect().catch(error => {
      logger.error('AI Core realtime connection failed', { error })
    })

    const statusUnsubscribe = service.onStatusChange(status => {
      if (!active) return
      setWsStatus({
        connected: status.connected,
        reconnecting: status.reconnecting,
        latency: status.latency,
      })
    })

    const metricsUnsubscribe = service.subscribe('empire-metrics', payload => {
      if (!payload) return
      try {
        useEmpireStore.getState().updateMetrics(payload)
      } catch (error) {
        logger.error('Failed to push real-time metrics into store', { error })
      }
    })

    const agentUnsubscribe = service.subscribe('agent-status', payload => {
      if (!payload) return
      try {
        useEmpireStore.setState(prev => ({ ...prev, agents: payload.agents ?? payload }))
      } catch (error) {
        logger.error('Failed to push agent status update', { error })
      }
    })

    const opportunityUnsubscribe = service.subscribe('product-opportunities', payload => {
      if (!payload) return
      try {
        useEmpireStore.updateProductOpportunities(payload)
      } catch (error) {
        logger.error('Failed to sync product opportunities stream', { error })
      }
    })

    const systemHealthUnsubscribe = service.subscribe('system-health', payload => {
      if (!payload) return
      const { voice, energy } = payload
      if (voice) {
        setVoiceActivity(prev => ({ ...prev, volume: clamp(voice.activity ?? voice.volume ?? 0.2, 0, 1) }))
      }
      if (typeof energy === 'number') {
        setEnergyLevel(clamp(energy, 0.1, 1))
      }
    })

    return () => {
      active = false
      statusUnsubscribe?.()
      metricsUnsubscribe?.()
      agentUnsubscribe?.()
      opportunityUnsubscribe?.()
      systemHealthUnsubscribe?.()
      service.disconnect()
      wsRef.current = null
    }
  }, [wsUrl])

  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      setSupabaseStatus('disabled')
      return
    }

    const client = createClient(supabaseUrl, supabaseKey, {
      realtime: {
        params: {
          eventsPerSecond: 2
        }
      }
    })
    supabaseRef.current = client
    setSupabaseStatus('connecting')

    const channel = client.channel('ai-core-channel', {
      config: {
        broadcast: { ack: true }
      }
    })
    supabaseChannelRef.current = channel

    channel.on('broadcast', { event: 'hologram-metrics' }, ({ payload }) => {
      if (!payload) return
      setEnergyLevel(prev => clamp(payload.energy ?? prev, 0.1, 1))
      setVoiceActivity(prev => ({ ...prev, volume: clamp(payload.voiceActivity ?? prev.volume, 0, 1) }))
      if (payload.commandIssued) {
        trackCommand()
      }
    })

    channel.on('broadcast', { event: 'analytics-update' }, ({ payload }) => {
      if (!payload) return
      setDataStreams(current => ({
        revenueStream: payload.revenueStream ?? current.revenueStream,
        logisticsStream: payload.logisticsStream ?? current.logisticsStream,
        marketingMix: payload.marketingMix ?? current.marketingMix,
      }))
    })

    channel.subscribe(status => {
      if (status === 'SUBSCRIBED') {
        setSupabaseStatus('connected')
      } else if (status === 'CLOSED') {
        setSupabaseStatus('disconnected')
      } else if (status === 'TIMED_OUT') {
        setSupabaseStatus('error')
      }
    })

    return () => {
      channel.unsubscribe()
      client.removeChannel(channel)
      client.removeAllChannels()
      supabaseChannelRef.current = null
      supabaseRef.current = null
    }
  }, [trackCommand])

  useEffect(() => {
    let cancelled = false
    const loadAnalytics = async () => {
      try {
        const analytics = await empireService.fetchAnalytics()
        if (cancelled || !analytics) return

        setDataStreams(current => ({
          revenueStream: analytics.revenueStream ?? current.revenueStream,
          logisticsStream: analytics.logisticsStream ?? current.logisticsStream,
          marketingMix: analytics.marketingMix ?? current.marketingMix,
        }))
      } catch (error) {
        logger.warn('Failed to fetch analytics stream', { error })
      }
    }

    loadAnalytics()
    const interval = setInterval(loadAnalytics, 60000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  const liveIntensity = useMemo(() => ({
    energyLevel,
    colorTone,
    commandRate,
    voiceActivity,
    wsStatus,
    supabaseStatus,
  }), [energyLevel, colorTone, commandRate, voiceActivity, wsStatus, supabaseStatus])

  const refreshLiveData = useCallback(() => {
    refreshAll().catch(error => {
      logger.error('Manual live data refresh failed', { error })
    })
    if (wsRef.current) {
      wsRef.current.refreshData('empire-metrics')
      wsRef.current.refreshData('agent-status')
    }
    if (supabaseRef.current && supabaseChannelRef.current) {
      supabaseChannelRef.current.send({
        type: 'broadcast',
        event: 'refresh',
        payload: { timestamp: Date.now() }
      })
    }
  }, [refreshAll])

  return {
    metrics,
    agents,
    opportunities,
    campaigns,
    dataStreams,
    liveIntensity,
    voiceActivity,
    refreshLiveData,
    registerCommandEvent: trackCommand,
  }
}
