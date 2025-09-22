import { create } from 'zustand';

// Real API configuration
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api.royalequips.com' 
  : 'http://localhost:8000';

const API_TOKEN = typeof window !== 'undefined' 
  ? localStorage.getItem('empire_token') || 'royal-empire-2024'
  : 'royal-empire-2024';

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

export interface AgentStatus {
  id: string;
  name: string;
  type: 'research' | 'supplier' | 'marketing' | 'analytics' | 'automation' | 'monitoring';
  status: 'active' | 'inactive' | 'deploying' | 'error';
  performance_score: number;
  discoveries_count: number;
  success_rate: number;
  last_execution?: Date;
  health: 'good' | 'warning' | 'critical';
  emoji: string;
}

export interface ProductOpportunity {
  id: string;
  title: string;
  description: string;
  price_range: string;
  trend_score: number;
  profit_potential: 'High' | 'Medium' | 'Low';
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

interface EmpireStore {
  // Core State
  metrics: EmpireMetrics | null;
  agents: AgentStatus[];
  productOpportunities: ProductOpportunity[];
  marketingCampaigns: MarketingCampaign[];
  chatMessages: ChatMessage[];
  alerts: EmergencyAlert[];
  
  // Connection State
  isConnected: boolean;
  connectionError: string | null;
  lastUpdate: Date | null;
  
  // Control State
  isFullAutopilot: boolean;
  isEmergencyMode: boolean;
  
