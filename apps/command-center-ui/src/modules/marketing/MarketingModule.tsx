/*
Marketing Automation Module - Elite Command Center UI
Real-time marketing performance monitoring and campaign management
*/

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { 
  TrendingUp, 
  Mail, 
  Users, 
  DollarSign, 
  Target, 
  BarChart3,
  Zap,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Send,
  Eye,
  MousePointer,
  Heart
} from 'lucide-react';

import { useApiService } from '../../hooks/useApiService';
import { useRealTimeData } from '../../hooks/useRealTimeData';
import { ensureArray } from '../../utils/array-utils';
import { useNotifications } from '../../hooks/useNotifications';


interface MarketingMetrics {
  revenue: {
    email_attributed: number;
    social_attributed: number;
    total_attributed: number;
  };
  engagement: {
    email_open_rate: number;
    email_click_rate: number;
    social_engagement_rate: number;
  };
  campaigns: {
    active_email: number;
    total_sent: number;
    social_impressions: number;
  };
  performance: {
    roas: number;
    conversion_rate: number;
  };
}

interface CampaignRecommendation {
  type: string;
  name: string;
  target_audience: string;
  budget: number;
  timeline: string;
  expected_roi?: number;
}

interface IntegrationStatus {
  openai: boolean;
  klaviyo: boolean;
  sendgrid: boolean;
  facebook: boolean;
}

interface PerformanceAnalysis {
  revenue_attribution: Record<string, number>;
  engagement_metrics: Record<string, number>;
  campaign_performance: Record<string, number>;
  ai_insights?: any;
  recommendations?: string[];
}

