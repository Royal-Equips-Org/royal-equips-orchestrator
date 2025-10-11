/**
 * Performance measurement utilities for Royal Equips Orchestrator
 * 
 * Provides lightweight performance tracking using browser/Node.js Performance API
 * with structured logging and future OTEL bridge support.
 */

import { logger } from '../logging/logger';

// Check if Performance API is available
const perf = typeof performance !== 'undefined' ? performance : undefined;

export interface PerfMark {
  name: string;
  startTime: number;
  duration?: number;
  tags?: Record<string, any>;
}

export interface PerfMetrics {
  marks: Map<string, PerfMark>;
  measures: PerfMark[];
}

class PerformanceTracker {
  private marks = new Map<string, PerfMark>();
  private measures: PerfMark[] = [];

  /**
   * Mark a performance point
   */
  mark(name: string, tags?: Record<string, any>): void {
    const startTime = perf?.now() || Date.now();
    
    if (perf) {
      perf.mark(name);
    }

    this.marks.set(name, {
      name,
      startTime,
      tags
    });

    logger.debug('perf_mark', {
      name,
      start_time: startTime,
      tags
    });
  }

  /**
   * Measure duration between two marks
   */
  measure(name: string, startMark: string, endMark?: string): number | null {
    const start = this.marks.get(startMark);
    if (!start) {
      logger.warn('perf_measure_missing_start', { 
        measure_name: name, 
        start_mark: startMark 
      });
      return null;
    }

    let duration: number;
    let endTime: number;

    if (endMark) {
      const end = this.marks.get(endMark);
      if (!end) {
        logger.warn('perf_measure_missing_end', { 
          measure_name: name, 
          end_mark: endMark 
        });
        return null;
      }
      duration = end.startTime - start.startTime;
      endTime = end.startTime;
    } else {
      endTime = perf?.now() || Date.now();
      duration = endTime - start.startTime;
    }

    if (perf && endMark) {
      try {
        perf.measure(name, startMark, endMark);
      } catch (error) {
        logger.warn('perf_measure_native_error', { error: error.message });
      }
    }

    const measure: PerfMark = {
      name,
      startTime: start.startTime,
      duration,
      tags: { ...start.tags }
    };

    this.measures.push(measure);
    logger.perfMeasure(name, duration, start.tags);

    return duration;
  }

  /**
   * Time a function execution
   */
  async time<T>(name: string, fn: () => Promise<T>, tags?: Record<string, any>): Promise<T> {
    const startMark = `${name}_start`;
    this.mark(startMark, tags);

    try {
      const result = await fn();
      this.measure(name, startMark);
      return result;
    } catch (error) {
      this.measure(name, startMark);
      logger.error('perf_timed_function_error', {
        function_name: name,
        error: error.message,
        tags
      });
      throw error;
    }
  }

  /**
   * Time a synchronous function execution
   */
  timeSync<T>(name: string, fn: () => T, tags?: Record<string, any>): T {
    const startMark = `${name}_start`;
    this.mark(startMark, tags);

    try {
      const result = fn();
      this.measure(name, startMark);
      return result;
    } catch (error) {
      this.measure(name, startMark);
      logger.error('perf_timed_function_error', {
        function_name: name,
        error: error.message,
        tags
      });
      throw error;
    }
  }

  /**
   * Get all performance metrics
   */
  getMetrics(): PerfMetrics {
    return {
      marks: new Map(this.marks),
      measures: [...this.measures]
    };
  }

  /**
   * Get native Performance API entries if available
   */
  getNativeEntries(): PerformanceEntry[] {
    if (!perf || !perf.getEntries) {
      return [];
    }
    return perf.getEntries();
  }

  /**
   * Clear all marks and measures
   */
  clear(): void {
    this.marks.clear();
    this.measures.length = 0;
    
    if (perf && perf.clearMarks && perf.clearMeasures) {
      perf.clearMarks();
      perf.clearMeasures();
    }
  }

  /**
   * Get performance summary for reporting
   */
  getSummary(): Record<string, any> {
    const measures = this.measures;
    if (measures.length === 0) {
      return { total_measures: 0 };
    }

    const durations = measures.map(m => m.duration || 0);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const avgDuration = totalDuration / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);

