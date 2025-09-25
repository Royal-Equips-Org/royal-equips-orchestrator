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

    // In production, you might want to send to a logging service
    // TODO: Implement remote logging service integration
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