import { useState } from 'react';
import { circuitReset } from '../../services/api-client';

interface NetworkStatusBarProps {
  refreshAll?: () => void;
  className?: string;
}

export default function NetworkStatusBar({ refreshAll, className = '' }: NetworkStatusBarProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [lastReset, setLastReset] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCircuitReset = async () => {
    if (isResetting) return;

    setIsResetting(true);
    setError(null);

    try {
      // Reset the circuit breaker
      await circuitReset();
      
      // Refresh all data if callback provided
      if (refreshAll) {
        await refreshAll();
      }

      setLastReset(new Date());
      
      // Force a full page reload to reset all state
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Circuit reset failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className={`flex items-center gap-4 p-3 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-lg ${className}`}>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-300">Network Status</span>
        </div>
        {lastReset && (
          <div className="text-xs text-gray-500 mt-1">
            Last reset: {lastReset.toLocaleTimeString()}
          </div>
        )}
        {error && (
          <div className="text-xs text-red-400 mt-1">
            Error: {error}
          </div>
        )}
      </div>
      
      <button
        onClick={handleCircuitReset}
        disabled={isResetting}
        className={`
          px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
          ${isResetting 
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
            : 'bg-cyan-600 hover:bg-cyan-700 text-white hover:shadow-lg hover:shadow-cyan-500/25'
          }
        `}
        title="Reset circuit breaker and reload all data"
      >
        {isResetting ? (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            Resetting...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset Circuit & Reload
          </div>
        )}
      </button>
    </div>
  );
}