// Unified empire domain model types
export type AgentStatus = 'active' | 'inactive' | 'deploying' | 'error';
export type AgentType = 'research' | 'supplier' | 'marketing' | 'analytics' | 'automation' | 'monitoring';
export type HealthStatus = 'good' | 'warning' | 'critical';
export type ProfitPotential = 'High' | 'Medium' | 'Low';

export interface EmpireMetrics {
  total_agents: number;
  active_agents: number;
  total_opportunities: number;
  approved_products: number;
  revenue_progress: number;
  target_revenue: number;
  automation_level: number;
  system_uptime: number;
  daily_discoveries: number;
  profit_margin_avg: number;
}

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  performance_score: number;
  discoveries_count: number;
  success_rate: number;
  last_execution?: Date;
  health: HealthStatus;
  emoji: string;
}

export interface ProductOpportunity {
  id: string;
  title: string;
  description: string;
  price_range: string;
  trend_score: number;
  profit_potential: ProfitPotential;
  platform: string;
  supplier_leads: string[];
  market_insights: string;
  search_volume?: number;
  competition_level: string;
  seasonal_factor?: string;
  confidence_score: number;
  profit_margin: number;
  monthly_searches: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  timestamp: Date;
  sender: 'user' | 'ai';
  agentName?: string;
  status?: 'sending' | 'sent' | 'error';
}

export interface EmergencyAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

export interface MarketingCampaign {
  id: string;
  product_id: string;
  product_title: string;
  platform: 'facebook' | 'instagram' | 'google' | 'tiktok' | 'twitter';
  format: 'image' | 'video' | 'carousel' | 'story';
  status: 'active' | 'paused' | 'completed' | 'draft' | 'error';
  budget: number;
  spent: number;
  reach: number;
  clicks: number;
  conversions: number;
  roas: number;
  created_at: Date;
  content: {
    headline: string;
    description: string;
    call_to_action: string;
    image_url?: string;
    video_url?: string;
  };
}

// API Response types
export interface AIRAResponse {
  content: string;
  agent_name: string;
  plan?: any;
  risk?: { level: string; score: number };
  verifications?: any[];
  approvals?: any[];
  tool_calls?: any[];
  next_steps?: string[];
}

// Error types
export interface ServiceError {
  kind: 'timeout' | 'http' | 'network' | 'circuit_open' | 'validation';
  status?: number;
  message: string;
}
