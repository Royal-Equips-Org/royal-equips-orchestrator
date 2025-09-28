/**
 * Lightweight telemetry and performance monitoring for Royal Equips
 */

const perf = typeof performance !== 'undefined' ? performance : undefined;

export interface MetricEntry {
  name: string;
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface PerformanceMark {
  name: string;
  startTime: number;
  duration?: number;
}

class MetricsCollector {
  private metrics: MetricEntry[] = [];
  private marks: Map<string, number> = new Map();

  // Performance marks
  mark(label: string): void {
    perf?.mark(label);
    this.marks.set(label, Date.now());
  }

  measure(name: string, startMark: string, endMark?: string): number | undefined {
    const start = this.marks.get(startMark);
    if (!start) return undefined;

    const end = endMark ? this.marks.get(endMark) : Date.now();
    if (!end) return undefined;

    const duration = end - start;
    
    // Use Performance API if available
    try {
      perf?.measure(name, startMark, endMark);
      const entries = perf?.getEntriesByName(name);
      const perfDuration = entries?.[entries.length - 1]?.duration;
      
      if (perfDuration !== undefined) {
        this.recordMetric('performance_measure', perfDuration, { name });
        console.log(JSON.stringify({ 
          level: 'info', 
          event: 'perf_measure', 
          name, 
          duration: perfDuration 
        }));
        return perfDuration;
      }
    } catch (error) {
      // Fallback to manual timing
    }

    this.recordMetric('performance_measure', duration, { name });
    console.log(JSON.stringify({ 
      level: 'info', 
      event: 'perf_measure', 
      name, 
      duration 
    }));
    
    return duration;
  }

  // Custom metrics
  recordMetric(name: string, value: number, labels?: Record<string, string>): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      labels
    });

    // Log structured metric
    console.log(JSON.stringify({
      level: 'info',
      event: 'metric_recorded',
      metric: name,
      value,
      labels,
      timestamp: new Date().toISOString()
    }));

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  // Increment counter
  increment(name: string, labels?: Record<string, string>): void {
    this.recordMetric(name, 1, labels);
  }

  // Record timing
  timing(name: string, duration: number, labels?: Record<string, string>): void {
    this.recordMetric(`${name}_duration_ms`, duration, labels);
  }

  // Get metrics for export
  getMetrics(): MetricEntry[] {
    return [...this.metrics];
  }

  // Clear metrics
  clear(): void {
    this.metrics = [];
    this.marks.clear();
  }

  // Get memory usage if available
  getMemoryUsage(): number | undefined {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return undefined;
  }

  // Record application-specific metrics
  recordPageLoad(path: string, duration: number): void {
    this.timing('page_load', duration, { path });
  }

  recordApiCall(endpoint: string, duration: number, status: number): void {
    this.timing('api_call', duration, { 
      endpoint, 
      status: status.toString() 
    });
  }

  recordModuleLoad(moduleId: string, duration: number): void {
    this.timing('module_load', duration, { module: moduleId });
  }

  recordUserAction(action: string, moduleId?: string): void {
    this.increment('user_action', { 
      action, 
      module: moduleId || 'unknown' 
    });
  }
}

// Create default instance
export const metrics = new MetricsCollector();

// Convenience functions
export function mark(label: string): void {
  metrics.mark(label);
}

export function measure(name: string, start: string, end?: string): number | undefined {
  return metrics.measure(name, start, end);
}

export function recordMetric(name: string, value: number, labels?: Record<string, string>): void {
  metrics.recordMetric(name, value, labels);
}

export function increment(name: string, labels?: Record<string, string>): void {
  metrics.increment(name, labels);
}

export function timing(name: string, duration: number, labels?: Record<string, string>): void {
  metrics.timing(name, duration, labels);
}

// Higher-level performance tracking
export function trackPageNavigation(path: string): () => void {
  const startTime = Date.now();
  mark(`page_nav_start_${path}`);
  
  return () => {
    const duration = Date.now() - startTime;
    mark(`page_nav_end_${path}`);
    metrics.recordPageLoad(path, duration);
  };
}

export function trackApiCall<T>(
  endpoint: string, 
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  mark(`api_start_${endpoint}`);
  
  return apiCall()
    .then(result => {
      const duration = Date.now() - startTime;
      mark(`api_end_${endpoint}`);
      metrics.recordApiCall(endpoint, duration, 200);
      return result;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      mark(`api_error_${endpoint}`);
      const status = error.status || error.code || 500;
      metrics.recordApiCall(endpoint, duration, status);
      throw error;
    });
}

// Automatic performance monitoring setup
if (typeof window !== 'undefined') {
  // Track initial page load
  window.addEventListener('load', () => {
    const loadTime = performance.timing?.loadEventEnd - performance.timing?.navigationStart;
    if (loadTime) {
      metrics.recordPageLoad(window.location.pathname, loadTime);
    }
  });

  // Track memory usage periodically
  setInterval(() => {
    const memoryUsage = metrics.getMemoryUsage();
    if (memoryUsage) {
      metrics.recordMetric('memory_usage_mb', memoryUsage);
    }
  }, 30000); // Every 30 seconds
}

export default metrics;