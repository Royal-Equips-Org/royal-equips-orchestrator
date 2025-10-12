import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { loadRuntimeConfig, RuntimeConfig } from './lib/runtime-config';
import './styles/globals.css';

// Initialize Sentry error monitoring for frontend
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'production';

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    
    // Performance monitoring
    integrations: [
      new BrowserTracing({
        // Track navigation and route changes
        routingInstrumentation: Sentry.reactRouterV6Instrumentation(
          React.useEffect,
          // @ts-ignore - location and routes injected by router
          window.location,
          []
        ),
      }),
    ],
    
    // Sample rate for transactions (1.0 = 100%)
    tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '1.0'),
    
    // Enhanced error data
    attachStacktrace: true,
    normalizeDepth: 10,
    
    // Release tracking
    release: import.meta.env.VITE_RELEASE_VERSION || 'dev',
    
    // Breadcrumbs
    maxBreadcrumbs: 50,
    
    // Filters
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      // Network errors that are expected
      'NetworkError',
      'Failed to fetch',
    ],
    
    // User privacy
    beforeSend(event, hint) {
      // Don't send events in development
      if (import.meta.env.DEV) {
        console.error('Sentry event (dev):', event, hint);
        return null;
      }
      return event;
    },
  });
  
  console.log('✅ Sentry error monitoring initialized (frontend)');
} else {
  console.warn('⚠️ VITE_SENTRY_DSN not set - frontend error monitoring disabled');
}

// Service worker and hard cache bust to prevent caching issues
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
  }
}

interface AppBootstrapProps {
  children: React.ReactNode;
}

function AppBootstrap({ children }: AppBootstrapProps) {
  const [configLoaded, setConfigLoaded] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    loadRuntimeConfig()
      .then(() => {
        setConfigLoaded(true);
      })
      .catch((error) => {
        console.error('Failed to load runtime config:', error);
        setConfigError(error.message);
        // Still proceed with defaults
        setConfigLoaded(true);
      });
  }, []);

  if (!configLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p>Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center max-w-md p-6">
          <div className="text-yellow-400 mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Configuration Warning</h2>
          <p className="text-gray-300 mb-4">
            Failed to load runtime configuration, using defaults: {configError}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

const el = document.getElementById('root');
if (!el) throw new Error('Missing #root element');

// Wrap entire app with Sentry's error boundary for enhanced error tracking
createRoot(el).render(
  <Sentry.ErrorBoundary fallback={<ErrorFallback />} showDialog>
    <ErrorBoundary>
      <AppBootstrap>
        <App />
      </AppBootstrap>
    </ErrorBoundary>
  </Sentry.ErrorBoundary>
);

// Sentry error fallback component
function ErrorFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="text-center max-w-md p-6">
        <div className="text-red-400 text-4xl mb-4">⚠️</div>
        <h2 className="text-2xl font-semibold mb-2">Application Error</h2>
        <p className="text-gray-300 mb-4">
          An unexpected error occurred. Our team has been notified.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded text-white"
        >
          Reload Application
        </button>
      </div>
    </div>
  );
}