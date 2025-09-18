// Empire State Management using Zustand
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { 
  EmpireMetrics, 
  AgentStatus, 
  ProductOpportunity, 
  ChatMessage, 
  EmergencyAlert,
  AgentNetwork 
} from '@/types/empire';

interface EmpireStore {
  // Core Empire State
  metrics: EmpireMetrics | null;
  agents: AgentStatus[];
  productOpportunities: ProductOpportunity[];
  agentNetwork: AgentNetwork | null;
  
  // UI State
  isFullAutopilot: boolean;
  isEmergencyMode: boolean;
  selectedAgent: string | null;
  activeView: 'dashboard' | 'agents' | 'products' | 'analytics' | 'chat';
  
  // Chat System
  chatMessages: ChatMessage[];
  activeChatAgent: string | null;
  
  // Alerts
  alerts: EmergencyAlert[];
  
  // Real-time Updates
  lastUpdate: Date | null;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  
  // Actions
  setMetrics: (metrics: EmpireMetrics) => void;
  setAgents: (agents: AgentStatus[]) => void;
  updateAgent: (agentId: string, updates: Partial<AgentStatus>) => void;
  setProductOpportunities: (opportunities: ProductOpportunity[]) => void;
  approveProduct: (productId: string) => void;
  rejectProduct: (productId: string, reason?: string) => void;
  
  // Controls
  toggleAutopilot: () => void;
  triggerEmergencyStop: () => void;
  setSelectedAgent: (agentId: string | null) => void;
  setActiveView: (view: EmpireStore['activeView']) => void;
  
  // Chat
  addChatMessage: (message: ChatMessage) => void;
  setActiveChatAgent: (agentId: string | null) => void;
  clearChat: () => void;
  
  // Alerts
  addAlert: (alert: EmergencyAlert) => void;
  resolveAlert: (alertId: string) => void;
  clearAlerts: () => void;
  
  // Network
  setConnectionStatus: (status: EmpireStore['connectionStatus']) => void;
  updateLastSeen: () => void;
}

export const useEmpireStore = create<EmpireStore>()(
  subscribeWithSelector(
    (set, get) => ({
      // Initial State
      metrics: null,
      agents: [],
      productOpportunities: [],
      agentNetwork: null,
      isFullAutopilot: false,
      isEmergencyMode: false,
      selectedAgent: null,
      activeView: 'dashboard',
      chatMessages: [],
      activeChatAgent: null,
      alerts: [],
      lastUpdate: null,
      connectionStatus: 'disconnected',

      // Core Actions
      setMetrics: (metrics) => set({ metrics, lastUpdate: new Date() }),
      
      setAgents: (agents) => set({ agents, lastUpdate: new Date() }),
      
      updateAgent: (agentId, updates) =>
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.agent_id === agentId ? { ...agent, ...updates } : agent
          ),
          lastUpdate: new Date(),
        })),

      setProductOpportunities: (opportunities) =>
        set({ productOpportunities: opportunities, lastUpdate: new Date() }),

      approveProduct: (productId) =>
        set((state) => ({
          productOpportunities: state.productOpportunities.map((product) =>
            product.id === productId
              ? { ...product, approval_status: 'approved' as const }
              : product
          ),
          lastUpdate: new Date(),
        })),

      rejectProduct: (productId, _reason) =>
        set((state) => ({
          productOpportunities: state.productOpportunities.map((product) =>
            product.id === productId
              ? { ...product, approval_status: 'rejected' as const }
              : product
          ),
          lastUpdate: new Date(),
        })),

      // Control Actions
      toggleAutopilot: () =>
        set((state) => ({
          isFullAutopilot: !state.isFullAutopilot,
          lastUpdate: new Date(),
        })),

      triggerEmergencyStop: () => {
        const alert: EmergencyAlert = {
          id: `emergency-${Date.now()}`,
          severity: 'critical',
          title: 'EMERGENCY STOP ACTIVATED',
          description: 'All agents have been halted by manual emergency stop',
          affected_agents: get().agents.map(a => a.agent_id),
          timestamp: new Date(),
          resolved: false,
        };
        
        set((state) => ({
          isEmergencyMode: true,
          isFullAutopilot: false,
          alerts: [alert, ...state.alerts],
          agents: state.agents.map(agent => ({ 
            ...agent, 
            status: 'inactive' as const 
          })),
          lastUpdate: new Date(),
        }));
      },

      setSelectedAgent: (agentId) => set({ selectedAgent: agentId }),
      setActiveView: (view) => set({ activeView: view }),

      // Chat Actions
      addChatMessage: (message) =>
        set((state) => ({
          chatMessages: [...state.chatMessages, message],
          lastUpdate: new Date(),
        })),

      setActiveChatAgent: (agentId) => set({ activeChatAgent: agentId }),
      
      clearChat: () => set({ chatMessages: [] }),

      // Alert Actions
      addAlert: (alert) =>
        set((state) => ({
          alerts: [alert, ...state.alerts],
          lastUpdate: new Date(),
        })),

      resolveAlert: (alertId) =>
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert.id === alertId ? { ...alert, resolved: true } : alert
          ),
          lastUpdate: new Date(),
        })),

      clearAlerts: () => set({ alerts: [] }),

      // Connection Actions
      setConnectionStatus: (status) => set({ connectionStatus: status }),
      updateLastSeen: () => set({ lastUpdate: new Date() }),
    })
  )
);

// Selectors
export const useEmpireMetrics = () => useEmpireStore((state) => state.metrics);
export const useAgents = () => useEmpireStore((state) => state.agents);
export const useProductOpportunities = () => useEmpireStore((state) => state.productOpportunities);
export const useActiveView = () => useEmpireStore((state) => state.activeView);
export const useConnectionStatus = () => useEmpireStore((state) => state.connectionStatus);
export const useChatMessages = () => useEmpireStore((state) => state.chatMessages);
export const useAlerts = () => useEmpireStore((state) => state.alerts);

// Computed selectors
export const useActiveAgents = () => 
  useEmpireStore((state) => state.agents.filter(agent => agent.status === 'active'));

export const usePendingProducts = () =>
  useEmpireStore((state) => 
    state.productOpportunities.filter(product => product.approval_status === 'pending')
  );

export const useCriticalAlerts = () =>
  useEmpireStore((state) => 
    state.alerts.filter(alert => !alert.resolved && alert.severity === 'critical')
  );