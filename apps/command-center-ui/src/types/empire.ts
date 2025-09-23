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
  suppliers?: unknown[];
  category?: string;
  potentialRevenue?: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  suppliers?: unknown[];
}

export interface EmpireMetrics {
  currentRevenue: number;
  totalAgents: number;
  activeCampaigns: number;
}

export interface Campaign {
  id: string;
  name: string;
  status: AgentStatus;
}
