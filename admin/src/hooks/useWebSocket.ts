import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseWebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

interface WebSocketHook {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  subscribe: (event: string, callback: (data: any) => void) => () => void;
}

export const useWebSocket = (options: UseWebSocketOptions = {}): WebSocketHook => {
  const {
    url = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8000',
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const connect = () => {
    if (socketRef.current?.connected) return;

    try {
      socketRef.current = io(url, {
        transports: ['websocket'],
        upgrade: true,
        rememberUpgrade: true,
      });

      socketRef.current.on('connect', () => {
        setConnected(true);
        setError(null);
        onConnect?.();
      });

      socketRef.current.on('disconnect', (reason) => {
        setConnected(false);
        onDisconnect?.();
        console.log('WebSocket disconnected:', reason);
      });

      socketRef.current.on('connect_error', (err) => {
        setError(err.message);
        setConnected(false);
        onError?.(err);
        console.error('WebSocket connection error:', err);
      });

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown WebSocket error');
      setError(error.message);
      onError?.(error);
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  };

  const emit = (event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event}: WebSocket not connected`);
    }
  };

  const subscribe = (event: string, callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
      
      return () => {
        socketRef.current?.off(event, callback);
      };
    }
    
    return () => {};
  };

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url, autoConnect]);

  return {
    socket: socketRef.current,
    connected,
    error,
    connect,
    disconnect,
    emit,
    subscribe,
  };
};

// Hook for real-time system metrics
export const useSystemMetrics = () => {
  const [metrics, setMetrics] = useState({
    cpu: 0,
    memory: 0,
    network: 0,
    activeAgents: 0,
    systemLoad: 0,
    apiCalls: 0,
    errors: 0,
  });

  const ws = useWebSocket({
    onConnect: () => {
      console.log('Connected to system metrics stream');
    },
    onError: (error) => {
      console.error('System metrics WebSocket error:', error);
    },
  });

  useEffect(() => {
    const unsubscribe = ws.subscribe('system_metrics', (data) => {
      setMetrics(prev => ({ ...prev, ...data }));
    });

    // Request initial metrics
    if (ws.connected) {
      ws.emit('request_metrics');
    }

    return unsubscribe;
  }, [ws.connected]);

  // Generate mock data if WebSocket is not available
  useEffect(() => {
    if (!ws.connected) {
      const interval = setInterval(() => {
        setMetrics({
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          network: Math.random() * 1000,
          activeAgents: Math.floor(Math.random() * 8) + 1,
          systemLoad: Math.random(),
          apiCalls: Math.floor(Math.random() * 1000) + 100,
          errors: Math.floor(Math.random() * 10),
        });
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [ws.connected]);

  return { metrics, connected: ws.connected };
};

// Hook for agent status updates
export const useAgentStatus = () => {
  const [agents, setAgents] = useState<Array<{
    id: string;
    name: string;
    status: 'running' | 'idle' | 'error';
    lastRun: Date;
    performance: {
      speed: number;
      successRate: number;
      errors: number;
    };
    currentTask?: string;
  }>>([]);

  const ws = useWebSocket();

  useEffect(() => {
    const unsubscribe = ws.subscribe('agent_status', (data) => {
      setAgents(data);
    });

    if (ws.connected) {
      ws.emit('request_agent_status');
    }

    return unsubscribe;
  }, [ws.connected]);

  // Generate mock agent data if WebSocket is not available
  useEffect(() => {
    if (!ws.connected) {
      const mockAgents = [
        'ProductResearchAgent',
        'InventoryForecastingAgent', 
        'PricingOptimizerAgent',
        'MarketingAutomationAgent',
        'CustomerSupportAgent',
        'OrderManagementAgent'
      ].map((name, i) => ({
        id: `agent_${i}`,
        name,
        status: Math.random() > 0.2 ? 'running' : Math.random() > 0.5 ? 'idle' : 'error' as const,
        lastRun: new Date(Date.now() - Math.random() * 3600000),
        performance: {
          speed: Math.random() * 100,
          successRate: 90 + Math.random() * 10,
          errors: Math.floor(Math.random() * 5),
        },
        currentTask: Math.random() > 0.5 ? `Processing ${Math.floor(Math.random() * 100)} items` : undefined,
      }));

      setAgents(mockAgents);
    }
  }, [ws.connected]);

  return { agents, connected: ws.connected };
};