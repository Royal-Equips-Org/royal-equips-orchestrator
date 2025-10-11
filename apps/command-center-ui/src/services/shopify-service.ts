/**
 * Shopify Service - Real E-commerce Integration
 * 
 * Provides enterprise-grade Shopify integration with live product data,
 * comprehensive error handling, and business metrics.
 */

import { apiClient } from './api-client';
import { logger } from './log';

export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  handle: string;
  status: string;
  productType: string;
  vendor: string;
  tags: string[];
  totalInventory?: number;
  images: {
    edges: Array<{
      node: {
        id: string;
        url: string;
        altText: string;
        width: number;
        height: number;
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        sku: string;
        price: string;
        compareAtPrice?: string;
        availableForSale: boolean;
        inventoryQuantity: number;
      };
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ShopifyOrder {
  id: string;
  name: string;
  email?: string;
  totalPrice: string;
  financialStatus: string;
  fulfillmentStatus: string;
  createdAt: string;
}

export interface ShopifyCustomer {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  ordersCount: number;
  totalSpent: string;
  createdAt: string;
}

export type ShopifyDataSource = 'live_shopify' | 'no_data_available' | 'fetch_failed' | 'error_occurred';

export interface ShopifyMetrics {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  averageOrderValue: number;
  conversionRate: number;
  trafficEstimate: number;
  topProducts: Array<{
    id: string;
    title: string;
    handle: string;
    totalSales: number;
    ordersCount: number;
    inventoryLevel: number;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    totalPrice: string;
    createdAt: string;
    fulfillmentStatus: string;
  }>;
  source: ShopifyDataSource;
  lastUpdated: string;
  connected: boolean;
}

export interface ShopifyApiResponse<T> {
  success: boolean;
  data?: T;
  source: ShopifyDataSource;
  total?: number;
  message?: string;
}

export class ShopifyService {
  private baseUrl = `${apiClient.getBaseUrl()}/shopify`;

  /**
   * Get Shopify store status and configuration
   */
  async getStoreHealth(): Promise<{
    status: 'connected' | 'disconnected' | 'error';
    shopName?: string;
    details: string;
  }> {
    try {
      logger.info('Fetching Shopify store health');
      
      const response = await apiClient.get(`${this.baseUrl}/status`) as {
        configured: boolean;
        shop_info?: {
          name?: string;
        };
        error?: string;
      };
      
      if (response.configured) {
        return {
          status: 'connected',
          shopName: response.shop_info?.name || 'Unknown Shop',
          details: `Connected to ${response.shop_info?.name || 'Shopify store'}`
        };
      } else {
        return {
          status: 'disconnected',
          details: response.error || 'Shopify not configured'
        };
      }
    } catch (error) {
      logger.error('Failed to fetch Shopify status', { error: String(error) });
      return {
        status: 'error',
        details: 'Failed to connect to Shopify API'
      };
    }
  }

  /**
   * Trigger product synchronization
   */
  async syncProducts(): Promise<{ jobId: string; message: string }> {
    try {
      logger.info('Triggering Shopify product sync');
      
      const response = await apiClient.post(`${this.baseUrl}/sync-products`, {
        limit: 100,
        force: false
      }) as {
        job_id: string;
        message?: string;
      };
      
      return {
        jobId: response.job_id,
        message: response.message || 'Product sync initiated'
      };
    } catch (error) {
      logger.error('Failed to sync products', { error: String(error) });
      throw error;
    }
  }

  /**
   * Get active Shopify sync jobs
   */
  async getActiveJobs(): Promise<any[]> {
    try {
      logger.info('Fetching Shopify sync jobs');
      
      const response = await apiClient.get(`${this.baseUrl}/jobs`) as {
        jobs?: any[];
      };
      return response.jobs || [];
    } catch (error) {
      logger.error('Failed to fetch jobs', { error: String(error) });
      return [];
    }
  }

  /**
   * Get job status by ID  
   */
  async getJobStatus(jobId: string): Promise<any> {
    try {
      logger.info('Fetching job status', { jobId });
      
      const response = await apiClient.get(`${this.baseUrl}/jobs/${jobId}`) as any;
      return response;
    } catch (error) {
      logger.error('Failed to fetch job status', { error: String(error) });
      throw error;
    }
  }

  /**
   * Calculate comprehensive Shopify metrics from backend service
   */
  async fetchMetrics(): Promise<ShopifyMetrics> {
    try {
      logger.info('Fetching real Shopify metrics from backend');

      // Call the new real metrics endpoint
      const response = await apiClient.get(`${this.baseUrl}/metrics`) as ShopifyMetrics;
      
      logger.info('Successfully fetched real Shopify metrics', {
        totalRevenue: response.totalRevenue,
        totalOrders: response.totalOrders,
        totalProducts: response.totalProducts,
        source: response.source
      });
      
      return response;
      
    } catch (error) {
      logger.error('Failed to fetch real Shopify metrics', { error: String(error) });
      
      // Return minimal error state (no mock data)
      return {
        totalRevenue: 0,
        totalOrders: 0,
        totalProducts: 0,
        totalCustomers: 0,
        averageOrderValue: 0,
        conversionRate: 0,
        trafficEstimate: 0,
        topProducts: [],
        recentOrders: [],
        source: 'fetch_failed' as ShopifyDataSource,
        lastUpdated: new Date().toISOString(),
        connected: false
      };
    }
  }
}

// Singleton instance
export const shopifyService = new ShopifyService();