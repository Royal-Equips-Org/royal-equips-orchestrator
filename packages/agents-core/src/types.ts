export interface AgentExecutionPlan {
  id: string;
  agentId: string;
  action: string;
  parameters: Record<string, unknown>;
  dependencies: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  needsApproval: boolean;
  rollbackPlan: RollbackPlan;
  timestamp: string;
}

export interface RollbackPlan {
  steps: RollbackStep[];
  timeout: number;
  fallbackAction: string;
}

export interface RollbackStep {
  action: string;
  parameters: Record<string, unknown>;
  order: number;
}

export interface AgentExecutionResult {
  planId: string;
  status: 'success' | 'error' | 'partial' | 'rollback';
  results: Record<string, unknown>;
  metrics: ExecutionMetrics;
  errors?: string[];
  timestamp: string;
}

export interface ExecutionMetrics {
  duration: number;
  resourcesUsed: number;
  apiCalls: number;
  dataProcessed: number;
}

export interface AgentStatus {
  id: string;
  name: string;
  type: AgentType;
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  health: 'healthy' | 'warning' | 'critical';
  lastExecution: string;
  nextExecution: string;
  errorCount: number;
  successRate: number;
  averageDuration: number;
}

export interface AgentConfig {
  id: string;
  name: string;
  type: AgentType;
  schedule: string; // cron expression
  enabled: boolean;
  retryPolicy: RetryPolicy;
  alertPolicy: AlertPolicy;
  resources: ResourceLimits;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential';
  initialDelay: number;
  maxDelay: number;
}

export interface AlertPolicy {
  errorThreshold: number;
  responseTimeThreshold: number;
  channels: AlertChannel[];
}

export interface AlertChannel {
  type: 'slack' | 'discord' | 'email';
  endpoint: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface ResourceLimits {
  maxMemory: number;
  maxCpu: number;
  timeout: number;
  concurrency: number;
}

export type AgentType = 
  | 'product-research'
  | 'pricing'
  | 'inventory'
  | 'orders'
  | 'customers' 
  | 'marketing'
  | 'cx'
  | 'finance'
  | 'compliance'
  | 'observer'
  | 'toolsmith'
  | 'store-generator'
  | 'marketplace'
  | 'supplier'
  | 'innovation'
  | 'predictive-analytics'
  | 'fraud-detection'
  | 'legal'
  | 'hr-team'
  | 'empire-planner';

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  type: 'command' | 'event' | 'response' | 'alert';
  payload: Record<string, unknown>;
  timestamp: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}