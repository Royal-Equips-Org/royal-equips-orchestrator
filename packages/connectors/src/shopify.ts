import axios, { AxiosInstance } from 'axios';
import { Logger } from 'pino';
import { z } from 'zod';

// Error type for axios responses
interface AxiosErrorLike {
  response?: {
    status: number;
    headers: Record<string, string>;
  };
  config?: {
    url?: string;
    method?: string;
  };
}

function isAxiosRateLimitError(error: unknown): error is AxiosErrorLike {
  return (
    error !== null &&
    typeof error === 'object' &&
    'response' in error &&
    typeof (error as AxiosErrorLike).response === 'object' &&
    (error as AxiosErrorLike).response?.status === 429
  );
}
interface ConnectorLogger {
  info: (msg: string, obj?: Record<string, unknown>) => void;
  error: (msg: string, obj?: Record<string, unknown>) => void;
  warn: (msg: string, obj?: Record<string, unknown>) => void;
  debug: (msg: string, obj?: Record<string, unknown>) => void;
  child: (obj: Record<string, unknown>) => ConnectorLogger;
}

// API Response interfaces
export interface ShopifyVariant {
  id: number;
  price: string;
  compare_at_price?: string;
  inventory_quantity?: number;
  sku?: string;
}

export interface ShopifyAPIProduct {
  id: number;
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  status: 'active' | 'archived' | 'draft';
  variants: ShopifyVariant[];
}

export interface ShopifyAPIResponse<T> {
  data: T;
}

export interface ShopifyProductsResponse {
  products: ShopifyAPIProduct[];
}

export interface ShopifyProductResponse {
  product: ShopifyAPIProduct;
}

export interface ShopifyOrdersResponse {
  orders: ShopifyAPIOrder[];
}

export interface ShopifyAPIOrder {
  id: number;
  order_number: number;
  email?: string;
  total_price: string;
  financial_status: string;
  fulfillment_status?: string;
  line_items: Array<{
    id: number;
    product_id?: number;
    variant_id?: number;
    quantity: number;
    price: string;
  }>;
}

export interface ShopifyInventoryLevel {
  inventory_item_id: number;
  location_id: number;
  available: number;
}

export interface ShopifyInventoryResponse {
  inventory_levels: ShopifyInventoryLevel[];
}

export interface ShopifyShopResponse {
  shop: {
    name: string;
    [key: string]: unknown;
  };
}

export interface VariantUpdateData {
  price: string;
  compare_at_price?: string;
}

const ShopifyProductSchema = z.object({
  id: z.number().optional(),
  title: z.string(),
  body_html: z.string().optional(),
  vendor: z.string().optional(),
  product_type: z.string().optional(),
  status: z.enum(['active', 'archived', 'draft']).default('draft'),
  variants: z.array(z.object({
    id: z.number().optional(),
    price: z.string(),
    inventory_quantity: z.number().optional(),
    sku: z.string().optional()
  })).optional()
});

const ShopifyOrderSchema = z.object({
  id: z.number(),
  order_number: z.number(),
  email: z.string().optional(),
  total_price: z.string(),
  financial_status: z.string(),
  fulfillment_status: z.string().optional(),
  line_items: z.array(z.object({
    id: z.number(),
    product_id: z.number().optional(),
    variant_id: z.number().optional(),
    quantity: z.number(),
    price: z.string()
  }))
});

export type ShopifyProduct = z.infer<typeof ShopifyProductSchema>;
export type ShopifyOrder = z.infer<typeof ShopifyOrderSchema>;

export class ShopifyConnector {
  private api: AxiosInstance;
  private logger: ConnectorLogger;
  private rateLimitDelay = 500; // 500ms between requests

