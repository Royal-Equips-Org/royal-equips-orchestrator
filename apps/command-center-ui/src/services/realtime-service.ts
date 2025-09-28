/**
 * Real-time Data Service for Royal Equips Command Center
 * 
 * Provides WebSocket connections for live data updates across all modules
 * with intelligent reconnection, data synchronization, and performance optimization.
 */

import { logger } from './log';

export type DataType = 'empire-metrics' | 'shopify-orders' | 'agent-status' | 'product-opportunities' | 'system-health';

export interface RealTimeMessage {
  type: DataType;
  data: any;
  timestamp: string;
  source: string;
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected: Date | null;
  errorCount: number;
  latency: number;
}

export class RealTimeService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // Start with 1 second
  private maxReconnectDelay = 30000; // Max 30 seconds
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionStatus: ConnectionStatus = {
    connected: false,
    reconnecting: false,
    lastConnected: null,
    errorCount: 0,
    latency: 0
  };
  
  // Event listeners for different data types
  private listeners: Map<DataType, Set<(data: any) => void>> = new Map();
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  
  // Message queue for when connection is down
  private messageQueue: RealTimeMessage[] = [];
  private maxQueueSize = 100;
  
  // Performance tracking
  private lastHeartbeat = 0;
  private messageCount = 0;
  private bytesReceived = 0;

  constructor(private wsUrl: string = 'ws://localhost:5000/ws') {
    this.setupConnectionHealthCheck();
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    this.connectionStatus.reconnecting = true;
    this.notifyStatusListeners();

    try {
      this.ws = new WebSocket(this.wsUrl);
      this.setupWebSocketHandlers();
      
      // Wait for connection to establish
      await new Promise<void>((resolve, reject) => {
        if (!this.ws) {
          reject(new Error('WebSocket not initialized'));
          return;
        }

        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 10000);

        this.ws!.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };

        this.ws!.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('WebSocket connection error'));
        };
      });

      this.onConnectionEstablished();
      
    } catch (error: any) {
      logger.error('WebSocket connection failed:', error);
      this.onConnectionError(error);
      throw error;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connectionStatus.connected = false;
    this.connectionStatus.reconnecting = false;
    this.notifyStatusListeners();
  }

  /**
   * Subscribe to real-time data updates
   */
  subscribe(dataType: DataType, callback: (data: any) => void): () => void {
    if (!this.listeners.has(dataType)) {
      this.listeners.set(dataType, new Set());
    }
    
    this.listeners.get(dataType)!.add(callback);
    
    // Send subscription message to server
    this.sendMessage({
      type: 'subscribe',
      dataType,
      timestamp: new Date().toISOString()
    });

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(dataType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
    // Send unsubscribe message to server
    try {
      this.sendMessage({
        type: 'unsubscribe',
        dataType
      });
    } catch (err) {
      logger.error('Failed to send unsubscribe message', undefined, err instanceof Error ? err : new Error(String(err)));
    }
        }
      }
    };
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(callback);
    
    // Immediately call with current status
    callback(this.connectionStatus);
    
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  /**
   * Force refresh data for a specific type
   */
  refreshData(dataType: DataType): void {
    this.sendMessage({
      type: 'refresh',
      dataType,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      messageCount: this.messageCount,
      bytesReceived: this.bytesReceived,
      avgLatency: this.connectionStatus.latency,
      uptime: this.connectionStatus.lastConnected 
        ? Date.now() - this.connectionStatus.lastConnected.getTime()
        : 0,
      queueSize: this.messageQueue.length,
      errorCount: this.connectionStatus.errorCount
    };
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.onConnectionEstablished();
    };

    this.ws.onmessage = (event) => {
      this.onMessage(event);
    };

    this.ws.onclose = (event) => {
      this.onConnectionClosed(event);
    };

    this.ws.onerror = (error) => {
      this.onConnectionError(error);
    };
  }

  private onConnectionEstablished(): void {
    logger.info('WebSocket connection established');
    
    this.connectionStatus.connected = true;
    this.connectionStatus.reconnecting = false;
    this.connectionStatus.lastConnected = new Date();
    this.connectionStatus.errorCount = 0;
    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
    
    this.notifyStatusListeners();
    this.startHeartbeat();
    this.processMessageQueue();
    
    // Re-subscribe to all active data types
    this.resubscribeAll();
  }

  private onMessage(event: MessageEvent): void {
    try {
      const message: RealTimeMessage = JSON.parse(event.data);
      
      // Update performance metrics
      this.messageCount++;
      this.bytesReceived += event.data.length;
      
      // Handle heartbeat/pong messages
      if (message.type === 'heartbeat' as DataType) {
        this.updateLatency();
        return;
      }
      
      // Route message to appropriate listeners
      const listeners = this.listeners.get(message.type);
      if (listeners) {
        listeners.forEach(callback => {
          try {
            callback(message.data);
          } catch (error: any) {
            logger.error(`Error in data callback for ${message.type}:`, { error: error.message });
          }
        });
      }
      
      logger.debug(`Received real-time update: ${message.type}`, message.data);
      
    } catch (error: any) {
      logger.error('Error parsing WebSocket message:', { error: error.message });
    }
  }

  private onConnectionClosed(event: { code: number; reason: string }): void {
    logger.warn(`WebSocket connection closed: ${event.code} - ${event.reason}`);
    
    this.connectionStatus.connected = false;
    this.stopHeartbeat();
    this.notifyStatusListeners();
    
    // Attempt reconnection unless explicitly closed
    if (event.code !== 1000) { // 1000 = normal closure
      this.scheduleReconnect();
    }
  }

  private onConnectionError(error: any): void {
    logger.error('WebSocket error:', error);
    
    this.connectionStatus.errorCount++;
    this.connectionStatus.connected = false;
    this.notifyStatusListeners();
    
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached');
      this.connectionStatus.reconnecting = false;
      this.notifyStatusListeners();
      return;
    }

    this.connectionStatus.reconnecting = true;
    this.notifyStatusListeners();

    setTimeout(() => {
      this.reconnectAttempts++;
      logger.info(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      this.connect().catch(() => {
        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      });
    }, this.reconnectDelay);
  }

  private sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for when connection is restored
      if (this.messageQueue.length < this.maxQueueSize) {
        this.messageQueue.push({
          type: message.type,
          data: message,
          timestamp: new Date().toISOString(),
          source: 'client'
        });
      }
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift()!;
      this.ws.send(JSON.stringify(message.data));
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.lastHeartbeat = Date.now();
      this.sendMessage({
        type: 'ping',
        timestamp: this.lastHeartbeat
      });
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private updateLatency(): void {
    if (this.lastHeartbeat > 0) {
      this.connectionStatus.latency = Date.now() - this.lastHeartbeat;
    }
  }

  private resubscribeAll(): void {
    // Resubscribe to all active data types
    for (const [dataType, listeners] of this.listeners.entries()) {
      if (listeners.size > 0) {
        this.sendMessage({
          type: 'subscribe',
          dataType,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  private notifyStatusListeners(): void {
    this.statusListeners.forEach(callback => {
      try {
        callback(this.connectionStatus);
      } catch (error: any) {
        logger.error('Error in status callback:', { error: error.message });
      }
    });
  }

  private setupConnectionHealthCheck(): void {
    // Periodic health check
    setInterval(() => {
      if (this.connectionStatus.connected && this.ws?.readyState !== WebSocket.OPEN) {
        logger.warn('WebSocket health check failed - connection appears closed');
        this.onConnectionClosed({ code: 1006, reason: 'Health check failed' } as CloseEvent);
      }
    }, 10000); // Every 10 seconds
  }
}

// Global service instance
let realTimeService: RealTimeService | null = null;

export function getRealTimeService(): RealTimeService {
  if (!realTimeService) {
    // Determine WebSocket URL based on environment
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = process.env.NODE_ENV === 'development' 
      ? 'localhost:5000' 
      : window.location.host;
    const wsUrl = `${wsProtocol}//${wsHost}/ws`;
    
    realTimeService = new RealTimeService(wsUrl);
  }
  return realTimeService;
}

// React hook for easy integration
export function useRealTimeData<T>(dataType: DataType, initialData?: T) {
  const [data, setData] = React.useState<T | undefined>(initialData);
  const [status, setStatus] = React.useState<ConnectionStatus>({
    connected: false,
    reconnecting: false,
    lastConnected: null,
    errorCount: 0,
    latency: 0
  });

  React.useEffect(() => {
    const service = getRealTimeService();
    
    // Connect if not already connected
    service.connect().catch(error => {
      logger.error('Failed to connect to real-time service:', error);
    });
    
    // Subscribe to data updates
    const unsubscribeData = service.subscribe(dataType, (newData: T) => {
      setData(newData);
    });
    
    // Subscribe to status updates
    const unsubscribeStatus = service.onStatusChange(setStatus);
    
    return () => {
      unsubscribeData();
      unsubscribeStatus();
    };
  }, [dataType]);

  const refresh = React.useCallback(() => {
    getRealTimeService().refreshData(dataType);
  }, [dataType]);

  return { data, status, refresh };
}

// Type-safe imports for React
import * as React from 'react';