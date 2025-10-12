/**
 * Safe Canvas Wrapper
 * Provides WebGL detection and graceful fallback for 3D content
 */

import React, { useEffect, useState, ReactNode } from 'react';
import { Canvas, CanvasProps } from '@react-three/fiber';
import { isWebGLAvailable, getWebGLCapabilities, logWebGLInfo } from '../../utils/webgl-detector';

interface SafeCanvasProps extends CanvasProps {
  fallback?: ReactNode;
  onError?: (error: string) => void;
}

/**
 * Canvas wrapper with WebGL detection and error handling
 * Falls back to 2D content if WebGL is unavailable
 */
export function SafeCanvas({ fallback, onError, children, ...canvasProps }: SafeCanvasProps) {
  const [webglSupported, setWebglSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check WebGL support on mount
    const supported = isWebGLAvailable();
    setWebglSupported(supported);

    if (!supported) {
      const capabilities = getWebGLCapabilities();
      const errorMessage = capabilities.error || 'WebGL not supported';
      setError(errorMessage);
      onError?.(errorMessage);
      
      // Log capabilities for debugging
      if (import.meta.env.DEV || import.meta.env.VITE_ENABLE_WEBGL_LOGGING === 'true') {
        logWebGLInfo();
      }
    }
  }, [onError]);

  // Show loading state while checking
  if (webglSupported === null) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-gray-900/50 rounded-lg">
        <div className="text-gray-400">Initializing 3D view...</div>
      </div>
    );
  }

  // Show fallback if WebGL not supported
  if (!webglSupported) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-gray-900/50 rounded-lg p-6 text-center">
        <div className="text-yellow-400 mb-2">⚠️ 3D View Unavailable</div>
        <div className="text-gray-400 text-sm">
          {error || 'WebGL is not supported in your browser'}
        </div>
        <div className="text-gray-500 text-xs mt-2">
          Try updating your browser or enabling hardware acceleration
        </div>
      </div>
    );
  }

  // Render Canvas with error boundary
  return (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Canvas {...canvasProps}>
        {children}
      </Canvas>
    </ErrorBoundary>
  );
}

/**
 * Error boundary for Canvas rendering errors
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: string) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Canvas rendering error:', error, errorInfo);
    this.props.onError?.(error.message);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-gray-900/50 rounded-lg p-6 text-center">
          <div className="text-red-400 mb-2">❌ 3D Rendering Error</div>
          <div className="text-gray-400 text-sm">
            {this.state.error?.message || 'Failed to render 3D content'}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SafeCanvas;
