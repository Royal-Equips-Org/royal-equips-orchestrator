import React, { Component } from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-red-400 mb-4">
              🚨 Royal Equips Command Center Error
            </h1>
            <p className="text-gray-300 mb-4">
              An unexpected error occurred while loading the command center.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
            >
              Reload Application
            </button>
            {this.state.error && (
              <details className="mt-4 text-left text-sm text-gray-400">
                <summary className="cursor-pointer hover:text-white">
                  Technical Details
                </summary>
                <pre className="mt-2 p-2 bg-gray-900 rounded text-xs overflow-auto">
                  {this.state.error.message}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}