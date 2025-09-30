import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEmpireStore } from './empire-store';
import * as empireService from '../services/empire-service';

// Mock the empire service
vi.mock('../services/empire-service', () => ({
  empireService: {
    fetchMetrics: vi.fn(),
    fetchAgents: vi.fn(),
    fetchProductOpportunities: vi.fn(),
    fetchMarketingCampaigns: vi.fn(),
    approveProduct: vi.fn(),
    rejectProduct: vi.fn(),
    sendChatMessage: vi.fn()
  }
}));

const mockEmpireService = empireService.empireService as any as {
  fetchMetrics: ReturnType<typeof vi.fn>;
  fetchAgents: ReturnType<typeof vi.fn>;
  fetchProductOpportunities: ReturnType<typeof vi.fn>;
  fetchMarketingCampaigns: ReturnType<typeof vi.fn>;
  approveProduct: ReturnType<typeof vi.fn>;
  rejectProduct: ReturnType<typeof vi.fn>;
  sendChatMessage: ReturnType<typeof vi.fn>;
  fetchAnalytics: ReturnType<typeof vi.fn>;
};

describe('EmpireStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useEmpireStore.setState({
      metrics: null,
      agents: [],
      productOpportunities: [],
      marketingCampaigns: [],
      metricsLoading: false,
      metricsError: null,
      agentsLoading: false,
      agentsError: null,
      oppsLoading: false,
      oppsError: null,
      campaignsLoading: false,
      campaignsError: null
    });
  });

  describe('loadMetrics', () => {
    it('should load metrics successfully', async () => {
      const mockMetrics = {
        total_agents: 6,
        active_agents: 5,
        total_opportunities: 3,
        approved_products: 234,
        revenue_progress: 2400000,
        target_revenue: 100000000,
        automation_level: 65,
        system_uptime: 99.2,
        daily_discoveries: 47,
        profit_margin_avg: 35.5
      };

      mockEmpireService.fetchMetrics.mockResolvedValueOnce(mockMetrics);

      const store = useEmpireStore.getState();
      await store.loadMetrics();

      const state = useEmpireStore.getState();
      expect(state.metrics).toEqual(mockMetrics);
      expect(state.metricsLoading).toBe(false);
      expect(state.metricsError).toBe(null);
    });

    it('should handle metrics loading error', async () => {
      const error = new Error('Network error');
      mockEmpireService.fetchMetrics.mockRejectedValueOnce(error);

      const store = useEmpireStore.getState();
      await store.loadMetrics();

      const state = useEmpireStore.getState();
      expect(state.metrics).toBe(null);
      expect(state.metricsLoading).toBe(false);
      expect(state.metricsError).toBe('Network error');
    });

    it('should set loading state during fetch', async () => {
      let resolvePromise: (value: {
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
      }) => void;
      const promise = new Promise<{
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
      }>((resolve) => {
        resolvePromise = resolve;
      });
      
      mockEmpireService.fetchMetrics.mockReturnValueOnce(promise);

      const store = useEmpireStore.getState();
      const loadPromise = store.loadMetrics();

      // Check loading state
      expect(useEmpireStore.getState().metricsLoading).toBe(true);

      // Resolve the promise
      resolvePromise!({
        total_agents: 1,
        active_agents: 1,
        total_opportunities: 1,
        approved_products: 1,
        revenue_progress: 1,
        target_revenue: 1,
        automation_level: 1,
        system_uptime: 1,
        daily_discoveries: 1,
        profit_margin_avg: 1
      });

      await loadPromise;

      // Check final state
      expect(useEmpireStore.getState().metricsLoading).toBe(false);
    });
  });

  describe('loadAgents', () => {
    it('should load agents successfully', async () => {
      const mockAgents = [
        {
          id: '1',
          name: 'Test Agent',
          type: 'research' as const,
          status: 'active' as const,
          performance_score: 94,
          discoveries_count: 127,
          success_rate: 89,
          health: 'good' as const,
          emoji: '🔍'
        }
      ];

      mockEmpireService.fetchAgents.mockResolvedValueOnce(mockAgents);

      const store = useEmpireStore.getState();
      await store.loadAgents();

      const state = useEmpireStore.getState();
      expect(state.agents).toEqual(mockAgents);
      expect(state.agentsLoading).toBe(false);
      expect(state.agentsError).toBe(null);
    });
  });

  describe('approveProduct', () => {
    it('should approve product and remove from opportunities', async () => {
      const mockOpportunities = [
        {
          id: '1',
          title: 'Test Product',
          description: 'Test description',
          price_range: '$10-20',
          trend_score: 85,
          profit_potential: 'High' as const,
          platform: 'Amazon',
          supplier_leads: ['Test Supplier'],
          market_insights: 'Good market',
          confidence_score: 85,
          profit_margin: 40,
          monthly_searches: 1000,
          competition_level: 'Medium'
        }
      ];

      // Set initial state
      useEmpireStore.setState({ productOpportunities: mockOpportunities });

      mockEmpireService.approveProduct.mockResolvedValueOnce(undefined);

      const store = useEmpireStore.getState();
      await store.approveProduct('1');

      const state = useEmpireStore.getState();
      expect(state.productOpportunities).toHaveLength(0);
      expect(mockEmpireService.approveProduct).toHaveBeenCalledWith('1');
    });
  });

  describe('sendUserChat', () => {
    it('should send user chat with optimistic updates', async () => {
      const mockResponse = {
        content: 'AI response',
        agent_name: 'AIRA'
      };

      mockEmpireService.sendChatMessage.mockResolvedValueOnce(mockResponse);

      const store = useEmpireStore.getState();
      await store.sendUserChat('Hello');

      const state = useEmpireStore.getState();
      
      // Should have user message and AI response
      expect(state.chatMessages).toHaveLength(3); // welcome + user + ai
      expect(state.chatMessages[1].content).toBe('Hello');
      expect(state.chatMessages[1].sender).toBe('user');
      expect(state.chatMessages[2].content).toBe('AI response');
      expect(state.chatMessages[2].sender).toBe('ai');
    });

    it('should handle chat error gracefully', async () => {
      mockEmpireService.sendChatMessage.mockRejectedValueOnce(new Error('Network error'));

      const store = useEmpireStore.getState();
      await store.sendUserChat('Hello');

      const state = useEmpireStore.getState();
      
      // Should have error message
      const lastMessage = state.chatMessages[state.chatMessages.length - 1];
      expect(lastMessage.status).toBe('error');
    });
  });
});