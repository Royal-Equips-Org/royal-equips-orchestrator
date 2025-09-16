import axios, { AxiosInstance } from 'axios';
import { Logger } from 'pino';
import { z } from 'zod';

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
  private logger: Logger;
  private rateLimitDelay = 500; // 500ms between requests

  constructor(shopDomain: string, accessToken: string, logger: Logger) {
    this.logger = logger.child({ connector: 'shopify' });
    
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
      await this.rateLimitDelay && new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
      return config;
    });

    // Add response interceptor for rate limit handling
    this.api.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 429) {
          const retryAfter = error.response.headers['retry-after'] || 1;
          this.logger.warn(
            {
              url: error.config?.url,
              method: error.config?.method,
              retryAfter,
              status: error.response?.status
            },
            `Shopify rate limit hit (429). Retrying after ${retryAfter} second(s).`
          );
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return this.api.request(error.config);
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
      const response = await this.api.get('/products.json', { params });
      const products = response.data.products || [];
      
      console.log("TODO: implement logging");
      return products.map((product: unknown) => ShopifyProductSchema.parse(product));
    } catch (error) {
      console.log("TODO: implement logging");
      throw error;
    }
  }

  /**
   * Create a new product
   */
  async createProduct(product: Omit<ShopifyProduct, 'id'>): Promise<ShopifyProduct> {
    try {
      const validatedProduct = ShopifyProductSchema.omit({ id: true }).parse(product);
      
      const response = await this.api.post('/products.json', {
        product: validatedProduct
      });

      const createdProduct = response.data.product;
      console.log("TODO: implement logging");
      
      return ShopifyProductSchema.parse(createdProduct);
    } catch (error) {
      console.log("TODO: implement logging");
      throw error;
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(productId: number, updates: Partial<ShopifyProduct>): Promise<ShopifyProduct> {
    try {
      const response = await this.api.put(`/products/${productId}.json`, {
        product: updates
      });

      const updatedProduct = response.data.product;
      console.log("TODO: implement logging");
      
      return ShopifyProductSchema.parse(updatedProduct);
    } catch (error) {
      console.log("TODO: implement logging");
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
      const response = await this.api.get('/orders.json', { params });
      const orders = response.data.orders || [];
      
      console.log("TODO: implement logging");
      return orders.map((order: unknown) => ShopifyOrderSchema.parse(order));
    } catch (error) {
      console.log("TODO: implement logging");
      throw error;
    }
  }

  /**
   * Get inventory levels for products
   */
  async getInventoryLevels(locationId?: number): Promise<Array<{
    inventory_item_id: number;
    location_id: number;
    available: number;
  }>> {
    try {
      const params = locationId ? { location_ids: locationId } : {};
      const response = await this.api.get('/inventory_levels.json', { params });
      
      this.logger.info('Retrieved inventory levels', { 
        count: response.data.inventory_levels?.length || 0 
      });
      
      return response.data.inventory_levels || [];
    } catch (error) {
      console.log("TODO: implement logging");
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
      const response = await this.api.get(`/products/${productId}.json`);
      const product = response.data.product;
      
      const variants = product.variants || [];
      const currentPrice = variants.length > 0 ? parseFloat(variants[0].price) : 0;
      
      return {
        currentPrice,
        variants: variants.map((v: any) => ({
          id: v.id,
          price: parseFloat(v.price),
          compare_at_price: v.compare_at_price ? parseFloat(v.compare_at_price) : undefined
        }))
      };
    } catch (error) {
      console.log("TODO: implement logging");
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
      const promises = updates.map(async ({ productId, variantId, price, compareAtPrice }) => {
        const variantUpdate: any = { price: price.toString() };
        if (compareAtPrice) {
          variantUpdate.compare_at_price = compareAtPrice.toString();
        }

        await this.api.put(`/variants/${variantId}.json`, {
          variant: variantUpdate
        });
      });

      await Promise.all(promises);
      console.log("TODO: implement logging");
    } catch (error) {
      console.log("TODO: implement logging");
      throw error;
    }
  }

  /**
   * Test connection to Shopify
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.api.get('/shop.json');
      this.logger.info('Shopify connection test successful', { 
        shop: response.data.shop?.name 
      });
      return true;
    } catch (error) {
      console.log("TODO: implement logging");
      return false;
    }
  }
}