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
      
      // Simulate API call or replace with real endpoint
      const response = await fetch('/api/performance/metrics');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform data or use mock data for development
      const performanceData: PerformanceMetrics = data || {
        cpuUsage: Math.random() * 80 + 10, // 10-90%
        memoryUsage: Math.random() * 70 + 20, // 20-90%
        networkLatency: Math.random() * 50 + 10, // 10-60ms
        activeConnections: Math.floor(Math.random() * 500) + 100,
        requestsPerSecond: Math.floor(Math.random() * 1000) + 200,
        errorRate: Math.random() * 2, // 0-2%
        uptime: 99.9 + Math.random() * 0.1 // 99.9-100%
      };
      
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