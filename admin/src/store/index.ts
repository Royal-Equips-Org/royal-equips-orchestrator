import { create } from 'zustand';
import { AgentSession, SystemMetrics, WorkerStatus } from '../types';

// Enhanced interfaces for new services
interface GitHubStatus {
  authenticated: boolean;
  repo_owner: string;
  repo_name: string;
  status: string;
  health?: any;
  activity?: any;
}

interface AIAssistantStatus {
  enabled: boolean;
  model: string;
  conversation_length: number;
  status: string;
}

interface WorkspaceInfo {
  workspace_id: string;
  name: string;
  type: string;
  environment: string;
  status: string;
  is_active: boolean;
  active_operations: number;
}

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
  
  // GitHub Integration
  githubStatus: GitHubStatus | null;
  setGitHubStatus: (status: GitHubStatus) => void;
  
  // AI Assistant
  assistantStatus: AIAssistantStatus | null;
  chatMessages: Array<{id: string; type: 'user' | 'assistant'; content: string; timestamp: string}>;
  setAssistantStatus: (status: AIAssistantStatus) => void;
  addChatMessage: (message: {type: 'user' | 'assistant'; content: string}) => void;
  clearChat: () => void;
  
  // Workspace Management
  workspaces: WorkspaceInfo[];
  activeWorkspace: WorkspaceInfo | null;
  setWorkspaces: (workspaces: WorkspaceInfo[]) => void;
  setActiveWorkspace: (workspace: WorkspaceInfo) => void;
  
  // God Mode & Elite Controls
  godMode: boolean;
  emergencyStop: boolean;
  setGodMode: (enabled: boolean) => void;
  setEmergencyStop: (active: boolean) => void;
  
  // UI state
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  
  // Enhanced UI state
  eliteMode: boolean;
  darkTheme: boolean;
  showNotifications: boolean;
  toggleEliteMode: () => void;
  toggleTheme: () => void;
  toggleNotifications: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
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
  
  // GitHub Integration
  githubStatus: null,
  setGitHubStatus: (status) => set({ githubStatus: status }),
  
  // AI Assistant
  assistantStatus: null,
  chatMessages: [],
  setAssistantStatus: (status) => set({ assistantStatus: status }),
  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, {
      id: Date.now().toString(),
      type: message.type,
      content: message.content,
      timestamp: new Date().toISOString()
    }]
  })),
  clearChat: () => set({ chatMessages: [] }),
  
  // Workspace Management
  workspaces: [],
  activeWorkspace: null,
  setWorkspaces: (workspaces) => set({ workspaces }),
  setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
  
  // God Mode & Elite Controls
  godMode: false,
  emergencyStop: false,
  setGodMode: (enabled) => set({ godMode: enabled }),
  setEmergencyStop: (active) => set({ emergencyStop: active }),
  
  // UI state
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  // Enhanced UI state
  eliteMode: true, // Default to elite mode for business users
  darkTheme: true,
  showNotifications: true,
  toggleEliteMode: () => set((state) => ({ eliteMode: !state.eliteMode })),
  toggleTheme: () => set((state) => ({ darkTheme: !state.darkTheme })),
  toggleNotifications: () => set((state) => ({ showNotifications: !state.showNotifications })),
}));