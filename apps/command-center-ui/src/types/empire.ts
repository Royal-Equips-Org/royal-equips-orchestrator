// Empire Data Models for Royal Equips Command Center

export interface ProductOpportunity {
  id: string;
  title: string;
  price_range: string;
  trend_score: number; // 0-100
  profit_potential: "High" | "Medium" | "Low";
  source_platform: string;
  search_volume?: number;
  competition_level: "Low" | "Medium" | "High";
  seasonal_factor?: string;
  supplier_leads: string[];
  market_insights: string;
  image_url?: string;
  category: string;
  estimated_profit_margin: number;
  risk_level: "Low" | "Medium" | "High";
  approval_status: "pending" | "approved" | "rejected";
  discovered_at: Date;
}

export interface AgentStatus {
  agent_id: string;
  agent_name: string;
  agent_type: "research" | "supplier" | "marketing" | "analytics" | "automation" | "monitoring";
  status: "active" | "inactive" | "deploying" | "error" | "maintenance";
  performance_score: number; // 0-100
  discoveries_count: number;
  success_rate: number; // 0-100
  last_execution?: Date;
  next_scheduled?: Date;
  current_task?: string;
  health_indicators: {
    cpu_usage: number;
    memory_usage: number;
    error_rate: number;
    response_time: number;
  };
  position?: { x: number; y: number; z: number }; // For 3D visualization
}

export interface EmpireMetrics {
  total_agents: number;
  active_agents: number;
  total_opportunities: number;
  approved_products: number;
  rejected_products: number;
  revenue_progress: number; // Percentage toward $100M
  current_revenue: number;
  target_revenue: number;
  daily_discoveries: number;
  avg_trend_score: number;
  profit_margin_avg: number;
  automation_level: number; // 0-100
  uptime_percentage: number;
  global_regions_active: number;
  suppliers_connected: number;
  customer_satisfaction: number;
}

export interface AgentNetwork {
  nodes: AgentNetworkNode[];
  edges: AgentNetworkEdge[];
}

export interface AgentNetworkNode {
  id: string;
  label: string;
  type: string;
  status: "active" | "inactive" | "warning" | "error";
  position: { x: number; y: number; z: number };
  connections: string[];
  workload: number; // 0-100
}

export interface AgentNetworkEdge {
  source: string;
  target: string;
  type: "data_flow" | "command" | "status_report";
  strength: number; // 0-1
  active: boolean;
}

export interface RevenueData {
  date: string;
  revenue: number;
  target: number;
  products_sold: number;
  profit_margin: number;
}

export interface GlobalOperation {
  region: string;
  country: string;
  coordinates: { lat: number; lng: number };
  active_agents: number;
  revenue_contribution: number;
  market_penetration: number;
  growth_rate: number;
}

export type SwipeDirection = "left" | "right" | "up" | "down";

export interface SwipeAction {
  direction: SwipeDirection;
  action: "approve" | "reject" | "info" | "bookmark";
}

export interface VoiceCommand {
  command: string;
  intent: "status" | "control" | "query" | "emergency";
  parameters?: Record<string, any>;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "agent";
  content: string;
  timestamp: Date;
  agent_id?: string;
  metadata?: Record<string, any>;
}

export interface EmergencyAlert {
  id: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  affected_agents: string[];
  timestamp: Date;
  resolved: boolean;
  actions_taken?: string[];
}