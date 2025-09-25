import { create } from 'zustand';
import { 
  Agent, 
  EmpireMetrics, 
  ProductOpportunity, 
  MarketingCampaign, 
  ChatMessage, 
  EmergencyAlert,
  ServiceError
} from '../types/empire';

// Re-export for backward compatibility
export { 
  Agent, 
  EmpireMetrics, 
  ProductOpportunity, 
  MarketingCampaign, 
  ChatMessage, 
  EmergencyAlert 
} from '../types/empire';
import { empireService } from '../services/empire-service';
import { logger } from '../services/log';

interface EmpireStore {
  // Core State
  metrics: EmpireMetrics | null;
  agents: Agent[];
  productOpportunities: ProductOpportunity[];
  marketingCampaigns: MarketingCampaign[];
  chatMessages: ChatMessage[];
  alerts: EmergencyAlert[];
  selectedAgentId: string | null;
  
  // Loading States
  metricsLoading: boolean;
  metricsError: string | null;
  agentsLoading: boolean;
  agentsError: string | null;
  oppsLoading: boolean;
  oppsError: string | null;
  campaignsLoading: boolean;
  campaignsError: string | null;
  
  // Connection State
  isConnected: boolean;
  connectionError: string | null;
  lastUpdate: Date | null;
  
  // Control State
  isFullAutopilot: boolean;
  isEmergencyMode: boolean;
  
  // Actions - Data Loading
  refreshAll: () => Promise<void>;
  loadMetrics: () => Promise<void>;
  loadAgents: () => Promise<void>;
  loadProductOpportunities: () => Promise<void>;
  loadMarketingCampaigns: () => Promise<void>;
  
  // Actions - Controls
  toggleAutopilot: () => void;
  triggerEmergencyStop: () => void;
  setSelectedAgent: (agentId: string | null) => void;
  
  // Actions - Product Management
  approveProduct: (productId: string) => Promise<void>;
  rejectProduct: (productId: string, reason?: string) => Promise<void>;
  
  // Actions - Chat
  addChatMessage: (message: ChatMessage) => void;
  sendUserChat: (content: string) => Promise<void>;
  
  // Actions - Alerts
  addAlert: (alert: Omit<EmergencyAlert, 'id' | 'timestamp'>) => void;
  clearAlert: (id: string) => void;
}

