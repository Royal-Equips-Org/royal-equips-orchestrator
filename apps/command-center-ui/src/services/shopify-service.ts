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

export interface ShopifyMetrics {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  averageOrderValue: number;
  conversionRate: number;
  traffic: number;
  lastUpdated: string;
}

export interface ShopifyApiResponse<T> {
  success: boolean;
  data?: T;
  source: 'live_shopify' | 'enhanced_cached_data' | 'no_data_available';
  total?: number;
  message?: string;
}

export class ShopifyService {
  private baseUrl = (apiClient.defaults?.baseURL ?? 'http://localhost:10000') + '/api/v1/shopify';

  /**
   * Fetch live Shopify products with pagination
   */
  async fetchProducts(limit = 50, cursor?: string): Promise<ShopifyApiResponse<ShopifyProduct[]>> {
    try {
      logger.info('Fetching Shopify products', { limit, cursor });
      
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (cursor) {
        params.append('cursor', cursor);
      }

      const response = await apiClient.get<{
        products: {
          edges: Array<{
            cursor: string;
            node: ShopifyProduct;
          }>;
          pageInfo: {
            hasNextPage: boolean;
          };
        };
        success: boolean;
        source: string;
        total?: number;
      }>(`${this.baseUrl}/products?${params}`);

      if (!response.success) {
        throw new Error('Shopify products API returned unsuccessful response');
      }

      const products = response.products.edges.map(edge => edge.node);

      return {
        success: true,
        data: products,
        source: response.source as any,
        total: response.total
      };

    } catch (error) {
      logger.error('Failed to fetch Shopify products', { error: String(error) });
      throw error;
    }
  }

  /**
   * Fetch live Shopify orders
   */
  async fetchOrders(limit = 50, cursor?: string): Promise<ShopifyApiResponse<ShopifyOrder[]>> {
    try {
      logger.info('Fetching Shopify orders', { limit, cursor });
      
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (cursor) {
        params.append('cursor', cursor);
      }

      const response = await apiClient.get<{
        orders: {
          edges: Array<{
            cursor: string;
            node: ShopifyOrder;
          }>;
        };
        success: boolean;
        source: string;
      }>(`${this.baseUrl}/orders?${params}`);

      if (!response.success) {
        throw new Error('Shopify orders API returned unsuccessful response');
      }

      const orders = response.orders.edges.map(edge => edge.node);

      return {
        success: true,
        data: orders,
        source: response.source as any
      };

    } catch (error) {
      logger.error('Failed to fetch Shopify orders', { error: String(error) });
      throw error;
    }
  }

  /**
   * Fetch live Shopify customers
   */
  async fetchCustomers(limit = 50, cursor?: string): Promise<ShopifyApiResponse<ShopifyCustomer[]>> {
    try {
      logger.info('Fetching Shopify customers', { limit, cursor });
      
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      if (cursor) {
        params.append('cursor', cursor);
      }

      const response = await apiClient.get<{
        customers: {
          edges: Array<{
            cursor: string;
            node: ShopifyCustomer;
          }>;
        };
        success: boolean;
        source: string;
      }>(`${this.baseUrl}/customers?${params}`);

      if (!response.success) {
        throw new Error('Shopify customers API returned unsuccessful response');
      }

      const customers = response.customers.edges.map(edge => edge.node);

      return {
        success: true,
        data: customers,
        source: response.source as any
      };

    } catch (error) {
      logger.error('Failed to fetch Shopify customers', { error: String(error) });
      throw error;
    }
  }

  /**
   * Calculate comprehensive Shopify metrics from live data
   */
  async fetchMetrics(): Promise<ShopifyMetrics> {
    try {
      logger.info('Calculating Shopify metrics from live data');

      // Fetch all data in parallel
      const [productsResponse, ordersResponse, customersResponse] = await Promise.all([
        this.fetchProducts(100),
        this.fetchOrders(100), 
        this.fetchCustomers(100)
      ]);

      const products = productsResponse.data || [];
      const orders = ordersResponse.data || [];
      const customers = customersResponse.data || [];

      // Calculate metrics
      const totalRevenue = orders.reduce((sum, order) => {
        return sum + parseFloat(order.totalPrice || '0');
      }, 0);

      const totalOrders = orders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Estimate conversion rate based on customers vs orders (simplified)
      const conversionRate = customers.length > 0 ? (totalOrders / customers.length) * 100 : 0;

      // Estimate traffic (orders * conversion rate assumption)
      const traffic = Math.round(totalOrders * (100 / Math.max(conversionRate, 1)) * 1.5);

      const metrics: ShopifyMetrics = {
        totalOrders,
        totalRevenue,
        totalProducts: products.length,
        totalCustomers: customers.length,
        averageOrderValue,
        conversionRate: Math.min(conversionRate, 100), // Cap at 100%
        traffic,
        lastUpdated: new Date().toISOString()
      };

      logger.info('Shopify metrics calculated successfully', {
        totalProducts: metrics.totalProducts,
        totalOrders: metrics.totalOrders,
        revenue: metrics.totalRevenue
      });

      return metrics;

    } catch (error) {
      logger.error('Failed to calculate Shopify metrics', { error: String(error) });
      
      // Return fallback metrics
      return {
        totalOrders: 0,
        totalRevenue: 0,
        totalProducts: 0,
        totalCustomers: 0,
        averageOrderValue: 0,
        conversionRate: 0,
        traffic: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Sync products from Shopify (for agent operations)
   */
  async syncProducts(): Promise<{ success: boolean; count: number; message: string }> {
    try {
      logger.info('Starting Shopify product sync');

      const response = await apiClient.post<{
        success: boolean;
        count: number;
        message: string;
      }>(`${this.baseUrl}/sync/products`);

      logger.info('Product sync completed', { 
        success: response.success, 
        count: response.count 
      });

      return response;

    } catch (error) {
      logger.error('Failed to sync Shopify products', { error: String(error) });
      return {
        success: false,
        count: 0,
        message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get Shopify store information and health status
   */
  async getStoreHealth(): Promise<{
    status: 'connected' | 'disconnected' | 'error';
    shopName?: string;
    plan?: string;
    details: string;
  }> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        shop?: {
          name: string;
          plan: string;
          domain: string;
        };
        message?: string;
      }>(`${this.baseUrl}/health`);

      if (response.success && response.shop) {
        return {
          status: 'connected',
          shopName: response.shop.name,
          plan: response.shop.plan,
          details: `Connected to ${response.shop.domain}`
        };
      } else {
        return {
          status: 'disconnected',
          details: response.message || 'Unable to connect to Shopify store'
        };
      }

    } catch (error) {
      logger.error('Failed to check Shopify store health', { error: String(error) });
      return {
        status: 'error',
        details: `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Singleton instance
export const shopifyService = new ShopifyService();