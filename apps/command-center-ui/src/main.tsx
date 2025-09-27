import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { loadRuntimeConfig, RuntimeConfig } from './lib/runtime-config';
import './styles/globals.css';

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

createRoot(el).render(
  <ErrorBoundary>
    <AppBootstrap>
      <App />
    </AppBootstrap>
  </ErrorBoundary>
);