export const useEmpireStore = create<EmpireStore>((set, get) => ({
  // Initial State
  metrics: null,
  agents: [],
  productOpportunities: [],
  marketingCampaigns: [],
  chatMessages: [
    {
      id: 'welcome',
      content: '👑 Welcome to the Royal Equips Empire Command Center! I\'m AIRA, your Main Empire Agent, ready to orchestrate all domains with omniscient context and natural language planning.',
      timestamp: new Date(),
      sender: 'ai',
      agentName: 'AIRA',
    }
  ],
  alerts: [],
  selectedAgentId: null,
  
  // Loading States
  metricsLoading: false,
  metricsError: null,
  agentsLoading: false,
  agentsError: null,
  oppsLoading: false,
  oppsError: null,
  campaignsLoading: false,
  campaignsError: null,
  
  // Connection State
  isConnected: true,
  connectionError: null,
  lastUpdate: null,
  isFullAutopilot: false,
  isEmergencyMode: false,
  
  // Data Loading Actions
  refreshAll: async () => {
    logger.info('Refreshing all data');
    const { loadMetrics, loadAgents, loadProductOpportunities, loadMarketingCampaigns } = get();
    
    try {
      await Promise.all([
        loadMetrics(),
        loadAgents(),
        loadProductOpportunities(),
        loadMarketingCampaigns()
      ]);
      
      set({ 
        lastUpdate: new Date(),
        isConnected: true,
        connectionError: null
      });
    } catch (error) {
      logger.error('Failed to refresh all data', { error: String(error) });
      set({ 
        isConnected: false,
        connectionError: 'Failed to connect to empire services'
      });
    }
  },

  loadMetrics: async () => {
    set({ metricsLoading: true, metricsError: null });
    
    try {
      const metrics = await empireService.fetchMetrics();
      set({ metrics, metricsLoading: false });
    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? (error as ServiceError).message 
        : 'Failed to load metrics';
      
      set({ 
        metricsLoading: false, 
        metricsError: errorMessage 
      });
    }
  },

  loadAgents: async () => {
    set({ agentsLoading: true, agentsError: null });
    
    try {
      const agents = await empireService.fetchAgents();
      set({ agents, agentsLoading: false });
    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? (error as ServiceError).message 
        : 'Failed to load agents';
      
      set({ 
        agentsLoading: false, 
        agentsError: errorMessage 
      });
    }
  },

  loadProductOpportunities: async () => {
    set({ oppsLoading: true, oppsError: null });
    
    try {
      const productOpportunities = await empireService.fetchProductOpportunities();
      set({ productOpportunities, oppsLoading: false });
    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? (error as ServiceError).message 
        : 'Failed to load product opportunities';
      
      set({ 
        oppsLoading: false, 
        oppsError: errorMessage 
      });
    }
  },

  loadMarketingCampaigns: async () => {
    set({ campaignsLoading: true, campaignsError: null });
    
    try {
      const marketingCampaigns = await empireService.fetchMarketingCampaigns();
      set({ marketingCampaigns, campaignsLoading: false });
    } catch (error) {
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? (error as ServiceError).message 
        : 'Failed to load marketing campaigns';
      
      set({ 
        campaignsLoading: false, 
        campaignsError: errorMessage 
      });
    }
  },

  // Control Actions
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

  setSelectedAgent: (agentId: string | null) => {
    set({ selectedAgentId: agentId });
  },

  // Product Management Actions
  approveProduct: async (productId: string) => {
    try {
      await empireService.approveProduct(productId);
      
      set(state => ({
        productOpportunities: state.productOpportunities.filter(opp => opp.id !== productId),
      }));
      
      get().addAlert({
        type: 'info',
        message: 'Product approved and deployment initiated',
        resolved: false,
      });
    } catch (error) {
      get().addAlert({
        type: 'warning',
        message: 'Failed to approve product',
        resolved: false,
      });
    }
  },

  rejectProduct: async (productId: string, reason = 'Not suitable') => {
    try {
      await empireService.rejectProduct(productId, reason);
      
      set(state => ({
        productOpportunities: state.productOpportunities.filter(opp => opp.id !== productId),
      }));
    } catch (error) {
      get().addAlert({
        type: 'warning',
        message: 'Failed to reject product',
        resolved: false,
      });
    }
  },

  // Chat Actions
  addChatMessage: (message: ChatMessage) => {
    set(state => ({
      chatMessages: [...state.chatMessages, message],
    }));
  },

  sendUserChat: async (content: string) => {
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      content,
      timestamp: new Date(),
      sender: 'user',
    };
    
    // Optimistically add user message
    get().addChatMessage(userMessage);
    
    // Add placeholder AI message
    const placeholderId = `ai_${Date.now()}`;
    const placeholderMessage: ChatMessage = {
      id: placeholderId,
      content: 'Thinking...',
      timestamp: new Date(),
      sender: 'ai',
      agentName: 'AIRA',
      status: 'sending'
    };
    
    get().addChatMessage(placeholderMessage);
    
    try {
      const response = await empireService.sendChatMessage(content);
      
      // Replace placeholder with actual response
      set(state => ({
        chatMessages: state.chatMessages.map(msg =>
          msg.id === placeholderId
            ? {
                ...msg,
                content: response.content,
                agentName: response.agent_name,
                status: 'sent'
              }
            : msg
        )
      }));
    } catch (error) {
      // Replace placeholder with error message
      set(state => ({
        chatMessages: state.chatMessages.map(msg =>
          msg.id === placeholderId
            ? {
                ...msg,
                content: 'Sorry, I encountered an error processing your request. Please try again.',
                status: 'error'
              }
            : msg
        )
      }));
      
      get().addAlert({
        type: 'warning',
        message: 'Failed to send chat message',
        resolved: false,
      });
    }
  },

  // Alert Actions
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

// Loading state hooks
export const useLoadingStates = () => useEmpireStore(state => ({
  metricsLoading: state.metricsLoading,
  agentsLoading: state.agentsLoading,
  oppsLoading: state.oppsLoading,
  campaignsLoading: state.campaignsLoading,
}));

export const useErrorStates = () => useEmpireStore(state => ({
  metricsError: state.metricsError,
  agentsError: state.agentsError,
  oppsError: state.oppsError,
  campaignsError: state.campaignsError,
}));