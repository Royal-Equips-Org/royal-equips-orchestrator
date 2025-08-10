import { create } from 'zustand';
import { AgentSession, SystemMetrics, WorkerStatus } from '../types';

interface AppState {
  // Navigation
  currentPage: string;
  setCurrentPage: (page: string) => void;
  
  // System status
  workerStatus: WorkerStatus | null;
  systemMetrics: SystemMetrics | null;
  setWorkerStatus: (status: WorkerStatus) => void;
  setSystemMetrics: (metrics: SystemMetrics) => void;
  
  // Agents
  agentSessions: AgentSession[];
  activeSessionId: string | null;
  isStreaming: boolean;
  setAgentSessions: (sessions: AgentSession[]) => void;
  setActiveSession: (sessionId: string | null) => void;
  setIsStreaming: (streaming: boolean) => void;
  
  // UI state
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Navigation
  currentPage: 'overview',
  setCurrentPage: (page) => set({ currentPage: page }),
  
  // System status
  workerStatus: null,
  systemMetrics: null,
  setWorkerStatus: (status) => set({ workerStatus: status }),
  setSystemMetrics: (metrics) => set({ systemMetrics: metrics }),
  
  // Agents
  agentSessions: [],
  activeSessionId: null,
  isStreaming: false,
  setAgentSessions: (sessions) => set({ agentSessions: sessions }),
  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  
  // UI state
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}));