import { useState, useCallback } from 'react';

interface ApiResponse<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
}

export function useApiService() {
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const makeRequest = useCallback(async <T = any>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<T | null>(null);

    try {
      setGlobalLoading(true);
      setGlobalError(null);
      setLoading(true);
      setError(null);

      const { method = 'GET', headers = {}, body } = options;
      
      // Set default headers
      const defaultHeaders = {
        'Content-Type': 'application/json',
        ...headers
      };

      // Prepare request configuration
      const config: RequestInit = {
        method,
        headers: defaultHeaders,
      };

      if (body && method !== 'GET') {
        config.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      // Make the API call
      const response = await fetch(endpoint, config);

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      setData(responseData);

      return {
        data: responseData,
        loading: false,
        error: null
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown API error';
      setError(errorMessage);
      setGlobalError(errorMessage);
      
      return {
        data: null,
        loading: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  }, []);

  // Convenience methods for common HTTP operations
  const get = useCallback(<T = any>(endpoint: string, headers?: Record<string, string>) => {
    return makeRequest<T>(endpoint, { method: 'GET', headers });
  }, [makeRequest]);

  const post = useCallback(<T = any>(endpoint: string, body?: any, headers?: Record<string, string>) => {
    return makeRequest<T>(endpoint, { method: 'POST', body, headers });
  }, [makeRequest]);

  const put = useCallback(<T = any>(endpoint: string, body?: any, headers?: Record<string, string>) => {
    return makeRequest<T>(endpoint, { method: 'PUT', body, headers });
  }, [makeRequest]);

  const patch = useCallback(<T = any>(endpoint: string, body?: any, headers?: Record<string, string>) => {
    return makeRequest<T>(endpoint, { method: 'PATCH', body, headers });
  }, [makeRequest]);

  const del = useCallback(<T = any>(endpoint: string, headers?: Record<string, string>) => {
    return makeRequest<T>(endpoint, { method: 'DELETE', headers });
  }, [makeRequest]);

  return {
    // Core request method
    request: makeRequest,
    
    // Convenience methods
    get,
    post,
    put,
    patch,
    delete: del,
    
    // Global state
    loading: globalLoading,
    error: globalError,
    clearError: () => setGlobalError(null)
  };
}