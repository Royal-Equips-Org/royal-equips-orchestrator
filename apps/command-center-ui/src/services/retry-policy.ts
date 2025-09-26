// Retry policy utilities with exponential backoff and jitter
import { logger } from './log';

export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  exponentialBase: number;
  jitter: boolean;
  retryCondition?: (error: unknown) => boolean;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 300, // 300ms
  maxDelay: 5000, // 5s
  exponentialBase: 2,
  jitter: true,
  retryCondition: (error: unknown) => {
    // Don't retry on validation errors or client errors (4xx)
    if (error && typeof error === 'object' && 'kind' in error) {
      const serviceError = error as { kind: string; status?: number };
      if (serviceError.kind === 'validation') return false;
      if (serviceError.kind === 'http' && serviceError.status && serviceError.status >= 400 && serviceError.status < 500) {
        return false;
      }
    }
    return true;
  }
};

export const METRICS_RETRY_OPTIONS: RetryOptions = {
  ...DEFAULT_RETRY_OPTIONS,
  maxRetries: 2,
  baseDelay: 500, // Linear backoff for more stable metrics
  exponentialBase: 1.5, // Less aggressive than default
};

export const AGENTS_RETRY_OPTIONS: RetryOptions = {
  ...DEFAULT_RETRY_OPTIONS,
  maxRetries: 3,
  baseDelay: 300,
  exponentialBase: 2,
};

export const OPPORTUNITIES_RETRY_OPTIONS: RetryOptions = {
  ...DEFAULT_RETRY_OPTIONS,
  maxRetries: 3,
  baseDelay: 400,
  exponentialBase: 2,
};

export function calculateDelay(attempt: number, options: RetryOptions): number {
  let delay = options.baseDelay * Math.pow(options.exponentialBase, attempt - 1);
  
  // Apply maximum delay limit
  delay = Math.min(delay, options.maxDelay);
  
  // Add jitter to prevent thundering herd
  if (options.jitter) {
    const jitterAmount = delay * 0.1; // 10% jitter
    delay += (Math.random() - 0.5) * 2 * jitterAmount;
  }
  
  return Math.max(delay, 0);
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  context: string = 'operation'
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;
  
  const totalAttempts = opts.maxRetries + 1;
  
  for (let attempt = 1; attempt <= totalAttempts; attempt++) {
    try {
      const result = await operation();
      
      if (attempt > 1) {
        logger.info(`${context} succeeded on attempt ${attempt}`, { 
          retryPolicy: true,
          attempt,
          totalAttempts 
        });
      }
      
      return result;
    } catch (error) {
      lastError = error;
      
      // Check if we should retry this error
      if (!opts.retryCondition || !opts.retryCondition(error)) {
        logger.warn(`${context} failed with non-retryable error`, {
          retryPolicy: true,
          attempt,
          error: String(error)
        });
        throw error;
      }
      
      // Don't wait after the last attempt
      if (attempt === totalAttempts) {
        logger.error(`${context} failed after ${totalAttempts} attempts`, {
          retryPolicy: true,
          attempt,
          totalAttempts,
          error: String(error)
        });
        break;
      }
      
      const delay = calculateDelay(attempt, opts);
      
      logger.warn(`${context} failed on attempt ${attempt}, retrying in ${delay}ms`, {
        retryPolicy: true,
        attempt,
        totalAttempts,
        delayMs: delay,
        error: String(error)
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Specialized retry decorators for different service types
export const retryMetrics = <T>(operation: () => Promise<T>): Promise<T> =>
  withRetry(operation, METRICS_RETRY_OPTIONS, 'metrics operation');

export const retryAgents = <T>(operation: () => Promise<T>): Promise<T> =>
  withRetry(operation, AGENTS_RETRY_OPTIONS, 'agents operation');

export const retryOpportunities = <T>(operation: () => Promise<T>): Promise<T> =>
  withRetry(operation, OPPORTUNITIES_RETRY_OPTIONS, 'opportunities operation');

export const retryCampaigns = <T>(operation: () => Promise<T>): Promise<T> =>
  withRetry(operation, DEFAULT_RETRY_OPTIONS, 'campaigns operation');