// Empire service layer for API interactions
import { 
  Agent, 
  EmpireMetrics, 
  ProductOpportunity, 
  MarketingCampaign,
  AIRAResponse,
  ServiceError 
} from '../types/empire';
import { apiClient } from './api-client';
import { 
  validateAndTransform,
  isEmpireMetrics,
  isAgentArray,
  isProductOpportunityArray,
  isMarketingCampaignArray,
  isAIRAResponse
} from './validators';
import { logger } from './log';
import { retryMetrics, retryAgents, retryOpportunities, retryCampaigns } from './retry-policy';

export class EmpireService {
  async fetchMetrics(): Promise<EmpireMetrics> {
    try {
      logger.info('Fetching empire metrics');
      return await retryMetrics(async () => {
        const data = await apiClient.get('/api/empire/metrics');
        return validateAndTransform(data, isEmpireMetrics, 'EmpireMetrics');
      });
    } catch (error) {
      logger.error('Failed to fetch metrics', { error: String(error) });
      throw error;
    }
  }

  async fetchAgents(): Promise<Agent[]> {
    try {
      logger.info('Fetching agents');
      return await retryAgents(async () => {
        const data = await apiClient.get('/api/empire/agents');
        return validateAndTransform(data, isAgentArray, 'Agent[]');
      });
    } catch (error) {
      logger.error('Failed to fetch agents', { error: String(error) });
      throw error;
    }
  }

  async fetchProductOpportunities(): Promise<ProductOpportunity[]> {
    try {
      logger.info('Fetching product opportunities');
      return await retryOpportunities(async () => {
        const data = await apiClient.get('/api/empire/opportunities');
        return validateAndTransform(data, isProductOpportunityArray, 'ProductOpportunity[]');
      });
    } catch (error) {
      logger.error('Failed to fetch product opportunities', { error: String(error) });
      throw error;
    }
  }

  async fetchMarketingCampaigns(): Promise<MarketingCampaign[]> {
    try {
      logger.info('Fetching marketing campaigns');
      return await retryCampaigns(async () => {
        const data = await apiClient.get('/api/empire/campaigns');
        return validateAndTransform(data, isMarketingCampaignArray, 'MarketingCampaign[]');
      });
    } catch (error) {
      logger.error('Failed to fetch marketing campaigns', { error: String(error) });
      throw error;
    }
  }

  async approveProduct(productId: string): Promise<void> {
    try {
      logger.info('Approving product', { productId });
      await apiClient.post(`/v1/opportunities/${productId}/approve`);
    } catch (error) {
      logger.error('Failed to approve product', { productId, error: String(error) });
      throw error;
    }
  }

  async rejectProduct(productId: string, reason?: string): Promise<void> {
    try {
      logger.info('Rejecting product', { productId, reason });
      await apiClient.post(`/v1/opportunities/${productId}/reject`, { reason });
    } catch (error) {
      logger.error('Failed to reject product', { productId, reason, error: String(error) });
      throw error;
    }
  }

  async sendChatMessage(content: string): Promise<AIRAResponse> {
    try {
      logger.info('Sending chat message', { messageLength: content.length });
      // Use the correct AIRA endpoint
      const data = await apiClient.post('/api/empire/chat', { content });
      return validateAndTransform(data, isAIRAResponse, 'AIRAResponse');
    } catch (error) {
      logger.error('Failed to send chat message', { error: String(error) });
      throw error;
    }
  }

  async fetchAnalytics(): Promise<any> {
    try {
      logger.info('Fetching analytics data');
      const data = await apiClient.get('/api/empire/analytics');
      return data;
    } catch (error) {
      logger.error('Failed to fetch analytics', { error: String(error) });
      throw error;
    }
  }
}

// Singleton instance
export const empireService = new EmpireService();