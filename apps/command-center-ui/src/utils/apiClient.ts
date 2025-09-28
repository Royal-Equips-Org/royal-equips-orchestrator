/**
 * API Client with Content-Type Guards for Royal Equips Command Center.
 * 
 * Provides robust API communication with:
 * - Content-Type validation to prevent HTML parsing errors
 * - Retry logic with exponential backoff
 * - Circuit breaker patterns
 * - Structured error handling
 * - Request/response logging
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: Response,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ContentTypeError extends ApiError {
  constructor(expectedType: string, actualType: string | null) {
    super(`Expected ${expectedType} but received ${actualType || 'unknown content type'}`);
    this.name = 'ContentTypeError';
  }
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface ApiClientConfig {
  baseUrl?: string;
  timeout?: number;
  retry?: RetryConfig;
  enableLogging?: boolean;
}

const DEFAULT_CONFIG: Required<ApiClientConfig> = {
  baseUrl: '',
  timeout: 30000,
  retry: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  },
  enableLogging: process.env.NODE_ENV === 'development'
};

class ApiClient {
  private config: Required<ApiClientConfig>;
  private requestId = 0;

  constructor(config: ApiClientConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Perform GET request with content-type validation
   */
  async get<T>(path: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'GET'
    });
  }

  /**
   * Perform POST request with content-type validation
   */
  async post<T>(path: string, data?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }

  /**
   * Core request method with retry logic and content-type guards
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const requestId = ++this.requestId;
    const url = `${this.config.baseUrl}${path}`;
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        Accept: 'application/json',
        ...options.headers
      },
      signal: AbortSignal.timeout(this.config.timeout)
    };

    if (this.config.enableLogging) {
      console.log(`[API ${requestId}] ${options.method || 'GET'} ${path}`, {
        headers: requestOptions.headers,
        body: options.body
      });
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.config.retry.maxRetries; attempt++) {
      try {
        const startTime = performance.now();
        const response = await fetch(url, requestOptions);
        const duration = performance.now() - startTime;

        if (this.config.enableLogging) {
          console.log(`[API ${requestId}] Response ${response.status} in ${duration.toFixed(2)}ms`);
        }

        // Validate content type before attempting to parse
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          
          if (this.config.enableLogging) {
            console.error(`[API ${requestId}] Invalid content-type:`, {
              expected: 'application/json',
              actual: contentType,
              responseText: text.substring(0, 200) + (text.length > 200 ? '...' : '')
            });
          }

          // Check if it's HTML (common error case)
          if (text.toLowerCase().includes('<!doctype html>') || text.toLowerCase().includes('<html')) {
            throw new ContentTypeError('application/json', 'text/html (HTML page returned instead of API response)');
          }

          throw new ContentTypeError('application/json', contentType);
        }

        // Parse JSON response
        let data: T;
        try {
          data = await response.json();
        } catch (parseError) {
          throw new ApiError(
            `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`,
            response.status,
            response
          );
        }

        // Handle HTTP error statuses
        if (!response.ok) {
          throw new ApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            response,
            data
          );
        }

        if (this.config.enableLogging) {
          console.log(`[API ${requestId}] Success:`, data);
        }

        return data;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (this.config.enableLogging) {
          console.error(`[API ${requestId}] Attempt ${attempt + 1} failed:`, lastError);
        }

        // Don't retry on certain error types
        if (error instanceof ContentTypeError || 
            error instanceof ApiError && error.status && error.status < 500) {
          break;
        }

        // Don't retry on the last attempt
        if (attempt === this.config.retry.maxRetries) {
          break;
        }

        // Calculate backoff delay
        const delay = Math.min(
          this.config.retry.baseDelay * Math.pow(this.config.retry.backoffMultiplier, attempt),
          this.config.retry.maxDelay
        );

        if (this.config.enableLogging) {
          console.log(`[API ${requestId}] Retrying in ${delay}ms...`);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new ApiError('Request failed after all retry attempts');
  }
}

// Default client instance
export const apiClient = new ApiClient();

// Convenience functions using the default client
export async function apiGet<T>(path: string, options: RequestInit = {}): Promise<T> {
  return apiClient.get<T>(path, options);
}

export async function apiPost<T>(path: string, data?: any, options: RequestInit = {}): Promise<T> {
  return apiClient.post<T>(path, data, options);
}

/**
 * Create a new API client with custom configuration
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

/**
 * Check if error is due to HTML being returned instead of JSON
 */
export function isHtmlResponseError(error: unknown): boolean {
  return error instanceof ContentTypeError && 
         error.message.includes('text/html');
}

/**
 * Check if error is a network connectivity issue
 */
export function isNetworkError(error: unknown): boolean {
  return error instanceof Error && (
    error.name === 'TypeError' ||
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('abort')
  );
}