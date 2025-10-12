/**
 * Enterprise Settings Module
 * 
 * Comprehensive system configuration, user management, security settings,
 * API configurations, and enterprise-grade preferences management.
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { 
  Settings, 
  Shield, 
  Key, 
  Database, 
  Bell, 
  Users, 
  Globe, 
  Lock,
  Server,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Save,
  Eye,
  EyeOff
} from 'lucide-react';
import { apiClient } from '../../services/api-client';

interface SystemSettings {
  apiConfig: APIConfig;
  securitySettings: SecuritySettings;
  notificationSettings: NotificationSettings;
  userPreferences: UserPreferences;
  systemHealth: SystemHealth;
  integrationStatus: IntegrationStatus;
}

interface APIConfig {
  shopifyEndpoint: string;
  shopifyApiKey: string;
  autodsApiKey: string;
  spocketApiKey: string;
  stripeApiKey: string;
  rateLimitEnabled: boolean;
  requestTimeout: number;
  retryAttempts: number;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  ipWhitelist: string[];
  apiKeyRotation: boolean;
  encryptionLevel: 'AES-128' | 'AES-256';
  auditLogging: boolean;
}

interface NotificationSettings {
  emailAlerts: boolean;
  slackWebhook: string;
  alertThresholds: {
    revenue: number;
    inventory: number;
    orderVolume: number;
    errorRate: number;
  };
  escalationRules: EscalationRule[];
}

interface EscalationRule {
  id: string;
  condition: string;
  threshold: number;
  action: 'email' | 'slack' | 'sms' | 'webhook';
  recipients: string[];
}

interface UserPreferences {
  theme: 'dark' | 'light' | 'auto';
  language: string;
  timezone: string;
  dashboardLayout: string;
  defaultModule: string;
  autoRefresh: boolean;
  refreshInterval: number;
}

interface SystemHealth {
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  activeConnections: number;
  requestsPerSecond: number;
}

interface IntegrationStatus {
  shopify: IntegrationHealth;
  autods: IntegrationHealth;
  spocket: IntegrationHealth;
  stripe: IntegrationHealth;
  aira: IntegrationHealth;
}

interface IntegrationHealth {
  connected: boolean;
  lastSync: string;
  status: 'healthy' | 'warning' | 'error';
  latency: number;
  errorRate: number;
}

export default function SettingsModule() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/settings/system');
      setSettings(response.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      await apiClient.put('/api/settings/system', settings);
      
      // Refresh system configuration
      await apiClient.post('/api/system/reload-config');
      
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async (integration: keyof IntegrationStatus) => {
    try {
      setTestingConnection(integration);
      const response = await apiClient.post(`/api/integrations/${integration}/test`);
      
      if (settings) {
        setSettings({
          ...settings,
          integrationStatus: {
            ...settings.integrationStatus,
            [integration]: {
              ...settings.integrationStatus[integration],
              connected: response.data.success,
              status: response.data.success ? 'healthy' : 'error',
              latency: response.data.latency
            }
          }
        });
      }
    } catch (error) {
      console.error(`Failed to test ${integration} connection:`, error);
    } finally {
      setTestingConnection(null);
    }
  };

  const rotateApiKey = async (service: string) => {
    try {
      const response = await apiClient.post(`/api/security/rotate-key/${service}`);
      
      if (settings && response.data.newKey) {
        setSettings({
          ...settings,
          apiConfig: {
            ...settings.apiConfig,
            [`${service}ApiKey`]: response.data.newKey
          }
        });
      }
    } catch (error) {
      console.error(`Failed to rotate ${service} API key:`, error);
    }
  };

  const addEscalationRule = () => {
    if (!settings) return;
    
    const newRule: EscalationRule = {
      id: `rule_${Date.now()}`,
      condition: 'error_rate',
      threshold: 5,
      action: 'email',
      recipients: []
    };

    setSettings({
      ...settings,
      notificationSettings: {
        ...settings.notificationSettings,
        escalationRules: [...settings.notificationSettings.escalationRules, newRule]
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        <AlertTriangle className="w-6 h-6 mr-2" />
        Failed to load settings
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Settings className="w-8 h-8 text-cyan-400" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Enterprise Settings
              </h1>
              <p className="text-gray-400 mt-1">
                System configuration and enterprise management
              </p>
            </div>
          </div>
          
          <Button 
            onClick={saveSettings}
            disabled={saving}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="api">API Config</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Alerts</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-cyan-400" />
                  User Preferences
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Theme</label>
                    <select 
                      value={settings.userPreferences.theme}
                      onChange={(e) => setSettings({
                        ...settings,
                        userPreferences: {
                          ...settings.userPreferences,
                          theme: e.target.value as 'dark' | 'light' | 'auto'
                        }
                      })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Default Module</label>
                    <select 
                      value={settings.userPreferences.defaultModule}
                      onChange={(e) => setSettings({
                        ...settings,
                        userPreferences: {
                          ...settings.userPreferences,
                          defaultModule: e.target.value
                        }
                      })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                    >
                      <option value="dashboard">Dashboard</option>
                      <option value="revenue">Revenue</option>
                      <option value="inventory">Inventory</option>
                      <option value="agents">Agents</option>
                      <option value="aira">AIRA</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span>Auto Refresh</span>
                    <input
                      type="checkbox"
                      checked={settings.userPreferences.autoRefresh}
                      onChange={(e) => setSettings({
                        ...settings,
                        userPreferences: {
                          ...settings.userPreferences,
                          autoRefresh: e.target.checked
                        }
                      })}
                      className="w-4 h-4"
                    />
                  </div>

                  {settings.userPreferences.autoRefresh && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Refresh Interval (seconds)
                      </label>
                      <input
                        type="number"
                        value={settings.userPreferences.refreshInterval}
                        onChange={(e) => setSettings({
                          ...settings,
                          userPreferences: {
                            ...settings.userPreferences,
                            refreshInterval: parseInt(e.target.value)
                          }
                        })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                        min="5"
                        max="300"
                      />
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-cyan-400" />
                  Localization
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Language</label>
                    <select 
                      value={settings.userPreferences.language}
                      onChange={(e) => setSettings({
                        ...settings,
                        userPreferences: {
                          ...settings.userPreferences,
                          language: e.target.value
                        }
                      })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                      <option value="nl">Dutch</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Timezone</label>
                    <select 
                      value={settings.userPreferences.timezone}
                      onChange={(e) => setSettings({
                        ...settings,
                        userPreferences: {
                          ...settings.userPreferences,
                          timezone: e.target.value
                        }
                      })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London</option>
                      <option value="Europe/Amsterdam">Amsterdam</option>
                    </select>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* API Configuration */}
          <TabsContent value="api">
            <div className="space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold flex items-center">
                    <Key className="w-5 h-5 mr-2 text-cyan-400" />
                    API Configuration
                  </h3>
                  <Button
                    onClick={() => setShowApiKeys(!showApiKeys)}
                    variant="outline"
                    className="flex items-center space-x-2"
                  >
                    {showApiKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    <span>{showApiKeys ? 'Hide' : 'Show'} Keys</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Shopify API Key</label>
                      <div className="flex space-x-2">
                        <input
                          type={showApiKeys ? "text" : "password"}
                          value={settings.apiConfig.shopifyApiKey}
                          onChange={(e) => setSettings({
                            ...settings,
                            apiConfig: {
                              ...settings.apiConfig,
                              shopifyApiKey: e.target.value
                            }
                          })}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                        />
                        <Button
                          onClick={() => rotateApiKey('shopify')}
                          variant="outline"
                          className="px-3"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">AutoDS API Key</label>
                      <div className="flex space-x-2">
                        <input
                          type={showApiKeys ? "text" : "password"}
                          value={settings.apiConfig.autodsApiKey}
                          onChange={(e) => setSettings({
                            ...settings,
                            apiConfig: {
                              ...settings.apiConfig,
                              autodsApiKey: e.target.value
                            }
                          })}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                        />
                        <Button
                          onClick={() => rotateApiKey('autods')}
                          variant="outline"
                          className="px-3"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Spocket API Key</label>
                      <div className="flex space-x-2">
                        <input
                          type={showApiKeys ? "text" : "password"}
                          value={settings.apiConfig.spocketApiKey}
                          onChange={(e) => setSettings({
                            ...settings,
                            apiConfig: {
                              ...settings.apiConfig,
                              spocketApiKey: e.target.value
                            }
                          })}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                        />
                        <Button
                          onClick={() => rotateApiKey('spocket')}
                          variant="outline"
                          className="px-3"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Request Timeout (ms)</label>
                      <input
                        type="number"
                        value={settings.apiConfig.requestTimeout}
                        onChange={(e) => setSettings({
                          ...settings,
                          apiConfig: {
                            ...settings.apiConfig,
                            requestTimeout: parseInt(e.target.value)
                          }
                        })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                        min="1000"
                        max="30000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Retry Attempts</label>
                      <input
                        type="number"
                        value={settings.apiConfig.retryAttempts}
                        onChange={(e) => setSettings({
                          ...settings,
                          apiConfig: {
                            ...settings.apiConfig,
                            retryAttempts: parseInt(e.target.value)
                          }
                        })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                        min="0"
                        max="5"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Rate Limiting</span>
                      <input
                        type="checkbox"
                        checked={settings.apiConfig.rateLimitEnabled}
                        onChange={(e) => setSettings({
                          ...settings,
                          apiConfig: {
                            ...settings.apiConfig,
                            rateLimitEnabled: e.target.checked
                          }
                        })}
                        className="w-4 h-4"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2 text-cyan-400" />
                  Security Configuration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Two-Factor Authentication</span>
                      <input
                        type="checkbox"
                        checked={settings.securitySettings.twoFactorEnabled}
                        onChange={(e) => setSettings({
                          ...settings,
                          securitySettings: {
                            ...settings.securitySettings,
                            twoFactorEnabled: e.target.checked
                          }
                        })}
                        className="w-4 h-4"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Session Timeout (minutes)</label>
                      <input
                        type="number"
                        value={settings.securitySettings.sessionTimeout}
                        onChange={(e) => setSettings({
                          ...settings,
                          securitySettings: {
                            ...settings.securitySettings,
                            sessionTimeout: parseInt(e.target.value)
                          }
                        })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                        min="5"
                        max="1440"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Encryption Level</label>
                      <select 
                        value={settings.securitySettings.encryptionLevel}
                        onChange={(e) => setSettings({
                          ...settings,
                          securitySettings: {
                            ...settings.securitySettings,
                            encryptionLevel: e.target.value as 'AES-128' | 'AES-256'
                          }
                        })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                      >
                        <option value="AES-128">AES-128</option>
                        <option value="AES-256">AES-256</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>API Key Auto-Rotation</span>
                      <input
                        type="checkbox"
                        checked={settings.securitySettings.apiKeyRotation}
                        onChange={(e) => setSettings({
                          ...settings,
                          securitySettings: {
                            ...settings.securitySettings,
                            apiKeyRotation: e.target.checked
                          }
                        })}
                        className="w-4 h-4"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span>Audit Logging</span>
                      <input
                        type="checkbox"
                        checked={settings.securitySettings.auditLogging}
                        onChange={(e) => setSettings({
                          ...settings,
                          securitySettings: {
                            ...settings.securitySettings,
                            auditLogging: e.target.checked
                          }
                        })}
                        className="w-4 h-4"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">IP Whitelist</label>
                      <textarea
                        value={settings.securitySettings.ipWhitelist.join('\n')}
                        onChange={(e) => setSettings({
                          ...settings,
                          securitySettings: {
                            ...settings.securitySettings,
                            ipWhitelist: e.target.value.split('\n').filter(ip => ip.trim())
                          }
                        })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 h-24"
                        placeholder="Enter IP addresses, one per line"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Bell className="w-5 h-5 mr-2 text-cyan-400" />
                  Alert Configuration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Email Alerts</span>
                      <input
                        type="checkbox"
                        checked={settings.notificationSettings.emailAlerts}
                        onChange={(e) => setSettings({
                          ...settings,
                          notificationSettings: {
                            ...settings.notificationSettings,
                            emailAlerts: e.target.checked
                          }
                        })}
                        className="w-4 h-4"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Slack Webhook URL</label>
                      <input
                        type="url"
                        value={settings.notificationSettings.slackWebhook}
                        onChange={(e) => setSettings({
                          ...settings,
                          notificationSettings: {
                            ...settings.notificationSettings,
                            slackWebhook: e.target.value
                          }
                        })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                        placeholder="https://hooks.slack.com/..."
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-cyan-400">Alert Thresholds</h4>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Revenue Drop (%)</label>
                      <input
                        type="number"
                        value={settings.notificationSettings.alertThresholds.revenue}
                        onChange={(e) => setSettings({
                          ...settings,
                          notificationSettings: {
                            ...settings.notificationSettings,
                            alertThresholds: {
                              ...settings.notificationSettings.alertThresholds,
                              revenue: parseFloat(e.target.value)
                            }
                          }
                        })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Low Inventory (units)</label>
                      <input
                        type="number"
                        value={settings.notificationSettings.alertThresholds.inventory}
                        onChange={(e) => setSettings({
                          ...settings,
                          notificationSettings: {
                            ...settings.notificationSettings,
                            alertThresholds: {
                              ...settings.notificationSettings.alertThresholds,
                              inventory: parseInt(e.target.value)
                            }
                          }
                        })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Error Rate (%)</label>
                      <input
                        type="number"
                        value={settings.notificationSettings.alertThresholds.errorRate}
                        onChange={(e) => setSettings({
                          ...settings,
                          notificationSettings: {
                            ...settings.notificationSettings,
                            alertThresholds: {
                              ...settings.notificationSettings.alertThresholds,
                              errorRate: parseFloat(e.target.value)
                            }
                          }
                        })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2"
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-cyan-400">Escalation Rules</h4>
                    <Button onClick={addEscalationRule} variant="outline">
                      Add Rule
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {settings.notificationSettings.escalationRules.map((rule) => (
                      <div key={rule.id} className="bg-gray-800 p-4 rounded-lg flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <span className="text-sm">{rule.condition}</span>
                          <Badge variant="outline">{rule.action}</Badge>
                          <span className="text-sm text-gray-400">threshold: {rule.threshold}</span>
                        </div>
                        <Button
                          onClick={() => setSettings({
                            ...settings,
                            notificationSettings: {
                              ...settings.notificationSettings,
                              escalationRules: settings.notificationSettings.escalationRules.filter(r => r.id !== rule.id)
                            }
                          })}
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Integrations */}
          <TabsContent value="integrations">
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Database className="w-5 h-5 mr-2 text-cyan-400" />
                  Integration Status
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(settings.integrationStatus).map(([key, integration]) => (
                    <Card key={key} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold capitalize">{key}</h4>
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            integration.status === 'healthy' ? 'bg-green-400' :
                            integration.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                          }`} />
                          <Badge variant={
                            integration.status === 'healthy' ? 'default' :
                            integration.status === 'warning' ? 'secondary' : 'destructive'
                          }>
                            {integration.status}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Connected:</span>
                          <span className={integration.connected ? 'text-green-400' : 'text-red-400'}>
                            {integration.connected ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Latency:</span>
                          <span>{integration.latency}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Error Rate:</span>
                          <span>{integration.errorRate.toFixed(2)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last Sync:</span>
                          <span>{new Date(integration.lastSync).toLocaleString()}</span>
                        </div>
                      </div>

                      <Button
                        onClick={() => testConnection(key as keyof IntegrationStatus)}
                        disabled={testingConnection === key}
                        className="w-full mt-4"
                        variant="outline"
                      >
                        {testingConnection === key ? (
                          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Test Connection
                      </Button>
                    </Card>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* System Health */}
          <TabsContent value="system">
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Server className="w-5 h-5 mr-2 text-cyan-400" />
                  System Health
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Uptime</div>
                      <div className="text-2xl font-bold text-green-400">
                        {Math.floor(settings.systemHealth.uptime / 3600)}h {Math.floor((settings.systemHealth.uptime % 3600) / 60)}m
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">CPU Usage</div>
                      <div className="text-2xl font-bold">
                        {settings.systemHealth.cpuUsage.toFixed(1)}%
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                        <div 
                          className="bg-cyan-400 h-2 rounded-full"
                          style={{ width: `${settings.systemHealth.cpuUsage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Memory Usage</div>
                      <div className="text-2xl font-bold">
                        {settings.systemHealth.memoryUsage.toFixed(1)}%
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                        <div 
                          className="bg-purple-400 h-2 rounded-full"
                          style={{ width: `${settings.systemHealth.memoryUsage}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Disk Usage</div>
                      <div className="text-2xl font-bold">
                        {settings.systemHealth.diskUsage.toFixed(1)}%
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{ width: `${settings.systemHealth.diskUsage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Active Connections</div>
                      <div className="text-2xl font-bold text-cyan-400">
                        {settings.systemHealth.activeConnections}
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Requests/Second</div>
                      <div className="text-2xl font-bold text-green-400">
                        {settings.systemHealth.requestsPerSecond.toFixed(1)}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}