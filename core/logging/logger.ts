/**
 * Structured JSON logging system for Royal Equips Orchestrator
 * 
 * Provides consistent, structured logging with redaction of sensitive data.
 * All logs are output as JSON lines for structured parsing and analysis.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  level: LogLevel;
  event: string;
  timestamp: string;
  message?: string;
  [key: string]: any;
}

export interface LoggerOptions {
  redactFields?: string[];
  minLevel?: LogLevel;
  outputFunction?: (entry: LogEntry) => void;
}

// Sensitive field patterns to redact
const DEFAULT_REDACT_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /auth/i,
  /credential/i,
  /api[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /bearer/i,
  /authorization/i
];

// Log level hierarchy for filtering
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
};

export class StructuredLogger {
  private redactFields: Set<string>;
  private minLevelValue: number;
  private outputFn: (entry: LogEntry) => void;

  constructor(options: LoggerOptions = {}) {
    this.redactFields = new Set(options.redactFields || []);
    this.minLevelValue = LOG_LEVELS[options.minLevel || 'info'];
    this.outputFn = options.outputFunction || this.defaultOutput;
  }

  private defaultOutput(entry: LogEntry): void {
    console.log(JSON.stringify(entry));
  }

  private shouldRedact(key: string): boolean {
    // Check explicit redact list
    if (this.redactFields.has(key)) return true;
    
    // Check against patterns
    return DEFAULT_REDACT_PATTERNS.some(pattern => pattern.test(key));
  }

  private redactValue(value: any): any {
    if (typeof value === 'string') {
      // Redact common secret patterns in strings
      return value.replace(/([a-zA-Z0-9]{20,})/g, '[REDACTED]');
    }
    return '[REDACTED]';
  }

  private sanitizeData(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (this.shouldRedact(key)) {
        sanitized[key] = this.redactValue(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private log(level: LogLevel, event: string, data: any = {}): void {
    if (LOG_LEVELS[level] < this.minLevelValue) {
      return;
    }

    const entry: LogEntry = {
      level,
      event,
      timestamp: new Date().toISOString(),
      ...this.sanitizeData(data)
    };

    this.outputFn(entry);
  }

  debug(event: string, data?: any): void {
    this.log('debug', event, data);
  }

  info(event: string, data?: any): void {
    this.log('info', event, data);
  }

  warn(event: string, data?: any): void {
    this.log('warn', event, data);
  }

  error(event: string, data?: any): void {
    this.log('error', event, data);
  }

  fatal(event: string, data?: any): void {
    this.log('fatal', event, data);
  }

  // Convenience methods for common events
  secretResolve(keyHash: string, source: string, depth: number, latencyMs: number, cache: boolean): void {
    this.info('secret_resolve', {
      key_hash: keyHash,
      source,
      depth,
      latency_ms: latencyMs,
      cache
    });
  }

  secretMiss(keyHash: string): void {
    this.warn('secret_miss', { key_hash: keyHash });
  }

  authSuccess(userId: string, userRole: string, requiredRole: string, action: string, resource?: string): void {
    this.info('authorization_success', {
      user_id: userId,
      user_role: userRole,
      required_role: requiredRole,
      action,
      resource
    });
  }

  authFailure(userId: string, userRole: string, requiredRole: string, action: string, error: string, resource?: string): void {
    this.warn('authorization_failure', {
      user_id: userId,
      user_role: userRole,
      required_role: requiredRole,
      action,
      resource,
      error
    });
  }

  perfMeasure(name: string, durationMs: number, tags?: Record<string, any>): void {
    this.info('perf_measure', {
      name,
      duration_ms: durationMs,
      ...tags
    });
  }

  healthPing(endpoint: string, status: string, latencyMs?: number): void {
    this.info('health_ping', {
      endpoint,
      status,
      latency_ms: latencyMs
    });
  }

  apiRequest(method: string, path: string, statusCode: number, durationMs: number, userId?: string): void {
    this.info('api_request', {
      method,
      path,
      status_code: statusCode,
      duration_ms: durationMs,
      user_id: userId
    });
  }

  agentExecution(agentId: string, action: string, status: 'start' | 'success' | 'error', durationMs?: number, error?: string): void {
    this.info('agent_execution', {
      agent_id: agentId,
      action,
      status,
      duration_ms: durationMs,
      error
    });
  }

  // Create child logger with additional context
  child(context: Record<string, any>): StructuredLogger {
    return new StructuredLogger({
      redactFields: Array.from(this.redactFields),
      minLevel: Object.keys(LOG_LEVELS).find(k => LOG_LEVELS[k as LogLevel] === this.minLevelValue) as LogLevel,
      outputFunction: (entry: LogEntry) => {
        this.outputFn({
          ...entry,
          ...this.sanitizeData(context)
        });
      }
    });
  }
}

// Create default logger instance
export const logger = new StructuredLogger({
  minLevel: process.env.LOG_LEVEL as LogLevel || 'info',
  redactFields: (process.env.REDACT_FIELDS || '').split(',').filter(Boolean)
});

// Create request-scoped logger factory
export function createRequestLogger(requestId: string, userId?: string): StructuredLogger {
  return logger.child({
    request_id: requestId,
    user_id: userId
  });
}

// Express/Fastify middleware for request logging
export function loggingMiddleware() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const requestLogger = createRequestLogger(requestId, req.user?.id);

    // Attach logger to request
    req.logger = requestLogger;
    req.requestId = requestId;

    // Log request start
    requestLogger.info('request_start', {
      method: req.method,
      path: req.path,
      user_agent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    });

    // Capture response
    const originalSend = res.send;
    res.send = function(data: any) {
      const duration = Date.now() - start;
      requestLogger.apiRequest(req.method, req.path, res.statusCode, duration, req.user?.id);
      return originalSend.call(this, data);
    };

    next();
  };
}

export default logger;