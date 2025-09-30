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
    if (import.meta.env.PROD && (level === 'warn' || level === 'error')) {
      this.sendToRemoteLogger(entry).catch((err) => {
        console.error('Failed to send log to remote service:', err);
      });
    }
  }

  private async sendToRemoteLogger(entry: LogEntry): Promise<void> {
    try {
      // Send to API endpoint for centralized logging
      await fetch('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });
    } catch (error) {
      // Fallback to local storage if remote logging fails
      this.storeLogLocally(entry);
    }
  }

  private storeLogLocally(entry: LogEntry): void {
    try {
      const logs = JSON.parse(localStorage.getItem('royal-equips-logs') || '[]');
      logs.push(entry);
      // Keep only last 100 entries
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      localStorage.setItem('royal-equips-logs', JSON.stringify(logs));
    } catch (error) {
      // If localStorage fails, there's nothing more we can reasonably do
      console.error('Failed to store log locally:', error);
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