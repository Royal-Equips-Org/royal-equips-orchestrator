import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { io, Socket } from 'socket.io-client';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  error: string | null;
  reconnectAttempts: number;
  messages: Array<{
    id: string;
    type: string;
    data: any;
    timestamp: number;
  }>;
}

interface SocketActions {
  connect: (url?: string) => void;
  disconnect: () => void;
  sendMessage: (type: string, data: any) => void;
  clearMessages: () => void;
  clearError: () => void;
}

type SocketStore = SocketState & SocketActions;

export const useSocketStore = create<SocketStore>()(
  subscribeWithSelector((set, get) => ({
    // State
    socket: null,
    isConnected: false,
    error: null,
    reconnectAttempts: 0,
    messages: [],

    // Actions
    connect: (url = 'http://localhost:10000') => {
      const { socket } = get();
      
      if (socket) {
        console.warn('Socket already connected');
        return;
      }

      try {
        const newSocket = io(url, {
          transports: ['websocket', 'polling'],
          timeout: 20000,
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000
        });

        // Connection events
        newSocket.on('connect', () => {
          set({ 
            isConnected: true, 
            error: null, 
            reconnectAttempts: 0 
          });
          console.log('Socket connected successfully');
        });

        newSocket.on('disconnect', (reason: any) => {
          set({ isConnected: false });
          console.log('Socket disconnected:', reason);
        });

        newSocket.on('connect_error', (error: any) => {
          set(state => ({ 
            error: error.message,
            reconnectAttempts: state.reconnectAttempts + 1
          }));
          console.error('Socket connection error:', error);
        });

        // Generic message handler
        newSocket.onAny((eventName: any, data: any) => {
          set(state => ({
            messages: [
              ...state.messages.slice(-99), // Keep last 100 messages
              {
                id: `${Date.now()}-${Math.random()}`,
                type: eventName,
                data,
                timestamp: Date.now()
              }
            ]
          }));
        });

        set({ socket: newSocket });
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to connect to socket' 
        });
      }
    },

    disconnect: () => {
      const { socket } = get();
      
      if (socket) {
        socket.disconnect();
        set({ 
          socket: null, 
          isConnected: false, 
          error: null,
          reconnectAttempts: 0 
        });
      }
    },

    sendMessage: (type: string, data: any) => {
      const { socket, isConnected } = get();
      
      if (!socket || !isConnected) {
        console.warn('Cannot send message: Socket not connected');
        return;
      }

      try {
        socket.emit(type, data);
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to send message' 
        });
      }
    },

    clearMessages: () => {
      set({ messages: [] });
    },

    clearError: () => {
      set({ error: null });
    }
  }))
);

// Additional export for module compatibility - returns the socket instance
export const useModuleSocket = (module?: string) => {
  const { socket, isConnected } = useSocketStore();
  
  // Return a socket-like interface for module-specific usage
  return socket && isConnected ? socket : {
    on: () => {},
    off: () => {},
    emit: () => {},
    connected: false
  };
};