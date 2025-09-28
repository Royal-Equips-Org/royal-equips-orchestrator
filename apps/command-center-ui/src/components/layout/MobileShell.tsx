import React, { ReactNode, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { useEmpireStore } from '../../store/empire-store';

interface MobileShellProps {
  children: ReactNode;
  className?: string;
}

/**
 * MobileShell - Mobile-first layout wrapper with safe area handling,
 * offline status, and responsive container management
 */
export function MobileShell({ children, className = '' }: MobileShellProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const { isConnected } = useEmpireStore();

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineBanner(false);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto-hide offline banner after reconnection
  useEffect(() => {
    if (isOnline && showOfflineBanner) {
      const timer = setTimeout(() => setShowOfflineBanner(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, showOfflineBanner]);

  return (
    <div className={`
      min-h-screen bg-bg text-text-primary
      relative overflow-x-hidden
      ${className}
    `}>
      {/* Safe area aware container */}
      <div className="
        min-h-screen
        pt-safe-top pb-safe-bottom pl-safe-left pr-safe-right
        flex flex-col
      ">
        {/* Offline/Network Status Banner */}
        <AnimatePresence>
          {showOfflineBanner && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="
                fixed top-0 left-0 right-0 z-50
                bg-quantum-warning/20 backdrop-blur-md
                border-b border-quantum-warning/30
                px-4 py-2
              "
            >
              <div className="flex items-center justify-center space-x-2">
                {isOnline ? (
                  <>
                    <Wifi className="w-4 h-4 text-quantum-primary" />
                    <span className="text-sm font-medium text-quantum-primary">
                      Connection restored
                    </span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-quantum-warning" />
                    <span className="text-sm font-medium text-quantum-warning">
                      Working offline • Some features may be limited
                    </span>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* API Connection Status */}
        <AnimatePresence>
          {!isConnected && isOnline && (
            <motion.div
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="
                fixed top-0 left-0 right-0 z-50
                bg-quantum-danger/20 backdrop-blur-md
                border-b border-quantum-danger/30
                px-4 py-2
              "
            >
              <div className="flex items-center justify-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-quantum-danger" />
                <span className="text-sm font-medium text-quantum-danger">
                  API connection lost • Retrying...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content area */}
        <div className="flex-1 relative">
          {children}
        </div>
      </div>

      {/* Quantum particle background effect (mobile-optimized) */}
      <div className="
        fixed inset-0 pointer-events-none -z-10
        opacity-40 sm:opacity-60
      ">
        <div className="
          absolute inset-0
          bg-gradient-to-br from-quantum-primary/5 via-transparent to-quantum-secondary/5
          animate-pulse
        " />
      </div>
    </div>
  );
}

export default MobileShell;