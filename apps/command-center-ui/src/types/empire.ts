// Basic types for empire functionality
export type AgentStatus = 'active' | 'paused' | 'completed' | 'draft';

export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  type: string;
}

export interface ProductOpportunity {
  id: string;
  name: string;
  price: number;
  suppliers?: any[];
  category?: string;
  potential_revenue?: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  suppliers?: any[];
}

export interface EmpireMetrics {
  current_revenue: number;
  total_agents: number;
  active_campaigns: number;
}

export interface Campaign {
  id: string;
  name: string;
  status: AgentStatus;
}