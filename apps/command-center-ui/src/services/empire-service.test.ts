import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmpireService } from './empire-service';
import { apiClient } from './api-client';

// Mock the apiClient methods
vi.mock('./api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

// Use vitest's mocked utility to get proper typing
const mockApiClient = vi.mocked(apiClient);

describe('EmpireService', () => {
  let empireService: EmpireService;

  beforeEach(() => {
    vi.clearAllMocks();
    empireService = new EmpireService();
  });

  describe('fetchMetrics', () => {
    it('should fetch and validate metrics successfully', async () => {
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

      mockApiClient.get.mockResolvedValueOnce(mockMetrics);

      const result = await empireService.fetchMetrics();

      expect(result).toEqual(mockMetrics);
      expect(mockApiClient.get).toHaveBeenCalledWith('/empire/metrics');
    });

    it('should throw error for invalid metrics data', async () => {
      const invalidMetrics = { invalid: 'data' };
      mockApiClient.get.mockResolvedValueOnce(invalidMetrics);

      await expect(empireService.fetchMetrics()).rejects.toThrow(
        'Invalid data structure for EmpireMetrics'
      );
    });
  });

  describe('fetchAgents', () => {
    it('should fetch and validate agents successfully', async () => {
      const mockAgents = [
        {
          id: '1',
          name: 'Test Agent',
          type: 'research',
          status: 'active',
          performance_score: 94,
          discoveries_count: 127,
          success_rate: 89,
          health: 'good',
          emoji: '🔍'
        }
      ];

      mockApiClient.get.mockResolvedValueOnce(mockAgents);

      const result = await empireService.fetchAgents();

      expect(result).toEqual(mockAgents);
      expect(mockApiClient.get).toHaveBeenCalledWith('/empire/agents');
    });
  });

  describe('approveProduct', () => {
    it('should approve product successfully', async () => {
      mockApiClient.post.mockResolvedValueOnce({});

      await empireService.approveProduct('test-id');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/empire/opportunities/test-id/approve'
      );
    });
  });

  describe('rejectProduct', () => {
    it('should reject product with reason', async () => {
      mockApiClient.post.mockResolvedValueOnce({});

      await empireService.rejectProduct('test-id', 'Not suitable');

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/empire/opportunities/test-id/reject',
        { reason: 'Not suitable' }
      );
    });
  });

  describe('sendChatMessage', () => {
    it('should send chat message successfully', async () => {
      const mockResponse = {
        content: 'AI response',
        agent_name: 'AIRA'
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await empireService.sendChatMessage('Hello');

      expect(result).toEqual(mockResponse);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/empire/chat',
        { content: 'Hello' }
      );
    });
  });

  describe('controls', () => {
    it('should trigger engine boost', async () => {
      mockApiClient.post.mockResolvedValueOnce({});
      await empireService.triggerEngineBoost();
      expect(mockApiClient.post).toHaveBeenCalledWith('/empire/controls/engine-boost');
    });

    it('should trigger auto sync', async () => {
      mockApiClient.post.mockResolvedValueOnce({});
      await empireService.triggerAutoSync();
      expect(mockApiClient.post).toHaveBeenCalledWith('/empire/controls/auto-sync');
    });
  });

  describe('logInteraction', () => {
    it('should post interaction payload', async () => {
      mockApiClient.post.mockResolvedValueOnce({});
      await empireService.logInteraction({
        source: 'voice',
        command: 'run engine boost',
        handled: true,
        timestamp: new Date().toISOString(),
      });
      expect(mockApiClient.post).toHaveBeenCalledWith('/empire/interactions', expect.objectContaining({
        source: 'voice',
        command: 'run engine boost'
      }));
    });

    it('should swallow logging errors', async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error('fail'));
      await expect(empireService.logInteraction({
        source: 'ui',
        message: 'noop',
        timestamp: new Date().toISOString(),
      })).resolves.toBeUndefined();
    });
  });
});