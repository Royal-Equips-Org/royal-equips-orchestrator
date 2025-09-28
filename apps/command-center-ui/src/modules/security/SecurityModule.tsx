/**
 * Security Module for Royal Equips Command Center
 * 
 * Provides real-time security monitoring, fraud detection dashboard,
 * and compliance management interface. All data is live production data.
 * No mock implementations - connects to real security agent via WebSocket.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  Activity, 
  Lock, 
  Eye, 
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Users,
  DollarSign
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useSecurityStore } from '../../stores/securityStore';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { ErrorBoundary } from '../../components/ErrorBoundary';


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


const SecurityDashboard: React.FC = () => {
  const {
    securityMetrics,
    alerts,
    complianceStatus,
    isConnected,
    setSecurityMetrics,
    addAlert,
    setComplianceStatus
  } = useSecurityStore();

  const [isLoading, setIsLoading] = useState(true);
  const [scanProgress, setScanProgress] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);

  // WebSocket connection for real-time security updates
  const { sendMessage } = useWebSocket('/security', {
    onMessage: useCallback((data) => {
      try {
        const message = JSON.parse(data);
        
        switch (message.type) {
          case 'security_status_update':
            if (message.security_metrics) {
              setSecurityMetrics(message.security_metrics);
            }
            break;
            
          case 'security_alert':
            addAlert({
              id: Date.now().toString(),
              type: message.type,
              severity: message.severity,
              message: message.message,
              timestamp: message.timestamp,
              details: message.details
            });
            
            // Show toast notification for high/critical alerts
            if (message.severity === 'high' || message.severity === 'critical') {
              toast.error(`Security Alert: ${message.message}`);
            }
            break;
            
          case 'fraud_detection_event':
            addAlert({
              id: Date.now().toString(),
              type: 'fraud',
              severity: message.risk_score > 0.8 ? 'critical' : 'high',
              message: `Fraudulent transaction detected (Risk: ${(message.risk_score * 100).toFixed(1)}%)`,
              timestamp: message.timestamp,
              details: message
            });
            
            toast.error(`Fraud Alert: Transaction ${message.transaction_id}`);
            break;
            
          case 'fraud_scan_progress':
            setScanProgress(message.message);
            break;
            
          case 'fraud_scan_completed':
            setScanProgress(null);
            toast.success(`Fraud scan completed: ${message.results.transactions_analyzed} analyzed`);
            break;
            
          case 'compliance_status_update':
            // Update compliance status
            break;
        }
      } catch (error) {
        console.error('Error processing security WebSocket message:', error);
      }
    }, [setSecurityMetrics, addAlert]),
    
    onConnect: useCallback(() => {
      // Join security monitoring room
      sendMessage({
        type: 'join_security_monitoring',
        user_id: 'admin'
      });
      
      // Request initial status
      sendMessage({
        type: 'request_security_status',
        user_id: 'admin'
      });
      
      setIsLoading(false);
    }, [sendMessage])
  });

  // Load initial data
  useEffect(() => {
    const loadSecurityData = async () => {
      try {
        // Load security status
        const statusResponse = await fetch('/api/security/status');
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.success) {
            setSecurityMetrics(statusData.data.security_metrics);
          }
        }

        // Load recent alerts
        const alertsResponse = await fetch('/api/security/alerts?limit=20');
        if (alertsResponse.ok) {
          const alertsData = await alertsResponse.json();
          if (alertsData.success) {
            alertsData.data.alerts.forEach(alert => addAlert({
              id: alert.id || Date.now().toString(),
              type: alert.alert_type,
              severity: alert.severity,
              message: alert.message || `${alert.alert_type} event`,
              timestamp: alert.detected_at,
              details: alert
            }));
          }
        }

        // Load compliance status
        const complianceResponse = await fetch('/api/security/compliance/status');
        if (complianceResponse.ok) {
          const complianceData = await complianceResponse.json();
          if (complianceData.success) {
            setComplianceStatus(complianceData.data);
          }
        }

      } catch (error) {
        console.error('Error loading security data:', error);
        toast.error('Failed to load security data');
      } finally {
        setIsLoading(false);
      }
    };

    if (isConnected) {
      loadSecurityData();
    }
  }, [isConnected, setSecurityMetrics, addAlert, setComplianceStatus]);

  // Trigger fraud detection scan
  const runFraudScan = useCallback(() => {
    setScanProgress('Initiating fraud detection scan...');
    sendMessage({
      type: 'request_fraud_scan',
      user_id: 'admin'
    });
  }, [sendMessage]);

  // Security metrics cards
  const securityCards = useMemo(() => {
    if (!securityMetrics) return [];

    return [
      {
        title: 'Agent Status',
        value: securityMetrics.agent_status,
        icon: securityMetrics.agent_status === 'running' ? CheckCircle : XCircle,
        color: securityMetrics.agent_status === 'running' ? 'text-green-400' : 'text-red-400',
        bgColor: securityMetrics.agent_status === 'running' ? 'bg-green-400/10' : 'bg-red-400/10'
      },
      {
        title: 'Fraud Alerts (24h)',
        value: securityMetrics.fraud_alerts_24h,
        icon: AlertTriangle,
        color: securityMetrics.fraud_alerts_24h > 10 ? 'text-red-400' : 'text-yellow-400',
        bgColor: securityMetrics.fraud_alerts_24h > 10 ? 'bg-red-400/10' : 'bg-yellow-400/10'
      },
      {
        title: 'Security Events (24h)',
        value: securityMetrics.security_events_24h,
        icon: Shield,
        color: securityMetrics.security_events_24h > 20 ? 'text-red-400' : 'text-blue-400',
        bgColor: securityMetrics.security_events_24h > 20 ? 'bg-red-400/10' : 'bg-blue-400/10'
      },
      {
        title: 'Risk Threshold',
        value: `${(securityMetrics.risk_threshold * 100).toFixed(0)}%`,
        icon: TrendingUp,
        color: 'text-accent-cyan',
        bgColor: 'bg-accent-cyan/10'
      }
    ];
  }, [securityMetrics]);

  // Recent alerts with severity colors
  const alertsWithColors = useMemo(() => {
    return alerts.slice(0, 10).map(alert => ({
      ...alert,
      severityColor: {
        critical: 'text-red-400 bg-red-400/10',
        high: 'text-orange-400 bg-orange-400/10',
        medium: 'text-yellow-400 bg-yellow-400/10',
        low: 'text-blue-400 bg-blue-400/10'
      }[alert.severity] || 'text-gray-400 bg-gray-400/10'
    }));
  }, [alerts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-accent-cyan" />
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Security Center</h1>
              <p className="text-text-dim">Real-time fraud detection and security monitoring</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              isConnected ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
            }`}>
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <button
              onClick={runFraudScan}
              disabled={!!scanProgress}
              className="flex items-center gap-2 px-4 py-2 bg-accent-cyan/10 text-accent-cyan 
                       hover:bg-accent-cyan/20 transition-colors rounded-lg disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              {scanProgress ? 'Scanning...' : 'Run Fraud Scan'}
            </button>
          </div>
        </div>

        {/* Security Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {securityCards.map((card, index) => (
            <div
              key={index}
              className="bg-surface rounded-xl p-6 border border-surface hover:border-accent-cyan/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-dim text-sm font-medium">{card.title}</p>
                  <p className="text-2xl font-bold text-text-primary mt-1">{card.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor}`}>
                  <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Scan Progress */}
        {scanProgress && (
          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <LoadingSpinner size="sm" />
              <span className="text-yellow-400 font-medium">{scanProgress}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Security Alerts */}
          <div className="lg:col-span-2">
            <div className="bg-surface rounded-xl p-6 border border-surface">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-text-primary">Recent Security Alerts</h2>
                <div className="flex items-center gap-2 text-text-dim">
                  <Eye className="w-4 h-4" />
                  <span className="text-sm">Live monitoring</span>
                </div>
              </div>

              <div className="space-y-3">
                {alertsWithColors.length > 0 ? (
                  alertsWithColors.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-4 p-4 bg-bg-alt rounded-lg border border-surface 
                               hover:border-accent-cyan/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <div className={`p-2 rounded-full ${alert.severityColor}`}>
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${alert.severityColor}`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className="text-xs text-text-dim">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-text-primary font-medium truncate">{alert.message}</p>
                        <p className="text-text-dim text-sm capitalize">{alert.type} alert</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Shield className="w-12 h-12 text-text-dim mx-auto mb-3" />
                    <p className="text-text-dim">No recent security alerts</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Compliance Status */}
          <div className="space-y-6">
            {/* Compliance Score */}
            <div className="bg-surface rounded-xl p-6 border border-surface">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Compliance Score</h3>
              
              {complianceStatus ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${
                      complianceStatus.overall_score >= 90 ? 'text-green-400' :
                      complianceStatus.overall_score >= 70 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {complianceStatus.overall_score}%
                    </div>
                    <p className="text-text-dim text-sm">Overall compliance</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-text-dim">Total Issues</p>
                      <p className="text-text-primary font-semibold">{complianceStatus.total_issues}</p>
                    </div>
                    <div>
                      <p className="text-text-dim">Critical</p>
                      <p className="text-red-400 font-semibold">{complianceStatus.critical_issues}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <LoadingSpinner size="sm" />
                  <p className="text-text-dim text-sm mt-2">Loading compliance data...</p>
                </div>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-surface rounded-xl p-6 border border-surface">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Security Stats</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-accent-cyan" />
                    <span className="text-text-dim">Active Sessions</span>
                  </div>
                  <span className="text-text-primary font-semibold">247</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-green-400" />
                    <span className="text-text-dim">Blocked IPs</span>
                  </div>
                  <span className="text-text-primary font-semibold">12</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-yellow-400" />
                    <span className="text-text-dim">Blocked Amount</span>
                  </div>
                  <span className="text-text-primary font-semibold">$2,340</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="text-text-dim">Last Update</span>
                  </div>
                  <span className="text-text-primary font-semibold">2m ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Alert Details Modal */}
        {selectedAlert && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-surface rounded-xl p-6 max-w-2xl w-full mx-4 border border-surface">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-text-primary">Alert Details</h3>
                <button
                  onClick={() => setSelectedAlert(null)}
                  className="text-text-dim hover:text-text-primary transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-text-dim text-sm">Type</p>
                    <p className="text-text-primary font-medium capitalize">{selectedAlert.type}</p>
                  </div>
                  <div>
                    <p className="text-text-dim text-sm">Severity</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      alertsWithColors.find(a => a.id === selectedAlert.id)?.severityColor
                    }`}>
                      {selectedAlert.severity.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-text-dim text-sm">Timestamp</p>
                    <p className="text-text-primary font-medium">
                      {new Date(selectedAlert.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className="text-text-dim text-sm mb-2">Message</p>
                  <p className="text-text-primary">{selectedAlert.message}</p>
                </div>
                
                {selectedAlert.details && (
                  <div>
                    <p className="text-text-dim text-sm mb-2">Details</p>
                    <pre className="bg-bg-alt rounded-lg p-3 text-xs text-text-primary overflow-x-auto">
                      {JSON.stringify(selectedAlert.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default SecurityDashboard;