    // Group by name
    const byName: Record<string, number[]> = {};
    measures.forEach(m => {
      if (!byName[m.name]) byName[m.name] = [];
      if (m.duration) byName[m.name].push(m.duration);
    });

    const nameStats = Object.entries(byName).map(([name, durations]) => ({
      name,
      count: durations.length,
      avg: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      max: Math.max(...durations),
      min: Math.min(...durations)
    }));

    return {
      total_measures: measures.length,
      total_duration: totalDuration,
      avg_duration: avgDuration,
      max_duration: maxDuration,
      min_duration: minDuration,
      by_name: nameStats
    };
  }
}

// Create default performance tracker
export const perf_tracker = new PerformanceTracker();

// Convenience functions using default tracker
export function mark(name: string, tags?: Record<string, any>): void {
  perf_tracker.mark(name, tags);
}

export function measure(name: string, startMark: string, endMark?: string): number | null {
  return perf_tracker.measure(name, startMark, endMark);
}

export async function time<T>(name: string, fn: () => Promise<T>, tags?: Record<string, any>): Promise<T> {
  return perf_tracker.time(name, fn, tags);
}

export function timeSync<T>(name: string, fn: () => T, tags?: Record<string, any>): T {
  return perf_tracker.timeSync(name, fn, tags);
}

// Higher-order function for performance decoration
export function timed(name?: string, tags?: Record<string, any>) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const methodName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function(...args: any[]) {
      return time(methodName, () => originalMethod.apply(this, args), tags);
    };

    return descriptor;
  };
}

// Performance monitoring for common operations
export const perfUtils = {
  // Monitor API request performance
  measureApiRequest: (method: string, path: string) => {
    const markName = `api_${method}_${path}`;
    mark(markName, { method, path });
    return () => measure(`${markName}_duration`, markName);
  },

  // Monitor database query performance
  measureDbQuery: (query: string, table?: string) => {
    const markName = `db_query_${Date.now()}`;
    mark(markName, { query_type: query, table });
    return () => measure(`${markName}_duration`, markName);
  },

  // Monitor secret resolution performance
  measureSecretResolution: (keyHash: string) => {
    const markName = `secret_${keyHash}`;
    mark(markName, { key_hash: keyHash });
    return () => measure(`${markName}_duration`, markName);
  },

  // Monitor agent execution performance
  measureAgentExecution: (agentId: string, action: string) => {
    const markName = `agent_${agentId}_${action}`;
    mark(markName, { agent_id: agentId, action });
    return () => measure(`${markName}_duration`, markName);
  }
};

// Web Vitals monitoring (browser only)
export function measureWebVitals(): void {
  if (typeof window === 'undefined') return;

  // Largest Contentful Paint
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    entries.forEach((entry) => {
      if (entry.entryType === 'largest-contentful-paint') {
        logger.info('web_vital_lcp', {
          value: entry.startTime,
          element: entry.element?.tagName
        });
      }
      
      if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
        logger.info('web_vital_cls', {
          value: entry.value,
          sources: entry.sources?.length || 0
        });
      }
    });
  });

  try {
    observer.observe({ entryTypes: ['largest-contentful-paint', 'layout-shift'] });
  } catch (error) {
    logger.warn('web_vitals_observer_error', { error: error.message });
  }

  // First Input Delay via event listener
  const handleFirstInput = (event: Event) => {
    const perfEntry = event as any;
    if (perfEntry.processingStart && perfEntry.startTime) {
      const fid = perfEntry.processingStart - perfEntry.startTime;
      logger.info('web_vital_fid', {
        value: fid,
        event_type: perfEntry.name
      });
    }
    window.removeEventListener('click', handleFirstInput, { capture: true });
    window.removeEventListener('keydown', handleFirstInput, { capture: true });
  };

  window.addEventListener('click', handleFirstInput, { capture: true, once: true });
  window.addEventListener('keydown', handleFirstInput, { capture: true, once: true });
}

export default perf_tracker;