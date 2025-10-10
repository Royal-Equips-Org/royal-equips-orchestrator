/**
 * Redis-backed circuit breaker.
 * Keys:
 *  - cb:state (open|closed|half_open)
 *  - cb:failures
 *  - cb:opened_at (timestamp)
 *  - cb:success_count
 *  - cb:last_success_at
 */
import { RedisClientType } from 'redis';

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number; // milliseconds
  minimumRequests: number;
  halfOpenMaxCalls: number;
  keyPrefix: string;
}

export interface CircuitBreakerSnapshot {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  openedAt: number | null;
  lastSuccessAt: number | null;
  nextRecoveryAttempt: number | null;
  totalRequests: number;
  failureRate: number;
}

export class RedisCircuitBreaker {
  private config: CircuitBreakerConfig;
  private redis: RedisClientType;

  constructor(
    redis: RedisClientType,
    config: Partial<CircuitBreakerConfig> = {}
  ) {
    this.redis = redis;
    this.config = {
      failureThreshold: config.failureThreshold ?? 5,
      recoveryTimeout: config.recoveryTimeout ?? 60000, // 60 seconds
      minimumRequests: config.minimumRequests ?? 10,
      halfOpenMaxCalls: config.halfOpenMaxCalls ?? 3,
      keyPrefix: config.keyPrefix ?? 'cb',
    };
  }

  private getKey(suffix: string): string {
    return `${this.config.keyPrefix}:${suffix}`;
  }

  async canExecute(): Promise<boolean> {
    const state = await this.getState();
    const currentTime = Date.now();

    if (state === 'closed') {
      return true;
    }

    if (state === 'open') {
      const openedAt = await this.getOpenedAt();
      if (openedAt && (currentTime - openedAt) > this.config.recoveryTimeout) {
        // Transition to half-open
        await this.setState('half_open');
        return true;
      }
      return false;
    }

    // half_open state - check if we haven't exceeded max calls
    const halfOpenCalls = await this.getHalfOpenCalls();
    return halfOpenCalls < this.config.halfOpenMaxCalls;
  }

  async recordSuccess(): Promise<void> {
    const currentTime = Date.now();
    const state = await this.getState();

    await Promise.all([
      this.redis.incr(this.getKey('success_count')),
      this.redis.set(this.getKey('last_success_at'), currentTime),
    ]);

    if (state === 'half_open') {
      const successCount = await this.getSuccessCount();
      // Need consecutive successes to close circuit
      if (successCount >= 3) {
        await this.reset();
      }
    } else if (state === 'closed') {
      // Reset failure count on success in closed state (atomic)
      await this.redis.set(this.getKey('failures'), 0);
    }
  }

  async recordFailure(): Promise<void> {
    const currentTime = Date.now();
    const state = await this.getState();

    await this.redis.incr(this.getKey('failures'));

    if (state === 'half_open') {
      // Any failure in half-open immediately opens circuit
      await this.setState('open');
      await this.redis.set(this.getKey('opened_at'), currentTime);
      return;
    }

    // Check if we should trip the circuit (only for closed state)
    const [failureCount, successCount] = await Promise.all([
      this.getFailureCount(),
      this.getSuccessCount(),
    ]);

    const totalRequests = failureCount + successCount;
    if (totalRequests >= this.config.minimumRequests) {
      const failureRate = failureCount / totalRequests;
      
      // Trip on high failure rate OR consecutive failures
      if (failureRate > 0.5 || failureCount >= this.config.failureThreshold) {
        if (state === 'closed') {
          await this.setState('open');
          await this.redis.set(this.getKey('opened_at'), currentTime);
        }
      }
    }
  }

  async reset(): Promise<void> {
    const multi = this.redis.multi();
    multi.set(this.getKey('state'), 'closed');
    multi.del(this.getKey('failures'));
    multi.del(this.getKey('success_count'));
    multi.del(this.getKey('opened_at'));
    multi.del(this.getKey('last_success_at'));
    multi.del(this.getKey('half_open_calls'));
    await multi.exec();
  }

  async snapshot(): Promise<CircuitBreakerSnapshot> {
    const [
      state,
      failureCount,
      successCount,
      openedAt,
      lastSuccessAt,
    ] = await Promise.all([
      this.getState(),
      this.getFailureCount(),
      this.getSuccessCount(),
      this.getOpenedAt(),
      this.getLastSuccessAt(),
    ]);

    const totalRequests = failureCount + successCount;
    const failureRate = totalRequests > 0 ? failureCount / totalRequests : 0;
    const nextRecoveryAttempt = state === 'open' && openedAt 
      ? openedAt + this.config.recoveryTimeout 
      : null;

    return {
      state,
      failureCount,
      successCount,
      openedAt,
      lastSuccessAt,
      nextRecoveryAttempt,
      totalRequests,
      failureRate,
    };
  }

  private async getState(): Promise<CircuitState> {
    const state = await this.redis.get(this.getKey('state'));
    return (state as CircuitState) || 'closed';
  }

  private async setState(state: CircuitState): Promise<void> {
    await this.redis.set(this.getKey('state'), state);
  }

  private async getFailureCount(): Promise<number> {
    const count = await this.redis.get(this.getKey('failures'));
    return count ? parseInt(count, 10) : 0;
  }

  private async getSuccessCount(): Promise<number> {
    const count = await this.redis.get(this.getKey('success_count'));
    return count ? parseInt(count, 10) : 0;
  }

  private async getOpenedAt(): Promise<number | null> {
    const timestamp = await this.redis.get(this.getKey('opened_at'));
    return timestamp ? parseInt(timestamp, 10) : null;
  }

  private async getLastSuccessAt(): Promise<number | null> {
    const timestamp = await this.redis.get(this.getKey('last_success_at'));
    return timestamp ? parseInt(timestamp, 10) : null;
  }

  private async getHalfOpenCalls(): Promise<number> {
    const calls = await this.redis.get(this.getKey('half_open_calls'));
    return calls ? parseInt(calls, 10) : 0;
  }
}