import ky from "ky";
import pRetry from "p-retry";

export class ShopifyRestClient {
  private baseURL: string;

  constructor(private shopDomain: string, private accessToken: string) {
    this.baseURL = `https://${shopDomain}.myshopify.com/admin/api/2024-01`;
  }

  async get<T>(endpoint: string, params?: Record<string, unknown>): Promise<T> {
    return pRetry(async () => {
      const response = await ky.get(`${this.baseURL}${endpoint}`, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        searchParams: params as Record<string, string>
      }).json<T>();
      
      return response;
    }, { retries: 3 });
  }

  async post<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
    return pRetry(async () => {
      const response = await ky.post(`${this.baseURL}${endpoint}`, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        json: data
      }).json<T>();
      
      return response;
    }, { retries: 3 });
  }

  async put<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
    return pRetry(async () => {
      const response = await ky.put(`${this.baseURL}${endpoint}`, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        json: data
      }).json<T>();
      
      return response;
    }, { retries: 3 });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return pRetry(async () => {
      const response = await ky.delete(`${this.baseURL}${endpoint}`, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        }
      }).json<T>();
      
      return response;
    }, { retries: 3 });
  }
}