  // Actions
  toggleAutopilot: () => void;
  triggerEmergencyStop: () => void;
  approveProduct: (productId: string) => void;
  rejectProduct: (productId: string, reason?: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  sendChatMessage: (content: string) => void;
  addAlert: (alert: Omit<EmergencyAlert, 'id' | 'timestamp'>) => void;
  clearAlert: (id: string) => void;
}

export const useEmpireStore = create<EmpireStore>((set, get) => ({
  // Initial State
  metrics: {
    total_agents: 6,
    active_agents: 5,
    total_opportunities: 3,
    approved_products: 234,
    revenue_progress: 2400000,
    target_revenue: 100000000,
    automation_level: 65,
    system_uptime: 99.2,
    daily_discoveries: 47,
    profit_margin_avg: 35.5,
  },
  
  agents: [
    {
      id: '1',
      name: 'Product Research Agent',
      type: 'research',
      status: 'active',
      performance_score: 94,
      discoveries_count: 127,
      success_rate: 89,
      health: 'good',
      emoji: '🔍',
    },
    {
      id: '2',
      name: 'Supplier Intelligence Agent',
      type: 'supplier',
      status: 'active',
      performance_score: 87,
      discoveries_count: 89,
      success_rate: 92,
      health: 'good',
      emoji: '🏭',
    },
    {
      id: '3',
      name: 'Master Agent Coordinator',
      type: 'automation',
      status: 'active',
      performance_score: 98,
      discoveries_count: 45,
      success_rate: 96,
      health: 'good',
      emoji: '🤖',
    },
    {
      id: '4',
      name: 'Market Analysis Agent',
      type: 'analytics',
      status: 'deploying',
      performance_score: 0,
      discoveries_count: 0,
      success_rate: 0,
      health: 'warning',
      emoji: '📊',
    },
    {
      id: '5',
      name: 'Pricing Strategy Agent',
      type: 'analytics',
      status: 'inactive',
      performance_score: 76,
      discoveries_count: 32,
      success_rate: 78,
      health: 'warning',
      emoji: '💰',
    },
    {
      id: '6',
      name: 'Marketing Orchestrator',
      type: 'marketing',
      status: 'error',
      performance_score: 65,
      discoveries_count: 18,
      success_rate: 45,
      health: 'critical',
      emoji: '📱',
    },
  ],
  
  productOpportunities: [
    {
      id: '1',
      title: 'Portable Solar Power Bank with Wireless Charging',
      description: 'Eco-friendly portable charging solution with solar panels and wireless charging capability.',
      price_range: '$25-$35',
      trend_score: 87,
      profit_potential: 'High',
      platform: 'Amazon',
      supplier_leads: ['SolarTech Co.', 'GreenPower Ltd.'],
      market_insights: 'Growing demand for eco-friendly portable charging solutions. High search volume during camping season.',
      search_volume: 45000,
      competition_level: 'Medium',
      seasonal_factor: 'Summer peak',
      confidence_score: 87,
      profit_margin: 45,
      monthly_searches: 45000,
    },
    {
      id: '2',
      title: 'Smart Fitness Tracker with Heart Rate Monitor',
      description: 'Advanced fitness tracking device with heart rate monitoring, GPS, and smartphone integration.',
      price_range: '$45-$65',
      trend_score: 92,
      profit_potential: 'High',
      platform: 'eBay',
      supplier_leads: ['FitTech Solutions', 'HealthGear Pro'],
      market_insights: 'Consistent year-round demand. New Year surge expected. Health consciousness trend driving sales.',
      search_volume: 67000,
      competition_level: 'High',
      confidence_score: 92,
      profit_margin: 52,
      monthly_searches: 67000,
    },
    {
      id: '3',
      title: 'LED Strip Lights with App Control',
      description: 'Smart LED strip lights with smartphone app control, multiple colors, and music sync.',
      price_range: '$15-$25',
      trend_score: 78,
      profit_potential: 'Medium',
      platform: 'Shopify',
      supplier_leads: ['LightUp Industries', 'RGB Solutions'],
      market_insights: 'Popular for home decoration and gaming setups. Holiday season shows highest sales.',
      search_volume: 34000,
      competition_level: 'Medium',
      seasonal_factor: 'Holiday boost',
      confidence_score: 78,
      profit_margin: 38,
      monthly_searches: 34000,
    },
  ],
  
  marketingCampaigns: [
    {
      id: '1',
      product_id: 'prod_1',
      product_title: 'Portable Solar Power Bank',
      platform: 'facebook',
      format: 'image',
      status: 'active',
      budget: 500,
      spent: 234,
      reach: 15420,
      clicks: 823,
      conversions: 47,
      roas: 3.2,
      created_at: new Date('2024-01-15'),
      content: {
        headline: '🔋 Never Run Out of Power Again!',
        description: 'Portable solar power bank with wireless charging. Perfect for outdoor adventures!',
        call_to_action: 'Shop Now',
        image_url: '/api/placeholder/400/300'
      }
    },
    {
      id: '2',
      product_id: 'prod_2',
      product_title: 'Smart Fitness Tracker',
      platform: 'instagram',
      format: 'video',
      status: 'active',
      budget: 750,
      spent: 456,
      reach: 28350,
      clicks: 1456,
      conversions: 89,
      roas: 4.7,
      created_at: new Date('2024-01-16'),
      content: {
        headline: '💪 Track Your Fitness Journey',
        description: 'Advanced fitness tracker with heart rate monitoring and GPS.',
        call_to_action: 'Get Yours',
        video_url: '/api/video/fitness-tracker-demo'
      }
    }
  ],
  
  chatMessages: [
    {
      id: '1',
      content: '👑 Welcome to the Royal Equips Empire Command Center! I\'m AIRA, your Main Empire Agent, ready to orchestrate all domains with omniscient context and natural language planning.',
      timestamp: new Date(Date.now() - 300000),
      sender: 'ai',
      agentName: 'AIRA',
    }
  ],
  
  alerts: [
    {
      id: '1',
      type: 'warning',
      message: 'Marketing Orchestrator agent in error state - requires attention',
      timestamp: new Date(Date.now() - 120000),
      resolved: false,
    },
    {
      id: '2',
      type: 'info',
      message: 'Market Analysis Agent deployment in progress',
      timestamp: new Date(Date.now() - 300000),
      resolved: false,
    },
  ],
  
  isConnected: true,
  connectionError: null,
  lastUpdate: new Date(),
  isFullAutopilot: false,
  isEmergencyMode: false,
  
  // Actions
  toggleAutopilot: () => {
    set(state => ({ isFullAutopilot: !state.isFullAutopilot }));
    get().addAlert({
      type: 'info',
      message: `Autopilot ${get().isFullAutopilot ? 'enabled' : 'disabled'}`,
      resolved: false,
    });
  },
  
  triggerEmergencyStop: () => {
    set({ isEmergencyMode: true, isFullAutopilot: false });
    get().addAlert({
      type: 'critical',
      message: 'EMERGENCY STOP ACTIVATED - All operations halted',
      resolved: false,
    });
  },
  
  approveProduct: (productId: string) => {
    set(state => ({
      productOpportunities: state.productOpportunities.filter(opp => opp.id !== productId),
    }));
    get().addAlert({
      type: 'info',
      message: 'Product approved and deployment initiated',
      resolved: false,
    });
  },
  
  rejectProduct: (productId: string, reason = 'Not suitable') => {
    set(state => ({
      productOpportunities: state.productOpportunities.filter(opp => opp.id !== productId),
    }));
  },
  
  addChatMessage: (message: ChatMessage) => {
    set(state => ({
      chatMessages: [...state.chatMessages, message],
    }));
  },
  
  sendChatMessage: (content: string) => {
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      content,
      timestamp: new Date(),
      sender: 'user',
    };
    
    get().addChatMessage(userMessage);
    
    // Production implementation will be handled by AIChatInterface component
    // which connects directly to AIRA API
  },
  
  addAlert: (alert: Omit<EmergencyAlert, 'id' | 'timestamp'>) => {
    const newAlert: EmergencyAlert = {
      ...alert,
      id: `alert_${Date.now()}`,
      timestamp: new Date(),
    };
    
    set(state => ({
      alerts: [newAlert, ...state.alerts.slice(0, 9)], // Keep last 10 alerts
    }));
  },
  
  clearAlert: (id: string) => {
    set(state => ({
      alerts: state.alerts.map(alert =>
        alert.id === id ? { ...alert, resolved: true } : alert
      ),
    }));
  },
}));

// Convenience hooks for accessing specific parts of the store
export const useEmpireMetrics = () => useEmpireStore(state => state.metrics);
export const useAgents = () => useEmpireStore(state => state.agents);
export const useProductOpportunities = () => useEmpireStore(state => state.productOpportunities);
export const useChatMessages = () => useEmpireStore(state => state.chatMessages);
export const useMarketingCampaigns = () => useEmpireStore(state => state.marketingCampaigns);
export const useAlerts = () => useEmpireStore(state => state.alerts);