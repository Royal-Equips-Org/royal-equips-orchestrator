export interface Page {
  id: string;
  name: string;
  icon: string;
  component: React.ComponentType;
}

export interface AgentSession {
  id: string;
  created_at: string;
  messages: AgentMessage[];
}

export interface AgentMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  active_agents: number;
  api_calls_today: number;
  uptime_hours: number;
}

export interface WorkerStatus {
  ok: boolean;
  worker: string;
  timestamp: string;
  environment: string;
}