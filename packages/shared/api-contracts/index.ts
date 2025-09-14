/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Bestaande contract-API blijft intact.
 * Upgrade: lint-stabilisatie zonder functionele wijziging.
 * Verwijder deze disable wanneer je expliciete types toevoegt.
 */

// [JE BESTAANDE INHOUD HIER ONGEWIJZIGD LATEN]
export interface ShopifySyncRequest {
  syncType: 'products' | 'inventory' | 'orders' | 'customers'
  forceRefresh?: boolean
}

export interface ShopifySyncResponse {
  jobId: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  message: string
}

export interface GitHubStatusResponse {
  commits: Array<{
    sha: string
    message: string
    author: string
    date: Date
  }>
  pullRequests: {
    open: number
    closed: number
  }
  issues: {
    open: number
    closed: number
  }
  lastUpdate: Date
}

export interface AgentControlRequest {
  action: 'start' | 'stop' | 'restart' | 'configure'
  agentId?: string
  config?: Record<string, any>
}

export interface AgentControlResponse {
  success: boolean
  message: string
  agentStatus?: string
}
