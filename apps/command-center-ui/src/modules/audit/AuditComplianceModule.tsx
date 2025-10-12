/**
 * Enterprise Audit & Compliance Module
 * 
 * Comprehensive audit logging, compliance monitoring, data governance,
 * and regulatory reporting for enterprise requirements.
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { 
  FileText, 
  Shield, 
  Calendar, 
  Download, 
  Filter,
  Search,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Activity,
  Database,
  Lock,
  Eye,
  RefreshCw
} from 'lucide-react';
import { apiClient } from '../../services/api-client';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  ipAddress: string;
  userAgent: string;
  details: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'success' | 'failure' | 'warning';
}

interface ComplianceCheck {
  id: string;
  name: string;
  description: string;
  framework: 'GDPR' | 'SOX' | 'PCI-DSS' | 'HIPAA' | 'ISO27001';
  status: 'compliant' | 'non-compliant' | 'warning' | 'unknown';
  lastCheck: string;
  nextCheck: string;
  findings: ComplianceFinding[];
}

interface ComplianceFinding {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  status: 'open' | 'in-progress' | 'resolved' | 'accepted-risk';
  assignee?: string;
  dueDate?: string;
}

interface DataRetentionPolicy {
  id: string;
  name: string;
  dataType: string;
  retentionPeriod: number;
  retentionUnit: 'days' | 'months' | 'years';
  autoDelete: boolean;
  encryptionRequired: boolean;
  status: 'active' | 'inactive' | 'pending';
}

interface AuditMetrics {
  totalLogs: number;
  criticalEvents: number;
  failedLogins: number;
  dataAccess: number;
  configChanges: number;
  complianceScore: number;
  vulnerabilities: number;
  resolvedIssues: number;
}

export default function AuditComplianceModule() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [complianceChecks, setComplianceChecks] = useState<ComplianceCheck[]>([]);
  const [retentionPolicies, setRetentionPolicies] = useState<DataRetentionPolicy[]>([]);
  const [metrics, setMetrics] = useState<AuditMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('audit-logs');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchAuditData();
  }, []);

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      const [logsResponse, complianceResponse, policiesResponse, metricsResponse] = await Promise.all([
        apiClient.get('/api/audit/logs'),
        apiClient.get('/api/compliance/checks'),
        apiClient.get('/api/audit/retention-policies'),
        apiClient.get('/api/audit/metrics')
      ]);
      
      setAuditLogs(logsResponse.data);
      setComplianceChecks(complianceResponse.data);
      setRetentionPolicies(policiesResponse.data);
      setMetrics(metricsResponse.data);
    } catch (error) {
      console.error('Failed to fetch audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportAuditReport = async (format: 'pdf' | 'csv' | 'json') => {
    try {
      setExporting(true);
      const response = await apiClient.post('/api/audit/export', {
        format,
        filters: {
          dateRange,
          severity: filterSeverity,
          searchTerm
        }
      });
      
      // Download the generated report
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 
              format === 'csv' ? 'text/csv' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-report-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export audit report:', error);
    } finally {
      setExporting(false);
    }
  };

  const runComplianceCheck = async (checkId: string) => {
    try {
      await apiClient.post(`/api/compliance/checks/${checkId}/run`);
      fetchAuditData(); // Refresh data
    } catch (error) {
      console.error('Failed to run compliance check:', error);
    }
  };

  const resolveCompliance = async (checkId: string, findingId: string) => {
    try {
      await apiClient.patch(`/api/compliance/findings/${findingId}`, {
        status: 'resolved'
      });
      fetchAuditData(); // Refresh data
    } catch (error) {
      console.error('Failed to resolve compliance finding:', error);
    }
  };

  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSeverity = filterSeverity === 'all' || log.severity === filterSeverity;
    
    const logDate = new Date(log.timestamp);
    const matchesDateRange = 
      (!dateRange.start || logDate >= new Date(dateRange.start)) &&
      (!dateRange.end || logDate <= new Date(dateRange.end));
    
    return matchesSearch && matchesSeverity && matchesDateRange;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Shield className="w-8 h-8 text-cyan-400" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Audit & Compliance
              </h1>
              <p className="text-gray-400 mt-1">
                Enterprise security monitoring and regulatory compliance
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button 
              onClick={() => exportAuditReport('pdf')}
              disabled={exporting}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF</span>
            </Button>
            <Button 
              onClick={() => exportAuditReport('csv')}
              disabled={exporting}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        {/* Metrics Overview */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
            <Card className="p-4 text-center">
              <Activity className="w-6 h-6 mx-auto mb-2 text-cyan-400" />
              <div className="text-2xl font-bold">{metrics.totalLogs.toLocaleString()}</div>
              <div className="text-xs text-gray-400">Total Events</div>
            </Card>
            <Card className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-red-400" />
              <div className="text-2xl font-bold">{metrics.criticalEvents}</div>
              <div className="text-xs text-gray-400">Critical</div>
            </Card>
            <Card className="p-4 text-center">
              <Lock className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
              <div className="text-2xl font-bold">{metrics.failedLogins}</div>
              <div className="text-xs text-gray-400">Failed Logins</div>
            </Card>
            <Card className="p-4 text-center">
              <Eye className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <div className="text-2xl font-bold">{metrics.dataAccess}</div>
              <div className="text-xs text-gray-400">Data Access</div>
            </Card>
            <Card className="p-4 text-center">
              <Database className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="text-2xl font-bold">{metrics.configChanges}</div>
              <div className="text-xs text-gray-400">Config Changes</div>
            </Card>
            <Card className="p-4 text-center">
              <Shield className="w-6 h-6 mx-auto mb-2 text-green-400" />
              <div className="text-2xl font-bold">{metrics.complianceScore}%</div>
              <div className="text-xs text-gray-400">Compliance</div>
            </Card>
            <Card className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-orange-400" />
              <div className="text-2xl font-bold">{metrics.vulnerabilities}</div>
              <div className="text-xs text-gray-400">Vulnerabilities</div>
            </Card>
            <Card className="p-4 text-center">
              <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-400" />
              <div className="text-2xl font-bold">{metrics.resolvedIssues}</div>
              <div className="text-xs text-gray-400">Resolved</div>
            </Card>
          </div>
        )}

        {/* Audit Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="audit-logs">Audit Logs</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="retention">Data Retention</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          {/* Audit Logs */}
          <TabsContent value="audit-logs">
            <Card className="p-6">
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-4 mb-6">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
                    />
                  </div>
                </div>
                
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-400"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>

                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-400"
                />
                
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-cyan-400"
                />
              </div>

              {/* Audit Log Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-3 px-4">Timestamp</th>
                      <th className="text-left py-3 px-4">User</th>
                      <th className="text-left py-3 px-4">Action</th>
                      <th className="text-left py-3 px-4">Resource</th>
                      <th className="text-left py-3 px-4">IP Address</th>
                      <th className="text-left py-3 px-4">Severity</th>
                      <th className="text-left py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span>{log.userEmail}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <code className="bg-gray-800 px-2 py-1 rounded text-xs">
                            {log.action}
                          </code>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-cyan-400">{log.resource}</span>
                          {log.resourceId && (
                            <div className="text-xs text-gray-400">#{log.resourceId}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <code className="bg-gray-800 px-2 py-1 rounded text-xs">
                            {log.ipAddress}
                          </code>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={
                            log.severity === 'critical' ? 'destructive' :
                            log.severity === 'high' ? 'destructive' :
                            log.severity === 'medium' ? 'secondary' : 'default'
                          }>
                            {log.severity}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={
                            log.status === 'success' ? 'default' :
                            log.status === 'failure' ? 'destructive' : 'secondary'
                          }>
                            {log.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Compliance */}
          <TabsContent value="compliance">
            <div className="space-y-6">
              {complianceChecks.map((check) => (
                <Card key={check.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        check.status === 'compliant' ? 'bg-green-400' :
                        check.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                      }`} />
                      <div>
                        <h3 className="text-lg font-semibold">{check.name}</h3>
                        <p className="text-sm text-gray-400">{check.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline">{check.framework}</Badge>
                      <Button
                        onClick={() => runComplianceCheck(check.id)}
                        variant="outline"
                        className="flex items-center space-x-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Run Check</span>
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <div className="text-sm text-gray-400">Status</div>
                      <Badge variant={
                        check.status === 'compliant' ? 'default' :
                        check.status === 'warning' ? 'secondary' : 'destructive'
                      }>
                        {check.status}
                      </Badge>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Last Check</div>
                      <div className="text-sm">{new Date(check.lastCheck).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Next Check</div>
                      <div className="text-sm">{new Date(check.nextCheck).toLocaleString()}</div>
                    </div>
                  </div>

                  {check.findings.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-3">Findings ({check.findings.length})</h4>
                      <div className="space-y-3">
                        {check.findings.map((finding) => (
                          <div key={finding.id} className="bg-gray-800 p-4 rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <Badge variant={
                                  finding.severity === 'critical' ? 'destructive' :
                                  finding.severity === 'high' ? 'destructive' :
                                  finding.severity === 'medium' ? 'secondary' : 'default'
                                }>
                                  {finding.severity}
                                </Badge>
                                <Badge variant="outline">{finding.status}</Badge>
                              </div>
                              
                              {finding.status === 'open' && (
                                <Button
                                  onClick={() => resolveCompliance(check.id, finding.id)}
                                  variant="ghost"
                                  className="text-green-400 hover:text-green-300"
                                >
                                  Mark Resolved
                                </Button>
                              )}
                            </div>
                            
                            <div className="text-sm mb-2">{finding.description}</div>
                            <div className="text-xs text-gray-400 mb-2">
                              <strong>Recommendation:</strong> {finding.recommendation}
                            </div>
                            
                            {finding.assignee && (
                              <div className="text-xs text-gray-400">
                                <strong>Assigned to:</strong> {finding.assignee}
                              </div>
                            )}
                            
                            {finding.dueDate && (
                              <div className="text-xs text-gray-400">
                                <strong>Due:</strong> {new Date(finding.dueDate).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Data Retention */}
          <TabsContent value="retention">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Data Retention Policies</h3>
                <Button variant="outline">Add Policy</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {retentionPolicies.map((policy) => (
                  <Card key={policy.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{policy.name}</h4>
                      <Badge variant={
                        policy.status === 'active' ? 'default' :
                        policy.status === 'pending' ? 'secondary' : 'destructive'
                      }>
                        {policy.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400">Data Type:</span>
                        <span className="ml-2">{policy.dataType}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Retention:</span>
                        <span className="ml-2">{policy.retentionPeriod} {policy.retentionUnit}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Auto Delete:</span>
                        <span className={policy.autoDelete ? 'text-green-400' : 'text-red-400'}>
                          {policy.autoDelete ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">Encryption:</span>
                        <span className={policy.encryptionRequired ? 'text-green-400' : 'text-yellow-400'}>
                          {policy.encryptionRequired ? 'Required' : 'Optional'}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-cyan-400" />
                  Compliance Reports
                </h3>
                
                <div className="space-y-3">
                  <Button 
                    onClick={() => exportAuditReport('pdf')}
                    disabled={exporting}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    SOX Compliance Report
                  </Button>
                  <Button 
                    onClick={() => exportAuditReport('pdf')}
                    disabled={exporting}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    GDPR Data Processing Report
                  </Button>
                  <Button 
                    onClick={() => exportAuditReport('pdf')}
                    disabled={exporting}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PCI-DSS Assessment
                  </Button>
                  <Button 
                    onClick={() => exportAuditReport('pdf')}
                    disabled={exporting}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    ISO 27001 Security Review
                  </Button>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-cyan-400" />
                  Audit Reports
                </h3>
                
                <div className="space-y-3">
                  <Button 
                    onClick={() => exportAuditReport('pdf')}
                    disabled={exporting}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Security Events Summary
                  </Button>
                  <Button 
                    onClick={() => exportAuditReport('csv')}
                    disabled={exporting}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    User Activity Log (CSV)
                  </Button>
                  <Button 
                    onClick={() => exportAuditReport('pdf')}
                    disabled={exporting}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Access Control Review
                  </Button>
                  <Button 
                    onClick={() => exportAuditReport('json')}
                    disabled={exporting}
                    className="w-full justify-start"
                    variant="outline"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    System Changes Log (JSON)
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}