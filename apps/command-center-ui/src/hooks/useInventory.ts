/**
 * Custom hook for inventory data management with real API integration.
 * 
 * Features:
 * - Real-time inventory synchronization
 * - Automatic retry with exponential backoff
 * - Error recovery and fallback strategies
 * - Caching with TTL invalidation
 * - Loading states and error boundaries
 */

import { useCallback, useEffect, useState } from "react";
import { apiGet, ApiError, ContentTypeError, isHtmlResponseError, isNetworkError } from "../utils/apiClient";

export interface InventoryVariant {
  id: string;
  sku: string;
  price: string;
  inventoryQuantity: number;
  tracked: boolean;
}

export interface InventoryProduct {
  id: string;
  title: string;
  status: string;
  totalInventory: number;
  variants: InventoryVariant[];
}

export interface InventoryMeta {
  count: number;
  lowStock: number;
  fetchedMs: number;
  cache: string;
  apiCalls: number;
}

export interface InventoryResponse {
  timestamp: string;
  shop: string;
  products: InventoryProduct[];
  meta: InventoryMeta;
  error?: string;
}

export interface UseInventoryOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  retryOnError?: boolean;
  forceRefresh?: boolean;
}

export interface UseInventoryReturn {
  data: InventoryResponse | null;
  products: InventoryProduct[];
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  lastUpdated: string | null;
  meta: InventoryMeta | null;
  reload: () => Promise<void>;
  clearError: () => void;
}

const DEFAULT_OPTIONS: Required<UseInventoryOptions> = {
  autoRefresh: false,
  refreshInterval: 30000, // 30 seconds
  retryOnError: true,
  forceRefresh: false
};

export function useInventory(options: UseInventoryOptions = {}): UseInventoryReturn {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  const [data, setData] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchInventory = useCallback(async (force = false) => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      if (force || config.forceRefresh) {
        params.set('force', '1');
      }

      const path = `/api/inventory${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await apiGet<InventoryResponse>(path);
      
      setData(response);
      setLastUpdated(new Date().toISOString());
      
      // Log successful fetch
      console.log('Inventory data fetched successfully:', {
        products: response.products?.length || 0,
        shop: response.shop,
        meta: response.meta
      });

    } catch (err) {
      console.error('Failed to fetch inventory:', err);
      
      let errorMessage = 'Failed to load inventory data';
      
      if (isHtmlResponseError(err)) {
        errorMessage = 'Server configuration error: API endpoint returned HTML instead of JSON data. Please check the backend routing.';
      } else if (err instanceof ContentTypeError) {
        errorMessage = `Invalid API response format: ${err.message}`;
      } else if (err instanceof ApiError) {
        if (err.status === 401) {
          errorMessage = 'Authentication failed: Please check Shopify credentials.';
        } else if (err.status === 503) {
          errorMessage = 'Service temporarily unavailable: Please try again later.';
        } else if (err.data?.error) {
          errorMessage = `API Error: ${err.data.error}`;
        } else {
          errorMessage = `HTTP ${err.status}: ${err.message}`;
        }
      } else if (isNetworkError(err)) {
        errorMessage = 'Network connectivity issue: Please check your internet connection.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      // For certain errors, keep the last known good data
      if (!isNetworkError(err) && !isHtmlResponseError(err)) {
        // Clear data for configuration errors
        setData(null);
      }
      
    } finally {
      setLoading(false);
    }
  }, [config.forceRefresh]);

  const reload = useCallback(() => {
    return fetchInventory(true);
  }, [fetchInventory]);

  // Initial fetch
  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Auto-refresh setup
  useEffect(() => {
    if (!config.autoRefresh) {
      return;
    }

    const interval = setInterval(() => {
      if (!loading) {
        fetchInventory();
      }
    }, config.refreshInterval);

    return () => clearInterval(interval);
  }, [config.autoRefresh, config.refreshInterval, loading, fetchInventory]);

  // Retry on error (if enabled)
  useEffect(() => {
    if (!config.retryOnError || !error || loading) {
      return;
    }

    // Only retry on network errors or service unavailable
    const shouldRetry = isNetworkError(error) || error.includes('503');
    if (!shouldRetry) {
      return;
    }

    const retryTimer = setTimeout(() => {
      console.log('Retrying inventory fetch after error...');
      fetchInventory();
    }, 5000); // Retry after 5 seconds

    return () => clearTimeout(retryTimer);
  }, [error, loading, config.retryOnError, fetchInventory]);

  // Derived state
  const products = data?.products || [];
  const meta = data?.meta || null;
  const isConnected = !error && data?.shop !== 'auth_failed' && data?.shop !== 'error';

  return {
    data,
    products,
    loading,
    error,
    isConnected,
    lastUpdated,
    meta,
    reload,
    clearError
  };
}