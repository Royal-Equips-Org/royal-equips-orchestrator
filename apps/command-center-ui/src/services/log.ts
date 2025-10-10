// Structured logging service
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  error?: Error;
}

class Logger {
  private context: Record<string, any> = {};

  setContext(context: Record<string, any>) {
    this.context = { ...this.context, ...context };
  }

  private log(level: LogEntry['level'], message: string, context?: Record<string, any>, error?: Error) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context: { ...this.context, ...context },
      error
    };

    // In development, use console for immediate feedback
    if (import.meta.env.DEV) {
      const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
      const errorStr = error ? ` ${error.stack || error.message}` : '';
      console[level === 'debug' ? 'log' : level](`[${level.toUpperCase()}] ${message}${contextStr}${errorStr}`);
    }

    // In production, send to remote logging service
    if (import.meta.env.PROD && (level === 'error' || level === 'warn')) {
      this.sendToRemoteLogger(entry).catch(err => {
        // Fallback to console if remote logging fails
        console.error('Failed to send log to remote service:', err);
        console[level](`[${level.toUpperCase()}] ${message}`, entry.context);
      });
    }
  }

  private async sendToRemoteLogger(entry: LogEntry): Promise<void> {
    try {
      // Send logs to the backend API for centralized logging
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      
      await fetch(`${apiUrl}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level: entry.level,
          message: entry.message,
          timestamp: entry.timestamp,
          context: entry.context,
          error: entry.error ? {
            message: entry.error.message,
            stack: entry.error.stack,
            name: entry.error.name
          } : undefined,
          source: 'command-center-ui',
          user_agent: navigator.userAgent,
          url: window.location.href
        }),
        // Don't wait for response, fire and forget
        keepalive: true
      }).catch(() => {
        // Silently fail if logging endpoint is unavailable
        // to prevent logging errors from affecting app functionality
      });
    } catch {
      // Silently catch any errors to prevent logging from breaking the app
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, context?: Record<string, any>, error?: Error) {
    this.log('error', message, context, error);
  }
}

export const logger = new Logger();