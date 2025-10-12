import { useEffect, useCallback, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  navigationTime: number;
  memoryUsage: number;
  networkRequests: number;
}

interface OptimizationState {
  isOptimizing: boolean;
  metrics: PerformanceMetrics | null;
  recommendations: string[];
  cacheHealth: 'good' | 'moderate' | 'poor';
}

export function usePerformanceOptimization() {
  const [state, setState] = useState<OptimizationState>({
    isOptimizing: false,
    metrics: null,
    recommendations: [],
    cacheHealth: 'good'
  });

  // Measure performance metrics
  const measurePerformance = useCallback(() => {
    if (typeof window === 'undefined') return;

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    
    const loadTime = navigation.loadEventEnd - navigation.loadEventStart;
    const renderTime = paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0;
    const navigationTime = navigation.domContentLoadedEventEnd - navigation.fetchStart;
    
    // Get memory usage if available
    const memoryInfo = (performance as any).memory;
    const memoryUsage = memoryInfo ? memoryInfo.usedJSHeapSize / 1024 / 1024 : 0;
    
    // Count network requests
    const networkRequests = performance.getEntriesByType('resource').length;

    const metrics: PerformanceMetrics = {
      loadTime,
      renderTime,
      navigationTime,
      memoryUsage,
      networkRequests
    };

    setState(prev => ({
      ...prev,
      metrics,
      recommendations: generateRecommendations(metrics),
      cacheHealth: assessCacheHealth(metrics)
    }));
  }, []);

  // Generate performance recommendations
  const generateRecommendations = (metrics: PerformanceMetrics): string[] => {
    const recommendations: string[] = [];

    if (metrics.loadTime > 3000) {
      recommendations.push('Consider code splitting to reduce initial bundle size');
    }

    if (metrics.renderTime > 2000) {
      recommendations.push('Optimize critical rendering path');
    }

    if (metrics.memoryUsage > 50) {
      recommendations.push('Monitor memory usage - consider component cleanup');
    }

    if (metrics.networkRequests > 20) {
      recommendations.push('Reduce number of network requests with bundling');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal');
    }

    return recommendations;
  };

  // Assess cache health
  const assessCacheHealth = (metrics: PerformanceMetrics): 'good' | 'moderate' | 'poor' => {
    const cacheScore = calculateCacheScore(metrics);
    
    if (cacheScore > 80) return 'good';
    if (cacheScore > 60) return 'moderate';
    return 'poor';
  };

  const calculateCacheScore = (metrics: PerformanceMetrics): number => {
    let score = 100;
    
    // Penalize slow load times
    if (metrics.loadTime > 2000) score -= 20;
    if (metrics.loadTime > 5000) score -= 30;
    
    // Penalize slow render times
    if (metrics.renderTime > 1500) score -= 15;
    if (metrics.renderTime > 3000) score -= 25;
    
    // Penalize high memory usage
    if (metrics.memoryUsage > 30) score -= 10;
    if (metrics.memoryUsage > 60) score -= 20;
    
    return Math.max(0, score);
  };

  // Optimize performance with various techniques
  const optimizePerformance = useCallback(async () => {
    setState(prev => ({ ...prev, isOptimizing: true }));

    try {
      // 1. Preload critical resources
      await preloadCriticalResources();
      
      // 2. Clean up unused data
      await cleanupUnusedData();
      
      // 3. Optimize image loading
      await optimizeImageLoading();
      
      // 4. Setup service worker caching
      await setupServiceWorkerCaching();
      
      // Re-measure after optimization
      setTimeout(measurePerformance, 1000);
      
    } catch (error) {
      console.error('Performance optimization failed:', error);
    } finally {
      setState(prev => ({ ...prev, isOptimizing: false }));
    }
  }, [measurePerformance]);

  // Preload critical resources
  const preloadCriticalResources = async () => {
    const criticalResources = [
      '/api/v1/system/status',
      '/api/v1/agents', 
      '/api/v1/opportunities'
    ];

    const preloadPromises = criticalResources.map(url => {
      return fetch(url).catch(() => {}); // Ignore errors, just preload
    });

    await Promise.allSettled(preloadPromises);
  };

  // Clean up unused data from localStorage and memory
  const cleanupUnusedData = async () => {
    // Clean old cache entries
    const cacheKeys = Object.keys(localStorage);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    cacheKeys.forEach(key => {
      if (key.startsWith('empire-cache-')) {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          if (data.timestamp && (now - new Date(data.timestamp).getTime()) > maxAge) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          // Remove invalid cache entries
          localStorage.removeItem(key);
        }
      }
    });

    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }
  };

  // Optimize image loading with lazy loading and WebP format
  const optimizeImageLoading = async () => {
    const images = document.querySelectorAll('img');
    
    images.forEach(img => {
      // Add lazy loading if not already present
      if (!img.loading) {
        img.loading = 'lazy';
      }
      
      // Add intersection observer for better control
      if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const img = entry.target as HTMLImageElement;
              if (img.dataset.src) {
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                imageObserver.unobserve(img);
              }
            }
          });
        });
        
        if (img.dataset.src) {
          imageObserver.observe(img);
        }
      }
    });
  };

  // Setup service worker for aggressive caching
  const setupServiceWorkerCaching = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        
        // Send performance data to service worker for optimization
        if (registration.active) {
          registration.active.postMessage({
            type: 'PERFORMANCE_DATA',
            metrics: state.metrics
          });
        }
      } catch (error) {
        console.warn('Service worker registration failed:', error);
      }
    }
  };

  // Enable prefetching based on user behavior
  const enableIntelligentPrefetching = useCallback(() => {
    // Track navigation patterns
    const navigationHistory = JSON.parse(
      localStorage.getItem('royal-equips-navigation') || '{}'
    );

    // Predict next likely navigation target
    const recentlyUsed = navigationHistory.recentlyUsed || [];
    const favorites = navigationHistory.favorites || [];
    
    // Prefetch data for likely next destinations
    const prefetchTargets = [...new Set([...recentlyUsed.slice(0, 3), ...favorites.slice(0, 2)])];
    
    prefetchTargets.forEach(moduleId => {
      // Prefetch module-specific data
      const prefetchUrls = {
        'shopify': ['/api/v1/shopify/orders', '/api/v1/shopify/products'],
        'analytics': ['/api/v1/analytics/overview'],
        'products': ['/api/v1/opportunities'],
        'customers': ['/api/v1/shopify/customers']
      };
      
      const urls = prefetchUrls[moduleId as keyof typeof prefetchUrls] || [];
      urls.forEach(url => {
        // Use fetch with low priority for prefetching
        fetch(url, { 
          method: 'GET'
        }).catch(() => {}); // Ignore errors
      });
    });
  }, []);

  // Initialize performance monitoring
  useEffect(() => {
    measurePerformance();
    enableIntelligentPrefetching();
    
    // Set up periodic performance measurement
    const interval = setInterval(measurePerformance, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [measurePerformance, enableIntelligentPrefetching]);

  return {
    ...state,
    measurePerformance,
    optimizePerformance,
    enableIntelligentPrefetching
  };
}