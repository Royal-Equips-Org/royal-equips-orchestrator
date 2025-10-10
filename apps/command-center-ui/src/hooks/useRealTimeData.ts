import { useState, useEffect, useCallback, useRef } from 'react';

interface RealTimeDataOptions {
  endpoint: string;
  pollInterval?: number; // in milliseconds
  enabled?: boolean;
  onData?: (data: any) => void;
  onError?: (error: string) => void;
}

interface RealTimeDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
  reconnect: () => void;
}

export function useRealTimeData<T = any>(
  options: RealTimeDataOptions
): RealTimeDataReturn<T> {
  const {
    endpoint,
    pollInterval = 5000, // Default to 5 seconds
    enabled = true,
    onData,
    onError
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isComponentMounted = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled || !isComponentMounted.current) return;

    try {
      setError(null);
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseData = await response.json();
      
      if (isComponentMounted.current) {
        setData(responseData);
        setConnected(true);
        setLastUpdate(new Date());
        setLoading(false);
        
        // Call optional data callback
        onData?.(responseData);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch real-time data';
      
      if (isComponentMounted.current) {
        setError(errorMessage);
        setConnected(false);
        setLoading(false);
        
        // Call optional error callback
        onError?.(errorMessage);
      }
      
      console.error('Real-time data fetch error:', err);
    }
  }, [endpoint, enabled, onData, onError]);

  const startPolling = useCallback(() => {
    if (!enabled) return;
    
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    // Initial fetch
    fetchData();
    
    // Set up polling interval
    intervalRef.current = setInterval(fetchData, pollInterval);
  }, [fetchData, pollInterval, enabled]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setConnected(false);
  }, []);

  const reconnect = useCallback(() => {
    stopPolling();
    setError(null);
    setLoading(true);
    startPolling();
  }, [startPolling, stopPolling]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchData();
  }, [fetchData]);

  // Set up polling on mount and when options change
  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return () => {
      stopPolling();
    };
  }, [enabled, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isComponentMounted.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  return {
    data,
    loading,
    error,
    connected,
    lastUpdate,
    refresh,
    reconnect
  };
}