  constructor(shopDomain: string, accessToken: string, logger: Logger) {
    this.logger = logger.child({ connector: 'shopify' }) as ConnectorLogger;
    
    this.api = axios.create({
      baseURL: `https://${shopDomain}.myshopify.com/admin/api/2024-01`,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    // Add rate limiting interceptor
    this.api.interceptors.request.use(async (config) => {
      if (this.rateLimitDelay) {
        await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
      }
      return config;
    });

    // Add response interceptor for rate limit handling
    this.api.interceptors.response.use(
      response => response,
      async (error: unknown) => {
        if (isAxiosRateLimitError(error)) {
          const retryAfter = error.response?.headers['retry-after'] || '1';
          const retrySeconds = typeof retryAfter === 'string' ? parseInt(retryAfter, 10) : 1;
          
          this.logger.warn(
            `Shopify rate limit hit (429). Retrying after ${retrySeconds} second(s).`,
            {
              url: error.config?.url || 'unknown',
              method: error.config?.method || 'unknown',
              retryAfter: retrySeconds,
              status: error.response?.status || 429
            }
          );
          
          await new Promise(resolve => setTimeout(resolve, retrySeconds * 1000));
          
          if (error.config) {
            return this.api.request(error.config);
          }
        }
        throw error;
      }
    );
  }

  /**
   * Get all products with pagination
   */
  async getProducts(params: {
    limit?: number;
    since_id?: number;
    status?: 'active' | 'archived' | 'draft';
  } = {}): Promise<ShopifyProduct[]> {
    try {
      const response = await this.api.get<ShopifyProductsResponse>('/products.json', { params });
      const products = response.data.products || [];
      
      this.logger.info('Retrieved products', { count: products.length });
      return products.map((product: ShopifyAPIProduct) => ShopifyProductSchema.parse(product));
    } catch (error) {
      this.logger.error('Failed to get products', { error });
      throw error;
    }
  }

  /**
   * Create a new product
   */
  async createProduct(product: Omit<ShopifyProduct, 'id'>): Promise<ShopifyProduct> {
    try {
      const validatedProduct = ShopifyProductSchema.omit({ id: true }).parse(product);
      
      const response = await this.api.post<ShopifyProductResponse>('/products.json', {
        product: validatedProduct
      });

      const createdProduct = response.data.product;
      this.logger.info('Product created successfully', { productId: createdProduct.id });
      
      return ShopifyProductSchema.parse(createdProduct);
    } catch (error) {
      this.logger.error('Failed to create product', { error });
      throw error;
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(productId: number, updates: Partial<ShopifyProduct>): Promise<ShopifyProduct> {
    try {
      const response = await this.api.put<ShopifyProductResponse>(`/products/${productId}.json`, {
        product: updates
      });

      const updatedProduct = response.data.product;
      this.logger.info('Product updated successfully', { productId: updatedProduct.id });
      
      return ShopifyProductSchema.parse(updatedProduct);
    } catch (error) {
      this.logger.error('Failed to update product', { error, productId });
      throw error;
    }
  }

  /**
   * Get orders with pagination
   */
  async getOrders(params: {
    limit?: number;
    since_id?: number;
    status?: string;
    financial_status?: string;
    fulfillment_status?: string;
  } = {}): Promise<ShopifyOrder[]> {
    try {
      const response = await this.api.get<ShopifyOrdersResponse>('/orders.json', { params });
      const orders = response.data.orders || [];
      
      this.logger.info('Retrieved orders', { count: orders.length });
      return orders.map((order: ShopifyAPIOrder) => ShopifyOrderSchema.parse(order));
    } catch (error) {
      this.logger.error('Failed to get orders', { error });
      throw error;
    }
  }

  /**
   * Get inventory levels for products
   */
  async getInventoryLevels(locationId?: number): Promise<ShopifyInventoryLevel[]> {
    try {
      const params = locationId ? { location_ids: locationId } : {};
      const response = await this.api.get<ShopifyInventoryResponse>('/inventory_levels.json', { params });
      
      this.logger.info('Retrieved inventory levels', { 
        count: response.data.inventory_levels?.length || 0 
      });
      
      return response.data.inventory_levels || [];
    } catch (error) {
      this.logger.error('Failed to get inventory levels', { error });
      throw error;
    }
  }

  /**
   * Update inventory level
   */
  async updateInventoryLevel(
    inventoryItemId: number, 
    locationId: number, 
    available: number
  ): Promise<void> {
    try {
      await this.api.post('/inventory_levels/set.json', {
        inventory_item_id: inventoryItemId,
        location_id: locationId,
        available
      });

      this.logger.info('Inventory level updated', { 
        inventoryItemId, 
        locationId, 
        available 
      });
    } catch (error) {
      this.logger.error('Failed to update inventory level', { 
        error, 
        inventoryItemId, 
        locationId, 
        available 
      });
      throw error;
    }
  }

  /**
   * Get product price and compare with competitors
   */
  async getProductPricing(productId: number): Promise<{
    currentPrice: number;
    variants: Array<{ id: number; price: number; compare_at_price?: number }>;
  }> {
    try {
      const response = await this.api.get<ShopifyProductResponse>(`/products/${productId}.json`);
      const product = response.data.product;
      
      const variants = product.variants || [];
      const currentPrice = variants.length > 0 ? parseFloat(variants[0].price) : 0;
      
      return {
        currentPrice,
        variants: variants.map((variant: ShopifyVariant) => ({
          id: variant.id,
          price: parseFloat(variant.price),
          compare_at_price: variant.compare_at_price ? parseFloat(variant.compare_at_price) : undefined
        }))
      };
    } catch (error) {
      this.logger.error('Failed to get product pricing', { error, productId });
      throw error;
    }
  }

  /**
   * Bulk update product prices
   */
  async bulkUpdatePrices(updates: Array<{
    productId: number;
    variantId: number;
    price: number;
    compareAtPrice?: number;
  }>): Promise<void> {
    try {
      const promises = updates.map(async ({ variantId, price, compareAtPrice }) => {
        const variantUpdate: VariantUpdateData = { price: price.toString() };
        if (compareAtPrice) {
          variantUpdate.compare_at_price = compareAtPrice.toString();
        }

        await this.api.put(`/variants/${variantId}.json`, {
          variant: variantUpdate
        });
      });

      await Promise.all(promises);
      this.logger.info('Bulk price update completed', { updatesCount: updates.length });
    } catch (error) {
      this.logger.error('Failed to bulk update prices', { error });
      throw error;
    }
  }

  /**
   * Test connection to Shopify
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.api.get<ShopifyShopResponse>('/shop.json');
      this.logger.info('Shopify connection test successful', { 
        shop: response.data.shop?.name 
      });
      return true;
    } catch (error) {
      this.logger.error('Shopify connection test failed', { error });
      return false;
    }
  }
}