import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (type: string, data: any) => void;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket(url: string = 'http://localhost:10000'): UseWebSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  const connect = useCallback(() => {
    if (!socket) {
      const newSocket = io(url, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        console.log('WebSocket connected to:', url);
      });

      newSocket.on('disconnect', (reason: any) => {
        setIsConnected(false);
        console.log('WebSocket disconnected:', reason);
      });

      newSocket.on('connect_error', (error: any) => {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
      });

      // Generic message handler
      newSocket.onAny((eventName: any, data: any) => {
        setLastMessage({
          type: eventName,
          data,
          timestamp: Date.now()
        });
      });

      setSocket(newSocket);
    }
  }, [url, socket]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  const sendMessage = useCallback((type: string, data: any) => {
    if (socket && isConnected) {
      socket.emit(type, data);
    } else {
      console.warn('Cannot send message: WebSocket not connected');
    }
  }, [socket, isConnected]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    socket,
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect
  };
}