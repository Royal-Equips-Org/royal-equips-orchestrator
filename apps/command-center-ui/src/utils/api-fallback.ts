/**
 * API Fallback Utilities
 * 
 * Provides graceful degradation when backend APIs are unavailable.
 * Always tries real APIs first, only falls back to minimal data on complete failure.
 */

export interface FallbackConfig {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
}

/**
 * Fetch with automatic retry and fallback
 */
export async function fetchWithFallback<T>(
  url: string,
  fallbackData: T,
  config: FallbackConfig = {}
): Promise<{ data: T; fromCache: boolean; error?: string }> {
  const { retries = 2, retryDelay = 1000, timeout = 10000 } = config;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Extract data from common response formats
      const actualData = data.data || data.result || data;

      return {
        data: actualData as T,
        fromCache: false,
      };
    } catch (error) {
      console.warn(`API call attempt ${attempt + 1} failed for ${url}:`, error);

      // If this was the last retry, return fallback
      if (attempt === retries) {
        console.error(`All retry attempts failed for ${url}, using fallback data`);
        return {
          data: fallbackData,
          fromCache: true,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
    }
  }

  // Should never reach here, but TypeScript needs it
  return {
    data: fallbackData,
    fromCache: true,
    error: 'Max retries exceeded',
  };
}

/**
 * Fetch multiple endpoints in parallel with fallback
 */
export async function fetchMultipleWithFallback<T extends Record<string, any>>(
  endpoints: Record<keyof T, { url: string; fallback: any }>,
  config?: FallbackConfig
): Promise<{ [K in keyof T]: { data: T[K]; fromCache: boolean; error?: string } }> {
  const promises = Object.entries(endpoints).map(async ([key, { url, fallback }]) => {
    const result = await fetchWithFallback(url, fallback, config);
    return [key, result];
  });

  const results = await Promise.all(promises);
  return Object.fromEntries(results) as any;
}

/**
 * Create a polling mechanism with exponential backoff on errors
 */
export function createPoller<T>(
  fetchFn: () => Promise<T>,
  onData: (data: T) => void,
  onError: (error: Error) => void,
  baseInterval = 5000,
  maxInterval = 60000
) {
  let currentInterval = baseInterval;
  let timeoutId: number | null = null;
  let isRunning = false;

  const poll = async () => {
    if (!isRunning) return;

    try {
      const data = await fetchFn();
      onData(data);
      
      // Reset to base interval on success
      currentInterval = baseInterval;
    } catch (error) {
      onError(error as Error);
      
      // Exponential backoff on error
      currentInterval = Math.min(currentInterval * 2, maxInterval);
    }

    if (isRunning) {
      timeoutId = setTimeout(poll, currentInterval);
    }
  };

  return {
    start: () => {
      if (isRunning) return;
      isRunning = true;
      poll();
    },
    stop: () => {
      isRunning = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    },
    isRunning: () => isRunning,
  };
}

/**
 * Cache with TTL for reducing API calls
 */
export class ApiCache<T> {
  private cache = new Map<string, { data: T; expiresAt: number }>();

  constructor(private ttl: number = 30000) {}

  get(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.ttl,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

/**
 * Batch multiple API calls with debouncing
 */
export function createBatchedFetcher<T>(
  fetchFn: (ids: string[]) => Promise<Record<string, T>>,
  debounceMs = 50
) {
  let queue: string[] = [];
  let timeoutId: number | null = null;
  const pendingPromises = new Map<string, {
    resolve: (value: T) => void;
    reject: (error: Error) => void;
  }>();

  const flush = async () => {
    if (queue.length === 0) return;

    const idsToFetch = [...queue];
    queue = [];

    try {
      const results = await fetchFn(idsToFetch);
      
      idsToFetch.forEach(id => {
        const pending = pendingPromises.get(id);
        if (pending) {
          if (results[id]) {
            pending.resolve(results[id]);
          } else {
            pending.reject(new Error(`No data for ID: ${id}`));
          }
          pendingPromises.delete(id);
        }
      });
    } catch (error) {
      idsToFetch.forEach(id => {
        const pending = pendingPromises.get(id);
        if (pending) {
          pending.reject(error as Error);
          pendingPromises.delete(id);
        }
      });
    }
  };

  return (id: string): Promise<T> => {
    return new Promise((resolve, reject) => {
      queue.push(id);
      pendingPromises.set(id, { resolve, reject });

      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(flush, debounceMs);
    });
  };
}
