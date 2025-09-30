import { useState, useEffect, useRef, useCallback } from 'react'
import { useEmpireStore } from '../../../store/empire-store'
import { apiClient } from '../../../services/api-client'
import { empireService } from '../../../services/empire-service'
import { logger } from '../../../services/log'

// WebSocket connection for real-time data
class LiveDataConnection {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private listeners = new Map()
  private isConnected = false
  private heartbeatInterval: NodeJS.Timeout | null = null
  private pollingInterval: NodeJS.Timeout | null = null

  connect(onMessage: (data: any) => void, onStatusChange: (connected: boolean) => void) {
    try {
      // Use WebSocket for real-time data if available, otherwise fallback to polling
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${wsProtocol}//${window.location.host}/ws/live-data`
      
      this.ws = new WebSocket(wsUrl)
      
      this.ws.onopen = () => {
        logger.info('Live data WebSocket connected')
        this.isConnected = true
        this.reconnectAttempts = 0
        onStatusChange(true)
        this.startHeartbeat()
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          onMessage(data)
        } catch (error) {
          logger.error('Error parsing WebSocket message', { error })
        }
      }

      this.ws.onclose = () => {
        logger.info('Live data WebSocket disconnected')
        this.isConnected = false
        onStatusChange(false)
        this.stopHeartbeat()
        this.handleReconnect(onMessage, onStatusChange)
      }

      this.ws.onerror = (error) => {
        logger.error('WebSocket error', { error })
        this.isConnected = false
        onStatusChange(false)
      }

    } catch (error) {
      logger.error('Failed to create WebSocket connection', { error })
      // Fallback to polling
      this.startPolling(onMessage, onStatusChange)
    }
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  handleReconnect(onMessage: (data: any) => void, onStatusChange: (connected: boolean) => void) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts)
      this.reconnectAttempts++
      
      setTimeout(() => {
        logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        this.connect(onMessage, onStatusChange)
      }, delay)
    } else {
      logger.info('Max reconnection attempts reached, falling back to polling')
      this.startPolling(onMessage, onStatusChange)
    }
  }

  startPolling(onMessage: (data: any) => void, onStatusChange: (connected: boolean) => void) {
    onStatusChange(true) // Consider polling as connected
    
    const poll = async () => {
      try {
        // Use real empire API endpoints instead of mock data
        const [metrics, agents, opportunities, campaigns] = await Promise.allSettled([
          empireService.fetchMetrics(),
          empireService.fetchAgents(),
          empireService.fetchProductOpportunities(),
          empireService.fetchMarketingCampaigns()
        ])

        const realData = {
          timestamp: new Date().toISOString(),
          revenue: {
            total: metrics.status === 'fulfilled' ? metrics.value?.revenue?.total || 0 : 0,
            today: metrics.status === 'fulfilled' ? metrics.value?.revenue?.today || 0 : 0,
            growth: metrics.status === 'fulfilled' ? metrics.value?.revenue?.growth || '0%' : '0%'
          },
          orders: {
            total: metrics.status === 'fulfilled' ? metrics.value?.orders?.total || 0 : 0,
            processing: metrics.status === 'fulfilled' ? metrics.value?.orders?.processing || 0 : 0,
            shipped: metrics.status === 'fulfilled' ? metrics.value?.orders?.shipped || 0 : 0
          },
          customers: {
            total: metrics.status === 'fulfilled' ? metrics.value?.customers?.total || 0 : 0,
            active: metrics.status === 'fulfilled' ? metrics.value?.customers?.active || 0 : 0,
            newToday: metrics.status === 'fulfilled' ? metrics.value?.customers?.newToday || 0 : 0
          },
          products: {
            total: opportunities.status === 'fulfilled' ? opportunities.value?.length || 0 : 0,
            lowStock: metrics.status === 'fulfilled' ? metrics.value?.products?.lowStock || 0 : 0,
            outOfStock: metrics.status === 'fulfilled' ? metrics.value?.products?.outOfStock || 0 : 0
          },
          systemHealth: {
            status: metrics.status === 'fulfilled' && agents.status === 'fulfilled' ? 'OPERATIONAL' : 'WARNING',
            uptime: metrics.status === 'fulfilled' ? metrics.value?.systemHealth?.uptime || '99.9%' : '99.9%',
            cpuUsage: metrics.status === 'fulfilled' ? metrics.value?.systemHealth?.cpuUsage || 0 : 0,
            memoryUsage: metrics.status === 'fulfilled' ? metrics.value?.systemHealth?.memoryUsage || 0 : 0,
            responseTime: metrics.status === 'fulfilled' ? metrics.value?.systemHealth?.responseTime || 0 : 0
          },
          shopifyMetrics: {
            globalSales: metrics.status === 'fulfilled' ? `$${metrics.value?.revenue?.total || 0}` : '$0',
            topRegion: metrics.status === 'fulfilled' ? metrics.value?.shopify?.topRegion || 'Unknown' : 'Unknown',
            conversionRate: metrics.status === 'fulfilled' ? metrics.value?.shopify?.conversionRate || '0%' : '0%'
          },
          marketingData: {
            activeCampaigns: campaigns.status === 'fulfilled' ? campaigns.value?.length || 0 : 0,
            emailsOpened: metrics.status === 'fulfilled' ? metrics.value?.marketing?.emailsOpened || 0 : 0,
            clickThrough: metrics.status === 'fulfilled' ? metrics.value?.marketing?.clickThrough || '0%' : '0%',
            adSpend: metrics.status === 'fulfilled' ? `$${metrics.value?.marketing?.adSpend || 0}` : '$0'
          },
          agents: agents.status === 'fulfilled' ? agents.value || [] : []
        }

        onMessage(realData)
      } catch (error) {
        logger.error('Polling error', { error })
      }
    }

    // Poll every 5 seconds
    this.pollingInterval = setInterval(poll, 5000)
    poll() // Initial poll
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
    
    this.stopHeartbeat()
    this.isConnected = false
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }
}