export const MarketingAutomationModule: React.FC = () => {
  const [metrics, setMetrics] = useState<MarketingMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<CampaignRecommendation[]>([]);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [performanceAnalysis, setPerformanceAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [contentGeneration, setContentGeneration] = useState<any>(null);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  
  const { get: apiCall } = useApiService();
  const { addNotification } = useNotifications();
  
  // Real-time data subscription
  const realTimeMetrics = useRealTimeData({ endpoint: '/api/marketing/metrics' });
  const campaignUpdates = useRealTimeData({ endpoint: '/api/marketing/campaigns' });

  // Update metrics from real-time data
  useEffect(() => {
    if (realTimeMetrics.data) {
      setMetrics(realTimeMetrics.data);
    }
  }, [realTimeMetrics]);

  useEffect(() => {
    if (campaignUpdates.data) {
      setActiveCampaigns(prev => [...prev, campaignUpdates.data]);
    }
  }, [campaignUpdates]);

  // Initial data loading
  const loadMarketingData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load all marketing data in parallel
      const [
        metricsResponse,
        recommendationsResponse,
        integrationsResponse,
        performanceResponse,
        campaignsResponse
      ] = await Promise.all([
        apiCall('/api/marketing/metrics/real-time'),
        apiCall('/api/marketing/campaigns/recommendations'),
        apiCall('/api/marketing/integrations/test'),
        apiCall('/api/marketing/performance/analysis'),
        apiCall('/api/marketing/campaigns/active')
      ]);

      if (metricsResponse.data && !metricsResponse.error) {
        setMetrics(metricsResponse.data.metrics);
      }

      if (recommendationsResponse.data && !recommendationsResponse.error) {
        setRecommendations(ensureArray(recommendationsResponse.data.recommendations));
      }

      if (integrationsResponse.data && !integrationsResponse.error) {
        setIntegrationStatus(integrationsResponse.data.integrations);
      }

      if (performanceResponse.data && !performanceResponse.error) {
        setPerformanceAnalysis(performanceResponse.data.performance_analysis);
      }

      if (campaignsResponse.data && !campaignsResponse.error) {
        setActiveCampaigns(ensureArray(campaignsResponse.data.active_campaigns?.email));
      }

    } catch (error) {
      console.error('Failed to load marketing data:', error);
      addNotification(
        'Marketing Data Error',
        'Failed to load marketing data',
        { type: 'error', duration: 5000 }
      );
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, addNotification]);

  useEffect(() => {
    loadMarketingData();
  }, [loadMarketingData]);

  const executeMarketingAutomation = async () => {
    try {
      const response = await apiCall('/api/marketing/execute', {
        method: 'POST',
        body: JSON.stringify({ trigger: 'manual', context: 'command_center' })
      });

      if (response.data && !response.error) {
        addNotification(
          'Automation Success',
          'Marketing automation executed successfully',
          { type: 'success', duration: 3000 }
        );
        await loadMarketingData(); // Reload data
      }
    } catch (error) {
      addNotification(
        'Automation Error',
        'Failed to execute marketing automation',
        { type: 'error', duration: 5000 }
      );
    }
  };

  const generateContent = async (contentType: string, prompt: string) => {
    try {
      const response = await apiCall('/api/marketing/content/generate', {
        method: 'POST',
        body: JSON.stringify({
          content_type: contentType,
          prompt: prompt,
          tone: 'luxury',
          max_length: 500
        })
      });

      if (response.data && !response.error) {
        setContentGeneration(response.data.content);
        addNotification(
          'Content Generated',
          'Content generated successfully',
          { type: 'success', duration: 3000 }
        );
      }
    } catch (error) {
      addNotification(
        'Content Generation Error',
        'Content generation failed',
        { type: 'error', duration: 5000 }
      );
    }
  };

  const createCampaign = async (campaignData: any) => {
    try {
      const response = await apiCall('/api/marketing/campaigns/create', {
        method: 'POST',
        body: JSON.stringify(campaignData)
      });

      if (response.data && !response.error) {
        addNotification(
          'Campaign Created',
          'Campaign created successfully',
          { type: 'success', duration: 3000 }
        );
        await loadMarketingData(); // Reload data
      }
    } catch (error) {
      addNotification(
        'Campaign Creation Error',
        'Campaign creation failed',
        { type: 'error', duration: 5000 }
      );
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center space-x-3">
          <RefreshCw className="h-5 w-5 animate-spin text-accent-cyan" />
          <span className="text-text-dim">Loading marketing intelligence...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Marketing Automation Command Center
          </h1>
          <p className="text-text-dim">
            AI-powered marketing automation with real-time performance tracking
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button
            onClick={executeMarketingAutomation}
            className="bg-gradient-to-r from-accent-magenta to-accent-cyan"
          >
            <Zap className="h-4 w-4 mr-2" />
            Execute Automation
          </Button>
          <Button
            variant="outline"
            onClick={loadMarketingData}
            className="border-accent-cyan text-accent-cyan hover:bg-accent-cyan hover:text-bg"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Integration Status */}
      <Card className="bg-surface border-accent-cyan/20">
        <CardHeader>
          <CardTitle className="flex items-center text-text-primary">
            <Target className="h-5 w-5 mr-2 text-accent-cyan" />
            Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(integrationStatus || {}).map(([service, connected]) => (
              <div key={service} className="flex items-center space-x-2">
                {connected ? (
                  <CheckCircle className="h-4 w-4 text-accent-green" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-accent-magenta" />
                )}
                <span className={`text-sm ${connected ? 'text-accent-green' : 'text-accent-magenta'}`}>
                  {service.charAt(0).toUpperCase() + service.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-surface border-accent-green/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-dim">Total Revenue</p>
                <p className="text-2xl font-bold text-accent-green">
                  {formatCurrency(metrics?.revenue?.total_attributed || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-accent-green" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-accent-cyan/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-dim">Email Open Rate</p>
                <p className="text-2xl font-bold text-accent-cyan">
                  {formatPercentage(metrics?.engagement?.email_open_rate || 0)}
                </p>
              </div>
              <Eye className="h-8 w-8 text-accent-cyan" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-accent-magenta/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-dim">Click Rate</p>
                <p className="text-2xl font-bold text-accent-magenta">
                  {formatPercentage(metrics?.engagement?.email_click_rate || 0)}
                </p>
              </div>
              <MousePointer className="h-8 w-8 text-accent-magenta" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-surface border-accent-green/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-dim">ROAS</p>
                <p className="text-2xl font-bold text-accent-green">
                  {(metrics?.performance?.roas || 0).toFixed(1)}x
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-accent-green" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-surface">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="content">Content AI</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Revenue Attribution */}
          <Card className="bg-surface border-accent-cyan/20">
            <CardHeader>
              <CardTitle className="text-text-primary">Revenue Attribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-cyan">
                    {formatCurrency(metrics?.revenue?.email_attributed || 0)}
                  </div>
                  <div className="text-sm text-text-dim">Email Marketing</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-magenta">
                    {formatCurrency(metrics?.revenue?.social_attributed || 0)}
                  </div>
                  <div className="text-sm text-text-dim">Social Media</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent-green">
                    {formatCurrency(metrics?.revenue?.total_attributed || 0)}
                  </div>
                  <div className="text-sm text-text-dim">Total Attributed</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Recommendations */}
          <Card className="bg-surface border-accent-magenta/20">
            <CardHeader>
              <CardTitle className="flex items-center text-text-primary">
                <Zap className="h-5 w-5 mr-2 text-accent-magenta" />
                AI Campaign Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.map((rec, index) => (
                  <div key={index} className="p-4 border border-accent-cyan/20 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-text-primary">{rec.name}</h4>
                      <Badge variant="outline" className="border-accent-cyan text-accent-cyan">
                        {rec.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-dim mb-2">
                      Target: {rec.target_audience} | Budget: {formatCurrency(rec.budget)}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-text-dim">{rec.timeline}</span>
                      <Button
                        size="sm"
                        onClick={() => createCampaign(rec)}
                        className="bg-accent-magenta hover:bg-accent-magenta/80"
                      >
                        Create Campaign
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          {/* Active Campaigns */}
          <Card className="bg-surface border-accent-cyan/20">
            <CardHeader>
              <CardTitle className="flex items-center text-text-primary">
                <Mail className="h-5 w-5 mr-2 text-accent-cyan" />
                Active Campaigns ({activeCampaigns.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeCampaigns.length > 0 ? (
                  activeCampaigns.map((campaign, index) => (
                    <div key={index} className="p-4 border border-accent-green/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-text-primary">{campaign.name || `Campaign ${index + 1}`}</h4>
                          <p className="text-sm text-text-dim">Status: {campaign.status || 'Active'}</p>
                        </div>
                        <Badge variant="outline" className="border-accent-green text-accent-green">
                          Running
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-text-dim">
                    No active campaigns found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Campaign Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-surface border-accent-cyan/20">
              <CardContent className="p-6 text-center">
                <Send className="h-8 w-8 text-accent-cyan mx-auto mb-2" />
                <div className="text-2xl font-bold text-text-primary">
                  {metrics?.campaigns?.total_sent?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-text-dim">Emails Sent</div>
              </CardContent>
            </Card>

            <Card className="bg-surface border-accent-magenta/20">
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 text-accent-magenta mx-auto mb-2" />
                <div className="text-2xl font-bold text-text-primary">
                  {metrics?.campaigns?.social_impressions?.toLocaleString() || 0}
                </div>
                <div className="text-sm text-text-dim">Social Impressions</div>
              </CardContent>
            </Card>

            <Card className="bg-surface border-accent-green/20">
              <CardContent className="p-6 text-center">
                <Heart className="h-8 w-8 text-accent-green mx-auto mb-2" />
                <div className="text-2xl font-bold text-text-primary">
                  {formatPercentage(metrics?.engagement?.social_engagement_rate || 0)}
                </div>
                <div className="text-sm text-text-dim">Social Engagement</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          {/* Content Generation */}
          <Card className="bg-surface border-accent-magenta/20">
            <CardHeader>
              <CardTitle className="flex items-center text-text-primary">
                <Zap className="h-5 w-5 mr-2 text-accent-magenta" />
                AI Content Generation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => generateContent('email_subject', 'Create compelling email subject lines for luxury products')}
                  className="bg-accent-cyan hover:bg-accent-cyan/80 p-6 h-auto flex-col"
                >
                  <Mail className="h-6 w-6 mb-2" />
                  Generate Email Subjects
                </Button>
                
                <Button
                  onClick={() => generateContent('social_post', 'Create engaging social media posts for product launch')}
                  className="bg-accent-magenta hover:bg-accent-magenta/80 p-6 h-auto flex-col"
                >
                  <Users className="h-6 w-6 mb-2" />
                  Generate Social Posts
                </Button>
              </div>

              {contentGeneration && (
                <div className="mt-6 p-4 border border-accent-cyan/20 rounded-lg">
                  <h4 className="font-semibold text-text-primary mb-2">Generated Content:</h4>
                  <div className="text-sm text-text-dim whitespace-pre-wrap">
                    {contentGeneration.content}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Performance Analysis */}
          <Card className="bg-surface border-accent-cyan/20">
            <CardHeader>
              <CardTitle className="flex items-center text-text-primary">
                <BarChart3 className="h-5 w-5 mr-2 text-accent-cyan" />
                Performance Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {performanceAnalysis ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-text-primary mb-3">Revenue Attribution</h4>
                      <div className="space-y-2">
                        {Object.entries(performanceAnalysis.revenue_attribution || {}).map(([channel, value]) => (
                          <div key={channel} className="flex justify-between">
                            <span className="text-text-dim capitalize">{channel.replace('_', ' ')}</span>
                            <span className="text-text-primary font-semibold">{formatCurrency(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-text-primary mb-3">Engagement Metrics</h4>
                      <div className="space-y-2">
                        {Object.entries(performanceAnalysis.engagement_metrics || {}).map(([metric, value]) => (
                          <div key={metric} className="flex justify-between">
                            <span className="text-text-dim capitalize">{metric.replace('_', ' ')}</span>
                            <span className="text-text-primary font-semibold">{formatPercentage(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {performanceAnalysis.recommendations && (
                    <div>
                      <h4 className="font-semibold text-text-primary mb-3">AI Recommendations</h4>
                      <div className="space-y-2">
                        {performanceAnalysis.recommendations.map((rec, index) => (
                          <div key={index} className="flex items-start space-x-2">
                            <Zap className="h-4 w-4 text-accent-magenta mt-0.5" />
                            <span className="text-text-dim text-sm">{rec}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-text-dim">
                  Loading performance analytics...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MarketingAutomationModule;