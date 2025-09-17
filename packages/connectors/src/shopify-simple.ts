import axios, { AxiosInstance } from 'axios';

export interface ShopifyProduct {
  id?: number;
  title: string;
  body_html?: string;
  vendor?: string;
  product_type?: string;
  status?: 'active' | 'archived' | 'draft';
  variants?: Array<{
    id?: number;
    price: string;
    inventory_quantity?: number;
    sku?: string;
  }>;
}

export interface ShopifyOrder {
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

// API Response types
interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

interface ShopifyProductResponse {
  product: ShopifyProduct;
}

interface ShopifyShopResponse {
  shop: {
    name: string;
    [key: string]: unknown;
  };
}

export class ShopifyConnector {
  private api: AxiosInstance;

  constructor(shopDomain: string, accessToken: string) {
    this.api = axios.create({
      baseURL: `https://${shopDomain}.myshopify.com/admin/api/2024-01`,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
  }

  async getProducts(): Promise<ShopifyProduct[]> {
    try {
      const response = await this.api.get<ShopifyProductsResponse>('/products.json');
      return response.data.products || [];
    } catch (error) {
      console.error('Failed to get products:', error);
      throw error;
    }
  }

  async createProduct(product: Omit<ShopifyProduct, 'id'>): Promise<ShopifyProduct> {
    try {
      const response = await this.api.post<ShopifyProductResponse>('/products.json', { product });
      return response.data.product;
    } catch (error) {
      console.error('Failed to create product:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.api.get<ShopifyShopResponse>('/shop.json');
      return true;
    } catch (error) {
      console.error('Shopify connection test failed:', error);
      return false;
    }
  }
}