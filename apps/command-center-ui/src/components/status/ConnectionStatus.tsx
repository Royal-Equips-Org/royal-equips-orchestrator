/**
 * Connection Status Indicator
 * Shows real-time connection status to backend APIs
 */

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface ConnectionStatusProps {
  endpoint?: string;
  pollingInterval?: number;
  showLabel?: boolean;
  compact?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  endpoint = '/api/metrics/dashboard',
  pollingInterval = 30000,
  showLabel = true,
  compact = false,
}) => {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  useEffect(() => {
    let isMounted = true;

    const checkConnection = async () => {
      try {
        const response = await fetch(endpoint, { method: 'HEAD' });
        if (isMounted) {
          setStatus(response.ok ? 'connected' : 'disconnected');
        }
      } catch {
        if (isMounted) setStatus('disconnected');
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, pollingInterval);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [endpoint, pollingInterval]);

  const config = {
    connected: { icon: Wifi, color: 'text-green-400', label: 'Connected' },
    disconnected: { icon: WifiOff, color: 'text-red-400', label: 'Disconnected' },
    checking: { icon: AlertCircle, color: 'text-yellow-400', label: 'Checking...' },
  }[status];

  const Icon = config.icon;

  if (compact) {
    return <Icon className={`w-4 h-4 ${config.color}`} />;
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/40 border border-gray-700/30 rounded-lg">
      <Icon className={`w-4 h-4 ${config.color}`} />
      {showLabel && <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>}
    </div>
  );
};

export default ConnectionStatus;
