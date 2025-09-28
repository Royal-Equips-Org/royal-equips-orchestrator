/**
 * Security Store for Command Center
 * 
 * Manages security monitoring state, fraud detection data,
 * and compliance information. Real production state management.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface SecurityAlert {
  id: string;
  type: 'fraud' | 'security' | 'access' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  details?: any;
}

interface SecurityMetrics {
  agent_status: string;
  fraud_alerts_24h: number;
  security_events_24h: number;
  risk_threshold: number;
  last_scan: string;
  systems_operational: boolean;
}

interface ComplianceStatus {
  overall_score: number;
  total_issues: number;
  critical_issues: number;
  compliance_summary: Record<string, any>;
}

interface SecurityState {
  // Connection state
  isConnected: boolean;
  
  // Security metrics
  securityMetrics: SecurityMetrics | null;
  
  // Alerts and events
  alerts: SecurityAlert[];
  
  // Compliance status
  complianceStatus: ComplianceStatus | null;
  
  // UI state
  selectedTimeRange: '1h' | '24h' | '7d' | '30d';
  filterSeverity: string | null;
  filterType: string | null;
  
  // Actions
  setIsConnected: (connected: boolean) => void;
  setSecurityMetrics: (metrics: SecurityMetrics) => void;
  addAlert: (alert: SecurityAlert) => void;
  clearAlerts: () => void;
  setComplianceStatus: (status: ComplianceStatus) => void;
  setTimeRange: (range: '1h' | '24h' | '7d' | '30d') => void;
  setFilterSeverity: (severity: string | null) => void;
  setFilterType: (type: string | null) => void;
  
  // Computed getters
  filteredAlerts: () => SecurityAlert[];
  criticalAlertsCount: () => number;
  highRiskTransactions: () => SecurityAlert[];
}

export const useSecurityStore = create<SecurityState>()(
  devtools(
    (set, get) => ({
      // Initial state
      isConnected: false,
      securityMetrics: null,
      alerts: [],
      complianceStatus: null,
      selectedTimeRange: '24h',
      filterSeverity: null,
      filterType: null,
      
      // Actions
      setIsConnected: (connected) =>
        set({ isConnected: connected }, false, 'setIsConnected'),
      
      setSecurityMetrics: (metrics) =>
        set({ securityMetrics: metrics }, false, 'setSecurityMetrics'),
      
      addAlert: (alert) =>
        set((state) => ({
          alerts: [alert, ...state.alerts].slice(0, 100) // Keep last 100 alerts
        }), false, 'addAlert'),
      
      clearAlerts: () =>
        set({ alerts: [] }, false, 'clearAlerts'),
      
      setComplianceStatus: (status) =>
        set({ complianceStatus: status }, false, 'setComplianceStatus'),
      
      setTimeRange: (range) =>
        set({ selectedTimeRange: range }, false, 'setTimeRange'),
      
      setFilterSeverity: (severity) =>
        set({ filterSeverity: severity }, false, 'setFilterSeverity'),
      
      setFilterType: (type) =>
        set({ filterType: type }, false, 'setFilterType'),
      
      // Computed getters
      filteredAlerts: () => {
        const { alerts, filterSeverity, filterType, selectedTimeRange } = get();
        
        // Time filtering
        const now = new Date();
        const timeThresholds = {
          '1h': 1 * 60 * 60 * 1000,
          '24h': 24 * 60 * 60 * 1000,
          '7d': 7 * 24 * 60 * 60 * 1000,
          '30d': 30 * 24 * 60 * 60 * 1000
        };
        
        const timeThreshold = now.getTime() - timeThresholds[selectedTimeRange];
        
        return alerts.filter(alert => {
          // Time filter
          const alertTime = new Date(alert.timestamp).getTime();
          if (alertTime < timeThreshold) return false;
          
          // Severity filter
          if (filterSeverity && alert.severity !== filterSeverity) return false;
          
          // Type filter
          if (filterType && alert.type !== filterType) return false;
          
          return true;
        });
      },
      
      criticalAlertsCount: () => {
        const { alerts } = get();
        return alerts.filter(alert => alert.severity === 'critical').length;
      },
      
      highRiskTransactions: () => {
        const { alerts } = get();
        return alerts.filter(alert => 
          alert.type === 'fraud' && 
          (alert.severity === 'high' || alert.severity === 'critical')
        );
      }
    }),
    {
      name: 'security-store',
      partialize: (state: any) => ({
        selectedTimeRange: state.selectedTimeRange,
        filterSeverity: state.filterSeverity,
        filterType: state.filterType
      })
    }
  )
);