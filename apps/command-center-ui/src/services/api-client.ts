// API client with timeout, retries, and circuit breaker
import { ServiceError } from '../types/empire';
import { logger } from './log';

interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  correlationId?: string;
}

// Generate correlation ID for request tracking
function generateCorrelationId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

class CircuitBreaker {
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private lastSuccessTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private halfOpenCalls = 0;

  constructor(
    private failureThreshold = 5,
    private timeout = 30000, // 30 seconds
    private minimumRequests = 10,
    private halfOpenMaxCalls = 3
  ) {}

  canExecute(): boolean {
    const currentTime = Date.now();
    
    if (this.state === 'CLOSED') {
      return true;
    }
    
    if (this.state === 'OPEN') {
      if (currentTime - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        this.halfOpenCalls = 0;
        logger.info('Circuit breaker transitioning to HALF_OPEN for recovery probe');
        return true;
      }
      return false;
    }
    
    // HALF_OPEN state - limit concurrent calls
    if (this.halfOpenCalls >= this.halfOpenMaxCalls) {
      return false;
    }
    
    return true;
  }

  recordSuccess() {
    this.successCount++;
    this.lastSuccessTime = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      // Need consecutive successes to close circuit
      if (this.successCount >= 3) {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.successCount = 0;
        this.halfOpenCalls = 0;
        logger.info('Circuit breaker CLOSED after successful recovery');
      }
    } else if (this.state === 'CLOSED') {
      // Gradually reduce failure count on success
      if (this.failureCount > 0) {
        this.failureCount = Math.max(0, this.failureCount - 1);
      }
    }
  }

  recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.successCount = 0; // Reset success count on failure
    
    if (this.state === 'HALF_OPEN') {
      // Any failure in half-open immediately opens circuit
      this.state = 'OPEN';
      this.halfOpenCalls = 0;
      logger.warn('Circuit breaker OPEN - failure during recovery probe');
      return;
    }
    
    // Check if we should trip the circuit (only for CLOSED state)
    const totalRequests = this.failureCount + this.successCount;
    if (totalRequests >= this.minimumRequests) {
      const failureRate = this.failureCount / totalRequests;
      
      // Trip on high failure rate OR consecutive failures
      if (failureRate > 0.5 || this.failureCount >= this.failureThreshold) {
        if (this.state === 'CLOSED') {
          this.state = 'OPEN';
          logger.warn(`Circuit breaker OPEN - failure rate: ${(failureRate * 100).toFixed(1)}%, failures: ${this.failureCount}/${totalRequests}`);
        }
      }
    }
  }

  getStatus() {
    const totalRequests = this.failureCount + this.successCount;
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests,
      failureRate: totalRequests > 0 ? this.failureCount / totalRequests : 0,
      halfOpenCalls: this.halfOpenCalls,
      nextRecoveryAttempt: this.state === 'OPEN' ? new Date(this.lastFailureTime + this.timeout) : null
    };
  }
}

export class ApiClient {
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
    const correlationId = options.correlationId || generateCorrelationId();
    
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': correlationId,
          'X-Client-Version': '1.0.0',
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
    let lastError: unknown;
    const totalAttempts = Math.max(1, maxRetries + 1); // At least 1 attempt, then maxRetries more

    for (let attempt = 1; attempt <= totalAttempts; attempt++) {
      try {
        const result = await requestFn();
        this.circuitBreaker.recordSuccess();
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt === totalAttempts) {
          this.circuitBreaker.recordFailure();
          break;
        }

        // Exponential backoff: 300ms, 600ms, 1200ms
        const delay = 300 * Math.pow(2, attempt - 1);
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`Request attempt ${attempt} failed, retrying in ${delay}ms`, {
          error: errorMessage,
          attempt,
          maxRetries
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  private createError(error: unknown, context: string): ServiceError {
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.message.includes('aborted')) {
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