export interface Agent {
  id: string
  name: string
  type: 'shopify' | 'github' | 'ai' | 'monitor'
  status: 'active' | 'inactive' | 'error' | 'stopped'
  lastHeartbeat: Date
  metrics: {
    tasksCompleted: number
    errorRate: number
    avgResponseTime: number
  }
}

export interface SystemMetrics {
  cpu: number
  memory: number
  disk: number
  network: {
    in: number
    out: number
  }
  uptime: number
}

export interface AlertEvent {
  id: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  message: string
  source: string
  timestamp: Date
  acknowledged: boolean
}

export interface JobQueueStatus {
  pending: number
  processing: number
  completed: number
  failed: number
}