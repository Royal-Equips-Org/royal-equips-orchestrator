/**
 * WebSocket client for real-time inventory updates
 * Connects to the inventory namespace and provides live data streams
 */

import { io, Socket } from 'socket.io-client';

interface InventorySocketConfig {
  onDashboardUpdate?: (data: any) => void;
  onAgentStatus?: (status: any) => void;
  onForecastUpdate?: (data: any) => void;
  onOptimizationUpdate?: (data: any) => void;
  onSupplierUpdate?: (data: any) => void;
  onInventoryAlert?: (alert: any) => void;
  onReorderRecommendation?: (recommendation: any) => void;
  onError?: (error: any) => void;
  onConnectionStatus?: (status: any) => void;
}

class InventoryWebSocketClient {
  private socket: Socket | null = null;
  private config: InventorySocketConfig = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(config: InventorySocketConfig = {}) {
    this.config = config;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create socket connection to inventory namespace
        this.socket = io('/inventory', {
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectInterval
        });

        // Connection events
        this.socket.on('connect', () => {
          console.log('✅ Connected to inventory WebSocket namespace');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          
          this.config.onConnectionStatus?.({
            status: 'connected',
            timestamp: new Date().toISOString()
          });
          
          resolve();
        });

        this.socket.on('disconnect', (reason: any) => {
          console.log('❌ Disconnected from inventory WebSocket:', reason);
          this.stopHeartbeat();
          
          this.config.onConnectionStatus?.({
            status: 'disconnected',
            reason,
            timestamp: new Date().toISOString()
          });
        });

        this.socket.on('connect_error', (error: any) => {
          console.error('❌ Inventory WebSocket connection error:', error);
          this.config.onError?.(error);
          reject(error);
        });

        this.socket.on('reconnect', (attempt: any) => {
          console.log(`🔄 Inventory WebSocket reconnected after ${attempt} attempts`);
          this.config.onConnectionStatus?.({
            status: 'reconnected',
            attempt,
            timestamp: new Date().toISOString()
          });
        });

        this.socket.on('reconnect_error', (error: any) => {
          console.error('❌ Inventory WebSocket reconnection failed:', error);
        });

        // Data event handlers
        this.setupEventHandlers();

      } catch (error) {
        console.error('❌ Failed to create inventory WebSocket:', error);
        reject(error);
      }
    });
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection confirmation
    this.socket.on('connection_status', (data: any) => {
      console.log('📡 Inventory WebSocket connection status:', data);
      this.config.onConnectionStatus?.(data);
    });

    // Dashboard updates
    this.socket.on('dashboard_update', (data: any) => {
      console.log('📊 Inventory dashboard update received:', data);
      this.config.onDashboardUpdate?.(data);
    });

    // Agent status updates
    this.socket.on('agent_status', (status: any) => {
      console.log('🤖 Inventory agent status update:', status);
      this.config.onAgentStatus?.(status);
    });

    // Forecasting updates
    this.socket.on('forecast_update', (data: any) => {
      console.log('🔮 Inventory forecast update:', data);
      this.config.onForecastUpdate?.(data);
    });

    this.socket.on('forecast_completed', (data: any) => {
      console.log('✅ Inventory forecast completed:', data);
      this.config.onForecastUpdate?.(data);
    });

    this.socket.on('forecast_error', (error: any) => {
      console.error('❌ Inventory forecast error:', error);
      this.config.onError?.(error);
    });

    // Optimization updates
    this.socket.on('optimization_update', (data: any) => {
      console.log('⚙️ Inventory optimization update:', data);
      this.config.onOptimizationUpdate?.(data);
    });

    this.socket.on('optimization_completed', (data: any) => {
      console.log('✅ Inventory optimization completed:', data);
      this.config.onOptimizationUpdate?.(data);
    });

    this.socket.on('optimization_error', (error: any) => {
      console.error('❌ Inventory optimization error:', error);
      this.config.onError?.(error);
    });

    // Supplier performance updates
    this.socket.on('supplier_performance_update', (data: any) => {
      console.log('🚛 Supplier performance update:', data);
      this.config.onSupplierUpdate?.(data);
    });

    // Inventory alerts
    this.socket.on('inventory_alert', (alert: any) => {
      console.log('🚨 Inventory alert:', alert);
      this.config.onInventoryAlert?.(alert);
    });

    // Reorder recommendations
    this.socket.on('reorder_recommendation', (recommendation: any) => {
      console.log('💡 Reorder recommendation:', recommendation);
      this.config.onReorderRecommendation?.(recommendation);
    });

    // Cycle execution events
    this.socket.on('cycle_started', (data: any) => {
      console.log('🔄 Inventory cycle started:', data);
    });

    this.socket.on('cycle_completed', (data: any) => {
      console.log('✅ Inventory cycle completed:', data);
      // Trigger dashboard refresh
      this.config.onDashboardUpdate?.(data);
    });

    this.socket.on('cycle_error', (error: any) => {
      console.error('❌ Inventory cycle error:', error);
      this.config.onError?.(error);
    });

    // Heartbeat
    this.socket.on('heartbeat_ack', (data: any) => {
      // Silent acknowledgment
    });

    // Generic error handler
    this.socket.on('error', (error: any) => {
      console.error('❌ Inventory WebSocket error:', error);
      this.config.onError?.(error);
    });
  }

  // Subscription methods
  subscribeToDashboard(): void {
    if (!this.socket?.connected) return;
    
    console.log('📊 Subscribing to inventory dashboard updates');
    this.socket.emit('subscribe_dashboard', {
      timestamp: new Date().toISOString()
    });
  }

  subscribeToForecasting(): void {
    if (!this.socket?.connected) return;
    
    console.log('🔮 Subscribing to inventory forecasting updates');
    this.socket.emit('subscribe_forecasting', {
      timestamp: new Date().toISOString()
    });
  }

  subscribeToOptimization(): void {
    if (!this.socket?.connected) return;
    
    console.log('⚙️ Subscribing to inventory optimization updates');
    this.socket.emit('subscribe_optimization', {
      timestamp: new Date().toISOString()
    });
  }

  subscribeToSuppliers(): void {
    if (!this.socket?.connected) return;
    
    console.log('🚛 Subscribing to supplier performance updates');
    this.socket.emit('subscribe_suppliers', {
      timestamp: new Date().toISOString()
    });
  }

  unsubscribe(room: string): void {
    if (!this.socket?.connected) return;
    
    console.log(`🚫 Unsubscribing from ${room}`);
    this.socket.emit('unsubscribe', { room });
  }

  // Action methods
  requestAgentStatus(): void {
    if (!this.socket?.connected) return;
    
    console.log('📡 Requesting inventory agent status');
    this.socket.emit('request_agent_status', {
      timestamp: new Date().toISOString()
    });
  }

  executeInventoryCycle(): void {
    if (!this.socket?.connected) return;
    
    console.log('🔄 Executing inventory management cycle');
    this.socket.emit('execute_inventory_cycle', {
      timestamp: new Date().toISOString()
    });
  }

  generateForecast(options: { days_ahead?: number; products?: string[] } = {}): void {
    if (!this.socket?.connected) return;
    
    console.log('🔮 Generating inventory forecast', options);
    this.socket.emit('generate_forecast', {
      ...options,
      timestamp: new Date().toISOString()
    });
  }

  runOptimization(): void {
    if (!this.socket?.connected) return;
    
    console.log('⚙️ Running inventory optimization');
    this.socket.emit('run_optimization', {
      timestamp: new Date().toISOString()
    });
  }

  // Heartbeat management
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('heartbeat', {
          timestamp: new Date().toISOString()
        });
      }
    }, 30000); // Every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Connection management
  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    console.log('📡 Inventory WebSocket disconnected');
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Update configuration
  updateConfig(newConfig: Partial<InventorySocketConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get connection info
  getConnectionInfo(): { connected: boolean; id?: string } {
    return {
      connected: this.isConnected(),
      id: this.socket?.id
    };
  }
}

export default InventoryWebSocketClient;
export type { InventorySocketConfig };