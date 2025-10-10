/**
 * Structured logging utilities for webhook processing
 * Production-ready logging with request tracking and error handling
 */

export interface LogContext {
  requestId: string;
  webhook: string;
  timestamp: string;
  [key: string]: any;
}

export class WebhookLogger {
  private context: LogContext;

  constructor(requestId: string, webhook: string) {
    this.context = {
      requestId,
      webhook,
      timestamp: new Date().toISOString(),
    };
  }

  info(message: string, data?: Record<string, any>) {
    console.log(JSON.stringify({
      level: 'info',
      message,
      ...this.context,
      ...data,
    }));
  }

  warn(message: string, data?: Record<string, any>) {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      ...this.context,
      ...data,
    }));
  }

  error(message: string, error?: Error, data?: Record<string, any>) {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
      ...this.context,
      ...data,
    }));
  }

  addContext(key: string, value: any) {
    this.context[key] = value;
  }
}

/**
 * Create standardized error responses
 */
export function createErrorResponse(
  status: number,
  message: string,
  requestId: string
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      requestId,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
    }
  );
}

/**
 * Create success response
 */
export function createSuccessResponse(
  data: any,
  requestId: string,
  status: number = 200
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      requestId,
      timestamp: new Date().toISOString(),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': requestId,
      },
    }
  );
}