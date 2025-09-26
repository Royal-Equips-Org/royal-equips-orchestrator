// API client with timeout, retries, and circuit breaker
import { ServiceError } from '../types/empire';
import { logger } from './log';

interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold = 5,
    private timeout = 30000 // 30 seconds
  ) {}

  canExecute(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }
    
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }
    
    // HALF_OPEN state
    return true;
  }

  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

class ApiClient {
  private baseUrl: string;
  private defaultTimeout = 10000; // 10 seconds
  private circuitBreaker = new CircuitBreaker();

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || this.getBaseUrl();
    logger.setContext({ apiClient: true, baseUrl: this.baseUrl });
  }

  private getBaseUrl(): string {
    const API_URL = import.meta.env.VITE_API_URL;
    if (API_URL && API_URL.trim()) {
      return API_URL.trim();
    }
    
    if (import.meta.env.VITE_API_BASE_URL) {
      return import.meta.env.VITE_API_BASE_URL;
    }
    
    return import.meta.env.PROD 
      ? 'https://api.royalequips.com'
      : 'http://localhost:10000';
  }

  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('empire_token');
    }
    return null;
  }

  private async fetchWithTimeout(
    url: string, 
    options: RequestOptions = {}
  ): Promise<Response> {
    const timeout = options.timeout || this.defaultTimeout;
    const controller = new AbortController();
    
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async retryRequest<T>(
    requestFn: () => Promise<T>,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await requestFn();
        this.circuitBreaker.recordSuccess();
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          this.circuitBreaker.recordFailure();
          break;
        }

        // Exponential backoff: 300ms, 600ms, 1200ms
        const delay = 300 * Math.pow(2, attempt - 1);
        logger.warn(`Request attempt ${attempt} failed, retrying in ${delay}ms`, {
          error: lastError.message,
          attempt,
          maxRetries
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  private createError(error: unknown, context: string): ServiceError {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          kind: 'timeout',
          message: `Request timeout in ${context}`
        };
      }
      
      if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
        return {
          kind: 'network',
          message: `Network error in ${context}: ${error.message}`
        };
      }
    }

    return {
      kind: 'network',
      message: `Unknown error in ${context}: ${String(error)}`
    };
  }

  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!this.circuitBreaker.canExecute()) {
      throw {
        kind: 'circuit_open',
        message: 'Circuit breaker is open - API temporarily unavailable'
      } as ServiceError;
    }

    return this.retryRequest(async () => {
      try {
        const response = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
          method: 'GET',
          ...options,
        });

        if (!response.ok) {
          throw {
            kind: 'http',
            status: response.status,
            message: `HTTP ${response.status}: ${response.statusText}`
          } as ServiceError;
        }

        return await response.json();
      } catch (error) {
        if (error && typeof error === 'object' && 'kind' in error) {
          throw error; // Re-throw ServiceError as-is
        }
        throw this.createError(error, `GET ${path}`);
      }
    }, options.retries);
  }

  async post<T>(path: string, data?: any, options: RequestOptions = {}): Promise<T> {
    if (!this.circuitBreaker.canExecute()) {
      throw {
        kind: 'circuit_open',
        message: 'Circuit breaker is open - API temporarily unavailable'
      } as ServiceError;
    }

    return this.retryRequest(async () => {
      try {
        const response = await this.fetchWithTimeout(`${this.baseUrl}${path}`, {
          method: 'POST',
          body: data ? JSON.stringify(data) : undefined,
          ...options,
        });

        if (!response.ok) {
          throw {
            kind: 'http',
            status: response.status,
            message: `HTTP ${response.status}: ${response.statusText}`
          } as ServiceError;
        }

        return await response.json();
      } catch (error) {
        if (error && typeof error === 'object' && 'kind' in error) {
          throw error; // Re-throw ServiceError as-is
        }
        throw this.createError(error, `POST ${path}`);
      }
    }, options.retries);
  }
}

export const apiClient = new ApiClient();