// Main hook for live data using real business APIs
export function useLiveData(options: { 
  enableMockData?: boolean; 
  updateInterval?: number;
  retryAttempts?: number 
} = {}) {
  const [data, setData] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [error, setError] = useState(null)
  const connectionRef = useRef(null)
  const { refreshAll, metrics } = useEmpireStore()

  const { 
    enableMockData = false, // Disabled by default - use real data
    updateInterval = 5000,
    retryAttempts = 3 
  } = options

  const handleMessage = useCallback((newData) => {
    setData(prevData => ({
      ...prevData,
      ...newData,
      _lastUpdate: new Date().toISOString()
    }))
    setLastUpdate(new Date())
    setError(null)
  }, [])

  const handleStatusChange = useCallback((connected) => {
    setIsConnected(connected)
    if (connected) {
      setError(null)
    }
  }, [])

  // Initialize connection
  useEffect(() => {
    if (!connectionRef.current) {
      connectionRef.current = new LiveDataConnection()
    }

    connectionRef.current.connect(handleMessage, handleStatusChange)

    return () => {
      if (connectionRef.current) {
        connectionRef.current.disconnect()
      }
    }
  }, [handleMessage, handleStatusChange])

  // Integrate with Empire Store for real data
  useEffect(() => {
    if (data) {
      // Update empire store with live data
      refreshAll()
    }
  }, [data, refreshAll])

  // Request specific data updates
  const requestUpdate = useCallback((dataType) => {
    if (connectionRef.current && connectionRef.current.isConnected) {
      connectionRef.current.send({
        type: 'request_update',
        dataType
      })
    }
  }, [])

  // Get specific metric from real data
  const getMetric = useCallback((path) => {
    if (!data) return null
    
    return path.split('.').reduce((obj, key) => obj?.[key], data)
  }, [data])

  // Calculate data freshness
  const dataFreshness = lastUpdate ? 
    Math.floor((Date.now() - lastUpdate.getTime()) / 1000) : null

  return {
    data,
    isConnected,
    lastUpdate,
    dataFreshness,
    error,
    requestUpdate,
    getMetric,
    // Convenient metric accessors for real business data
    revenue: data?.revenue,
    orders: data?.orders,
    customers: data?.customers,
    products: data?.products,
    systemHealth: data?.systemHealth,
    shopifyMetrics: data?.shopifyMetrics,
    marketingData: data?.marketingData,
    agents: data?.agents
  }
}

// Hook for specific metric monitoring with real business thresholds
export function useMetricWatch(metricPath: string, threshold: number, options: {
  alertType?: 'threshold' | 'change';
  direction?: 'above' | 'below'
} = {}) {
  const { data, getMetric } = useLiveData()
  const [alerts, setAlerts] = useState([])
  const previousValue = useRef(null)

  const { alertType = 'threshold', direction = 'above' } = options

  useEffect(() => {
    if (!data) return

    const currentValue = getMetric(metricPath)
    if (currentValue === null || currentValue === undefined) return

    // Threshold alerts for real business metrics
    if (alertType === 'threshold') {
      const shouldAlert = direction === 'above' ? 
        currentValue > threshold : currentValue < threshold

      if (shouldAlert && previousValue.current !== null) {
        const alert = {
          id: Date.now(),
          type: 'threshold',
          metric: metricPath,
          value: currentValue,
          threshold,
          direction,
          timestamp: new Date()
        }
        
        setAlerts(prev => [...prev.slice(-9), alert]) // Keep last 10 alerts
        
        // Log to real business systems
        logger.warn('Business metric threshold exceeded', {
          metric: metricPath,
          value: currentValue,
          threshold,
          direction
        })
      }
    }

    // Change detection alerts for business intelligence
    if (alertType === 'change' && previousValue.current !== null) {
      const changePercent = ((currentValue - previousValue.current) / previousValue.current) * 100
      
      if (Math.abs(changePercent) > threshold) {
        const alert = {
          id: Date.now(),
          type: 'change',
          metric: metricPath,
          value: currentValue,
          previousValue: previousValue.current,
          changePercent: changePercent.toFixed(1),
          timestamp: new Date()
        }
        
        setAlerts(prev => [...prev.slice(-9), alert])
        
        // Log significant business changes
        logger.info('Significant business metric change detected', {
          metric: metricPath,
          changePercent: changePercent.toFixed(1)
        })
      }
    }

    previousValue.current = currentValue
  }, [data, metricPath, threshold, direction, alertType, getMetric])

  const clearAlerts = useCallback(() => {
    setAlerts([])
  }, [])

  return {
    currentValue: getMetric(metricPath),
    alerts,
    clearAlerts,
    hasActiveAlerts: alerts.length > 0
  }
}

export default useLiveData