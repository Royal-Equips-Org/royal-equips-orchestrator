import { useState, useEffect, useRef, useCallback } from 'react'
import { useEmpireStore } from '../../../store/empire-store'

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
        console.log('Live data WebSocket connected')
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
          console.error('Error parsing WebSocket message:', error)
        }
      }

      this.ws.onclose = () => {
        console.log('Live data WebSocket disconnected')
        this.isConnected = false
        onStatusChange(false)
        this.stopHeartbeat()
        this.handleReconnect(onMessage, onStatusChange)
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.isConnected = false
        onStatusChange(false)
      }

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
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
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
        this.connect(onMessage, onStatusChange)
      }, delay)
    } else {
      console.log('Max reconnection attempts reached, falling back to polling')
      this.startPolling(onMessage, onStatusChange)
    }
  }

  startPolling(onMessage: (data: any) => void, onStatusChange: (connected: boolean) => void) {
    onStatusChange(true) // Consider polling as connected
    
    const poll = async () => {
      try {
        const response = await fetch('/api/live-data')
        if (response.ok) {
          const data = await response.json()
          onMessage(data)
        }
      } catch (error) {
        console.error('Polling error:', error)
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

// Mock data generator for when real APIs are unavailable
const generateMockData = () => {
  const baseRevenue = 125000
  const baseOrders = 320
  const baseCustomers = 5000
  const baseProducts = 1800

  return {
    timestamp: new Date().toISOString(),
    revenue: {
      total: baseRevenue + Math.random() * 10000,
      today: Math.floor(Math.random() * 5000) + 2000,
      growth: (Math.random() * 20 - 5).toFixed(1) + '%'
    },
    orders: {
      total: baseOrders + Math.floor(Math.random() * 50),
      processing: Math.floor(Math.random() * 20) + 10,
      shipped: Math.floor(Math.random() * 100) + 50
    },
    customers: {
      total: baseCustomers + Math.floor(Math.random() * 200),
      active: Math.floor(Math.random() * 500) + 200,
      newToday: Math.floor(Math.random() * 50) + 10
    },
    products: {
      total: baseProducts + Math.floor(Math.random() * 100),
      lowStock: Math.floor(Math.random() * 25) + 5,
      outOfStock: Math.floor(Math.random() * 10)
    },
    systemHealth: {
      status: Math.random() > 0.1 ? 'OPERATIONAL' : 'WARNING',
      uptime: (99 + Math.random()).toFixed(1) + '%',
      cpuUsage: Math.floor(Math.random() * 40) + 20,
      memoryUsage: Math.floor(Math.random() * 30) + 40,
      responseTime: Math.floor(Math.random() * 200) + 50
    },
    shopifyMetrics: {
      globalSales: '$' + (40000 + Math.random() * 20000).toFixed(0),
      topRegion: ['North America', 'Europe', 'Asia Pacific'][Math.floor(Math.random() * 3)],
      conversionRate: (2 + Math.random() * 2).toFixed(1) + '%'
    },
    marketingData: {
      activeCampaigns: Math.floor(Math.random() * 5) + 3,
      emailsOpened: Math.floor(Math.random() * 1000) + 500,
      clickThrough: (Math.random() * 5 + 2).toFixed(1) + '%',
      adSpend: '$' + (1000 + Math.random() * 2000).toFixed(0)
    }
  }
}

// Main hook for live data
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
    enableMockData = true, 
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

  // Fallback to mock data if real connection fails
  useEffect(() => {
    if (enableMockData && (!isConnected || !data)) {
      const mockInterval = setInterval(() => {
        const mockData = generateMockData()
        handleMessage(mockData)
      }, updateInterval)

      return () => clearInterval(mockInterval)
    }
  }, [enableMockData, isConnected, data, updateInterval, handleMessage])

  // Integrate with Empire Store
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

  // Get specific metric
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
    // Convenient metric accessors
    revenue: data?.revenue,
    orders: data?.orders,
    customers: data?.customers,
    products: data?.products,
    systemHealth: data?.systemHealth,
    shopifyMetrics: data?.shopifyMetrics,
    marketingData: data?.marketingData
  }
}

// Hook for specific metric monitoring
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

    // Threshold alerts
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
      }
    }

    // Change detection alerts
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