import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import * as d3 from 'd3'
import { useEmpireStore } from '../../../store/empire-store'
import { empireService } from '../../../services/empire-service'
import { RealTimeService } from '../../../services/realtime-service'
import { logger } from '../../../services/log'
import { EmpireMetrics, Agent, ProductOpportunity, MarketingCampaign } from '../../../types/empire'

// Types for live data
interface DataStream {
  label: string
  value: number
}

interface DataStreams {
  revenueStream: DataStream[]
  logisticsStream: DataStream[]
  marketingMix: DataStream[]
}

interface WSStatus {
  connected: boolean
  reconnecting: boolean
  latency: number
}

interface VoiceActivity {
  volume: number
  lastTranscript: string | null
}

interface LiveIntensity {
  energyLevel: number
  colorTone: string
  commandRate: number
  wsStatus: WSStatus
  supabaseStatus: string
  voiceActivity: VoiceActivity
}

interface Alert {
  id: number
  type: string
  metric: string
  value: any
  threshold: number
  direction: 'above' | 'below'
  timestamp: Date
}

interface LiveDataReturn {
  metrics: EmpireMetrics | null
  agents: Agent[] | null
  opportunities: ProductOpportunity[] | null
  campaigns: MarketingCampaign[] | null
  dataStreams: DataStreams
  liveIntensity: LiveIntensity
  alerts: Alert[]
  refreshLiveData: () => Promise<void>
  registerCommandEvent: () => void
}

const defaultStreams: DataStreams = {
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

/**
 * Restricts a number to be within the specified minimum and maximum bounds.
 */
const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

/**
 * Computes the energy level for the dashboard based on several metrics.
 */
const computeEnergyLevel = (metrics: EmpireMetrics | null): number => {
  if (!metrics) {
    return 0.45
  }
  const agentRatio = metrics.total_agents > 0 ? metrics.active_agents / metrics.total_agents : 0.5
  const revenueRatio = metrics.target_revenue > 0 ? metrics.revenue_progress / metrics.target_revenue : 0.6
  const automation = metrics.automation_level ? metrics.automation_level / 100 : 0.5
  const discoveries = metrics.daily_discoveries ? clamp(metrics.daily_discoveries / 20, 0, 1) : 0.4
  return clamp((agentRatio + revenueRatio + automation + discoveries) / 4, 0.25, 0.95)
}

const computeColorGradient = (energy: number): string => {
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

export function useLiveData(): LiveDataReturn {
  const metrics = useEmpireStore(state => state.metrics)
  const agents = useEmpireStore(state => state.agents)
  const opportunities = useEmpireStore(state => state.productOpportunities)
  const campaigns = useEmpireStore(state => state.marketingCampaigns)
  const refreshAll = useEmpireStore(state => state.refreshAll)

  const [energyLevel, setEnergyLevel] = useState(() => computeEnergyLevel(metrics))
  const [colorTone, setColorTone] = useState(() => computeColorGradient(energyLevel))
  const [commandRate, setCommandRate] = useState(0)
  const [wsStatus, setWsStatus] = useState<WSStatus>({ connected: false, reconnecting: false, latency: 0 })
  const [supabaseStatus, setSupabaseStatus] = useState('idle')
  const [dataStreams, setDataStreams] = useState<DataStreams>(defaultStreams)
  const [voiceActivity, setVoiceActivity] = useState<VoiceActivity>({ volume: 0, lastTranscript: null })
  const [alerts, setAlerts] = useState<Alert[]>([])

  const wsRef = useRef<RealTimeService | null>(null)
  const supabaseRef = useRef<any>(null)
  const supabaseChannelRef = useRef<any>(null)
  const commandCounter = useRef<number[]>([])
  const prevMetricsRef = useRef<EmpireMetrics | null>(null)

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

  const refreshLiveData = useCallback(async () => {
    try {
      await refreshAll()
      logger.info('Live data refreshed successfully')
    } catch (error) {
      logger.error('Live data refresh failed', { error })
    }
  }, [refreshAll])

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

  // Alert generation based on metrics changes
  useEffect(() => {
    if (!metrics || !prevMetricsRef.current) {
      prevMetricsRef.current = metrics
      return
    }

    const prev = prevMetricsRef.current
    const current = metrics

    // Check for significant changes and generate alerts
    if (current.revenue_progress && prev.revenue_progress) {
      const revenueChange = Math.abs(current.revenue_progress - prev.revenue_progress)
      if (revenueChange > prev.revenue_progress * 0.1) { // 10% change
        const alert: Alert = {
          id: Date.now(),
          type: 'revenue',
          metric: 'revenue_progress',
          value: current.revenue_progress,
          threshold: prev.revenue_progress * 0.1,
          direction: current.revenue_progress > prev.revenue_progress ? 'above' : 'below',
          timestamp: new Date()
        }
        setAlerts(prev => [...prev.slice(-9), alert]) // Keep last 10 alerts
      }
    }

    // Check automation level changes
    if (Math.abs(current.automation_level - prev.automation_level) > 5) {
      const alert: Alert = {
        id: Date.now() + 1,
        type: 'automation',
        metric: 'automation_level',
        value: current.automation_level,
        previousValue: prev.automation_level,
        changePercent: ((current.automation_level - prev.automation_level) / prev.automation_level * 100).toFixed(1),
        timestamp: new Date()
      } as any
      setAlerts(prev => [...prev.slice(-9), alert])
    }

    prevMetricsRef.current = metrics
  }, [metrics])

  // WebSocket connection for real-time data
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

    const metricsUnsubscribe = service.subscribe('empire-metrics', (payload: any) => {
      if (!active) return
      // Update real-time metrics and streams
      if (payload.streams) {
        setDataStreams(prevData => ({
          ...prevData,
          ...payload.streams
        }))
      }
    })

    return () => {
      active = false
      statusUnsubscribe?.()
      metricsUnsubscribe?.()
      service.disconnect()
    }
  }, [wsUrl])

  // Supabase real-time connection (if configured)
  useEffect(() => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      setSupabaseStatus('disabled')
      return
    }

    try {
      if (!supabaseRef.current) {
        supabaseRef.current = createClient(supabaseUrl, supabaseKey)
      }

      const client = supabaseRef.current
      setSupabaseStatus('connecting')

      const channel = client
        .channel('empire-realtime')
        .on('postgres_changes', { event: '*', schema: 'public' }, (payload: any) => {
          logger.info('Supabase real-time update', { table: payload.table, eventType: payload.eventType })
          // Trigger data refresh on database changes
          refreshLiveData()
        })
        .subscribe()

      supabaseChannelRef.current = channel
      setSupabaseStatus('connected')

      return () => {
        if (supabaseChannelRef.current) {
          supabaseRef.current?.removeChannel(supabaseChannelRef.current)
          supabaseChannelRef.current = null
        }
        setSupabaseStatus('disconnected')
      }
    } catch (error) {
      logger.error('Supabase connection failed', { error })
      setSupabaseStatus('error')
    }
  }, [refreshLiveData])

  const liveIntensity: LiveIntensity = useMemo(() => ({
    energyLevel,
    colorTone,
    commandRate,
    wsStatus,
    supabaseStatus,
    voiceActivity
  }), [energyLevel, colorTone, commandRate, wsStatus, supabaseStatus, voiceActivity])

  return {
    metrics,
    agents,
    opportunities,
    campaigns,
    dataStreams,
    liveIntensity,
    alerts,
    refreshLiveData,
    registerCommandEvent: trackCommand
  }
}

export { useLiveData as default }