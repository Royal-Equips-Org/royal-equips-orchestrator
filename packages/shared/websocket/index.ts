export interface WebSocketEvent {
  channel: string
  event: string
  data: any
  timestamp: Date
}

export interface SystemHeartbeat extends WebSocketEvent {
  channel: 'system'
  event: 'heartbeat'
  data: {
    metrics: import('../types').SystemMetrics
    agents: import('../types').Agent[]
  }
}

export interface ShopifyUpdate extends WebSocketEvent {
  channel: 'shopify'
  event: 'sync_progress' | 'rate_limit' | 'webhook'
  data: {
    jobId?: string
    progress?: number
    rateLimitRemaining?: number
    webhookData?: any
  }
}

export interface LogStreamEvent extends WebSocketEvent {
  channel: 'logs'
  event: 'log'
  data: {
    level: 'debug' | 'info' | 'warning' | 'error'
    message: string
    source: string
    timestamp: Date
  }
}