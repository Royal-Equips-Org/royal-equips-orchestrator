/**
 * Error Boundary Component to catch and handle React runtime errors gracefully
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react';
import { Button } from '../ui/Button';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log to external service (you can add your error reporting here)
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // In a real app, you'd send this to your error tracking service
    // like Sentry, LogRocket, or Bugsnag
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        retryCount: this.state.retryCount
      };

      // For now, just log to console
      console.group('🚨 Royal Equips Error Report');
      console.error('Error:', errorReport);
      console.groupEnd();

      // You could also send to an API endpoint:
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // }).catch(console.error);
    } catch (loggingError) {
      console.error('Failed to log error:', loggingError);
    }
  };

  private handleRetry = () => {
    const { retryCount } = this.state;
    
    // Limit retry attempts to prevent infinite loops
    if (retryCount >= 3) {
      this.handleReload();
      return;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: retryCount + 1
    });

    // Add a small delay to prevent immediate re-error
    this.retryTimeoutId = setTimeout(() => {
      // Force a re-render by updating state
      this.forceUpdate();
    }, 500);
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render() {
    if (this.state.hasError) {
      const { error, retryCount } = this.state;

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(error!, this.handleRetry);
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <div className="bg-gray-800/50 backdrop-blur-xl border border-red-500/30 rounded-2xl p-8 text-center">
              <div className="mb-6">
                <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-red-400 mb-2">
                  🚨 Royal Equips Command Center Error
                </h1>
                <p className="text-gray-300 text-lg">
                  An unexpected error occurred while loading the command center.
                </p>
              </div>

              <div className="bg-gray-900/50 rounded-lg p-4 mb-6 border border-gray-700/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Bug className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-mono text-cyan-400">Technical Details</span>
                  </div>
                  {retryCount > 0 && (
                    <span className="text-xs text-yellow-400">
                      Retry attempts: {retryCount}/3
                    </span>
                  )}
                </div>
                <div className="text-left font-mono text-sm text-red-300 bg-red-950/20 p-3 rounded border border-red-900/30">
                  {error?.message || 'Unknown error occurred'}
                </div>
                {process.env.NODE_ENV === 'development' && error?.stack && (
                  <details className="mt-3">
                    <summary className="text-sm text-gray-400 cursor-pointer hover:text-white">
                      Stack Trace (Development Only)
                    </summary>
                    <pre className="text-xs text-gray-500 mt-2 overflow-auto max-h-32 bg-gray-950/50 p-2 rounded">
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-center space-x-4">
                  <Button
                    onClick={this.handleRetry}
                    disabled={retryCount >= 3}
                    className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>{retryCount >= 3 ? 'Max Retries Reached' : 'Retry'}</span>
                  </Button>
                  
                  <Button
                    onClick={this.handleReload}
                    variant="outline"
                    className="flex items-center space-x-2 border-gray-600 hover:bg-gray-700"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Reload Application</span>
                  </Button>
                </div>

                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex items-center space-x-2 border-purple-600 text-purple-400 hover:bg-purple-600/10"
                >
                  <Home className="w-4 h-4" />
                  <span>Return to Home</span>
                </Button>
              </div>

              <div className="mt-8 pt-6 border-t border-gray-700/50">
                <p className="text-xs text-gray-400">
                  If this error persists, please contact our support team.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Error ID: {Date.now().toString(36)}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with error boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: (error: Error, retry: () => void) => ReactNode
) {
  const WithErrorBoundaryComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundaryComponent.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return WithErrorBoundaryComponent;
}

/**
 * Hook to programmatically trigger error boundary
 */
export function useErrorHandler() {
  return (error: Error) => {
    throw error;
  };
}

export default ErrorBoundary;