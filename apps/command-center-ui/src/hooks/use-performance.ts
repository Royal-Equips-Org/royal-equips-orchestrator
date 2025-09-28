import { useState, useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  bundleSize: number;
  memoryUsage: number;
  fps: number;
  networkRequests: number;
  cacheHitRate: number;
}

interface UsePerformanceReturn {
  metrics: PerformanceMetrics;
  track: (operation: string) => () => void;
  recordMetric: (key: string, value: number) => void;
}

export function usePerformance(): UsePerformanceReturn {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    bundleSize: 0,
    memoryUsage: 0,
    fps: 60,
    networkRequests: 0,
    cacheHitRate: 0.95
  });

  // Track performance timing
  const track = useCallback((operation: string) => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      setMetrics(prev => ({
        ...prev,
        renderTime: operation === 'render' ? duration : prev.renderTime
      }));
      
      console.log(`Performance: ${operation} took ${duration.toFixed(2)}ms`);
    };
  }, []);

  // Record custom metrics
  const recordMetric = useCallback((key: string, value: number) => {
    setMetrics(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Monitor memory usage
  useEffect(() => {
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit
        }));
      }
    };

    const interval = setInterval(updateMemoryUsage, 5000);
    return () => clearInterval(interval);
  }, []);

  // Monitor FPS
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        setMetrics(prev => ({
          ...prev,
          fps: Math.round((frameCount * 1000) / (currentTime - lastTime))
        }));
        
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }, []);

  return {
    metrics,
    track,
    recordMetric
  };
}