import { useState, useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  cpuUsage: number;
  memoryUsage: number;
  networkLatency: number;
  activeConnections: number;
  requestsPerSecond: number;
  errorRate: number;
  uptime: number;
}

interface UsePerformanceReturn {
  metrics: PerformanceMetrics | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  trackEvent: (event: string) => void;
  trackMetric: (metric: string, value: number) => void;
  trackInteraction: (interaction: string) => void;
}

export function usePerformance(): UsePerformanceReturn {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPerformanceMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Real metrics endpoint
      const response = await fetch('/v1/metrics');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Require real data; surface error if missing
      const performanceData: PerformanceMetrics = data;
      
      setMetrics(performanceData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch performance metrics';
      setError(errorMessage);
      console.error('Performance metrics fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    await fetchPerformanceMetrics();
  }, [fetchPerformanceMetrics]);

  // Initial load and periodic updates
  useEffect(() => {
    fetchPerformanceMetrics();
    
    // Update every 30 seconds
    const interval = setInterval(fetchPerformanceMetrics, 30000);
    
    return () => clearInterval(interval);
  }, [fetchPerformanceMetrics]);

  // Add tracking functions
  const trackEvent = useCallback((event: string) => {
    console.log(`Event tracked: ${event}`);
    // In production, send to analytics service
  }, []);

  const trackMetric = useCallback((metric: string, value: number) => {
    console.log(`Metric tracked: ${metric} = ${value}`);
    // In production, send to metrics service
  }, []);

  const trackInteraction = useCallback((interaction: string) => {
    console.log(`Interaction tracked: ${interaction}`);
    // In production, send to analytics service
  }, []);

  return {
    metrics,
    loading,
    error,
    refresh,
    trackEvent,
    trackMetric,
    trackInteraction
  };
}