// DELETED - Consolidated into AnalyticsModule.tsx
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { 
  BarChart3, 
  TrendingUp, 
  PieChart, 
  Calendar, 
  Filter,
  Download,
  Zap,
  Brain,
  Target,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  ArrowUp,
  ArrowDown,
  Minus,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Eye,
  Database,
  TrendingDown
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import { ArrayUtils } from '../../utils/array-utils';
import ErrorBoundary from '../../components/error/ErrorBoundary';

interface EnterpriseAnalytics {
  revenue: RevenueAnalytics;
  customers: CustomerAnalytics;
  products: ProductAnalytics;
  operations: OperationalAnalytics;
  forecasts: PredictiveAnalytics;
  kpis: EnterpriseKPI[];
}

interface RevenueAnalytics {
  totalRevenue: number;
  revenueGrowth: number;
  recurringRevenue: number;
  averageOrderValue: number;
  conversionRate: number;
  revenueByChannel: ChannelRevenue[];
  revenueByRegion: RegionRevenue[];
  monthlyTrend: TrendPoint[];
  profitability: ProfitabilityMetrics;
}

interface CustomerAnalytics {
  totalCustomers: number;
  newCustomers: number;
  customerGrowth: number;
  lifetimeValue: number;
  churnRate: number;
  satisfactionScore: number;
  segmentDistribution: CustomerSegment[];
  acquisitionChannels: AcquisitionChannel[];
  retentionMetrics: RetentionMetrics;
}

interface ProductAnalytics {
  totalProducts: number;
  bestSellers: ProductPerformance[];
  categoryPerformance: CategoryMetrics[];
  inventoryTurnover: number;
  profitMargins: ProfitMargin[];
  seasonalTrends: SeasonalTrend[];
  priceOptimization: PriceOptimization[];
}

interface OperationalAnalytics {
  orderFulfillmentTime: number;
  inventoryAccuracy: number;
  supplierPerformance: number;
  returnRate: number;
  operationalEfficiency: number;
  automationLevel: number;
  processMetrics: ProcessMetric[];
  resourceUtilization: ResourceMetrics;
}

interface PredictiveAnalytics {
  revenueForecast: ForecastPoint[];
  demandForecast: DemandForecast[];
  seasonalPredictions: SeasonalPrediction[];
  marketTrends: MarketTrend[];
  riskAssessments: RiskAssessment[];
  aiInsights: AIInsight[];
}

interface EnterpriseKPI {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  description: string;
  category: 'revenue' | 'operations' | 'customer' | 'product';
}

export default function EnhancedAnalyticsModule() {
  const [analytics, setAnalytics] = useState<EnterpriseAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('executive');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [refreshing, setRefreshing] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
    
    if (realTimeEnabled) {
      const interval = setInterval(fetchAnalyticsData, 30000); // 30s updates
      return () => clearInterval(interval);
    }
  }, [realTimeEnabled, dateRange, aiMode]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/analytics/enterprise', {
        params: {
          startDate: dateRange.start,
          endDate: dateRange.end,
          includeAI: aiMode,
          realTime: realTimeEnabled
        }
      });
      
      // Ensure analytics data has proper structure with safe defaults
      const safeAnalytics: EnterpriseAnalytics = {
        ...response.data,
        kpis: ArrayUtils.ensure(response.data?.kpis),
        revenue: {
          ...response.data?.revenue,
          revenueByChannel: ArrayUtils.ensure(response.data?.revenue?.revenueByChannel),
          revenueByRegion: ArrayUtils.ensure(response.data?.revenue?.revenueByRegion),
          monthlyTrend: ArrayUtils.ensure(response.data?.revenue?.monthlyTrend)
        },
        customers: {
          ...response.data?.customers,
          segmentDistribution: ArrayUtils.ensure(response.data?.customers?.segmentDistribution),
          acquisitionChannels: ArrayUtils.ensure(response.data?.customers?.acquisitionChannels)
        },
        products: {
          ...response.data?.products,
          bestSellers: ArrayUtils.ensure(response.data?.products?.bestSellers),
          categoryPerformance: ArrayUtils.ensure(response.data?.products?.categoryPerformance),
          profitMargins: ArrayUtils.ensure(response.data?.products?.profitMargins),
          seasonalTrends: ArrayUtils.ensure(response.data?.products?.seasonalTrends),
          priceOptimization: ArrayUtils.ensure(response.data?.products?.priceOptimization)
        },
        operations: {
          ...response.data?.operations,
          processMetrics: ArrayUtils.ensure(response.data?.operations?.processMetrics)
        },
        forecasts: {
          ...response.data?.forecasts,
          revenueForecast: ArrayUtils.ensure(response.data?.forecasts?.revenueForecast),
          demandForecast: ArrayUtils.ensure(response.data?.forecasts?.demandForecast),
          seasonalPredictions: ArrayUtils.ensure(response.data?.forecasts?.seasonalPredictions),
          marketTrends: ArrayUtils.ensure(response.data?.forecasts?.marketTrends),
          riskAssessments: ArrayUtils.ensure(response.data?.forecasts?.riskAssessments),
          aiInsights: ArrayUtils.ensure(response.data?.forecasts?.aiInsights)
        }
      };
      
      setAnalytics(safeAnalytics);
    } catch (error) {
      console.error('Failed to fetch enterprise analytics:', error);
      // Set a safe empty analytics structure on error
      setAnalytics({
        revenue: {
          totalRevenue: 0,
          revenueGrowth: 0,
          recurringRevenue: 0,
          averageOrderValue: 0,
          conversionRate: 0,
          revenueByChannel: [],
          revenueByRegion: [],
          monthlyTrend: [],
          profitability: {
            grossMargin: 0,
            netMargin: 0,
            operatingMargin: 0
          }
        },
        customers: {
          totalCustomers: 0,
          newCustomers: 0,
          customerGrowth: 0,
          lifetimeValue: 0,
          churnRate: 0,
          satisfactionScore: 0,
          segmentDistribution: [],
          acquisitionChannels: [],
          retentionMetrics: {
            day30: 0,
            day90: 0,
            day365: 0
          }
        },
        products: {
          totalProducts: 0,
          bestSellers: [],
          categoryPerformance: [],
          inventoryTurnover: 0,
          profitMargins: [],
          seasonalTrends: [],
          priceOptimization: []
        },
        operations: {
          orderFulfillmentTime: 0,
          inventoryAccuracy: 0,
          supplierPerformance: 0,
          returnRate: 0,
          operationalEfficiency: 0,
          automationLevel: 0,
          processMetrics: [],
          resourceUtilization: {
            warehouse: 0,
            workforce: 0,
            technology: 0
          }
        },
        forecasts: {
          revenueForecast: [],
          demandForecast: [],
          seasonalPredictions: [],
          marketTrends: [],
          riskAssessments: [],
          aiInsights: []
        },
        kpis: []
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
  };

  const exportReport = async (format: 'pdf' | 'excel' | 'powerpoint') => {
    try {
      const response = await apiClient.post('/api/analytics/export-enterprise', {
        format,
        dateRange,
        includeAI: aiMode,
        sections: ['executive', 'revenue', 'customers', 'products', 'operations', 'forecasts']
      });
      
      // Download the generated report
      const blob = new Blob([response.data], { 
        type: format === 'pdf' ? 'application/pdf' : 
              format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 
              'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `enterprise-analytics-${new Date().toISOString().split('T')[0]}.${
        format === 'excel' ? 'xlsx' : format === 'powerpoint' ? 'pptx' : 'pdf'
      }`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export analytics report:', error);
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <ArrowUp className="w-4 h-4 text-green-400" />;
      case 'down': return <ArrowDown className="w-4 h-4 text-red-400" />;
      default: return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-green-400';
      case 'good': return 'text-cyan-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64 text-red-400">
        <AlertTriangle className="w-6 h-6 mr-2" />
        Failed to load enterprise analytics
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={(error, retry) => (
        <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-400 mb-2">Analytics Module Error</h2>
            <p className="text-gray-300 mb-4">Failed to load analytics data</p>
            <Button onClick={retry} className="bg-cyan-600 hover:bg-cyan-700">
              Retry
            </Button>
          </div>
        </div>
      )}
    >
      <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <BarChart3 className="w-8 h-8 text-cyan-400" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Enterprise Analytics
              </h1>
              <p className="text-gray-400 mt-1">
                Advanced business intelligence and predictive insights
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Brain className="w-4 h-4 text-purple-400" />
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aiMode}
                  onChange={(e) => setAiMode(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">AI Insights</span>
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={realTimeEnabled}
                  onChange={(e) => setRealTimeEnabled(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Real-time</span>
              </label>
            </div>
            
            <Button 
              onClick={refreshData}
              disabled={refreshing}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            
            <Button 
              onClick={() => exportReport('powerpoint')}
              className="bg-cyan-600 hover:bg-cyan-700 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </Button>
          </div>
        </div>

        {/* Executive KPI Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {ArrayUtils.slice(analytics?.kpis, 0, 8).map((kpi) => (
            <Card key={kpi.id} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(kpi.status).replace('text-', 'bg-')}`} />
                  <h3 className="text-sm font-medium text-gray-400">{kpi.name}</h3>
                </div>
                <div className="flex items-center space-x-1">
                  {getTrendIcon(kpi.trend)}
                  <span className={`text-sm ${kpi.trend === 'up' ? 'text-green-400' : kpi.trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
                    {Math.abs(kpi.trendValue).toFixed(1)}%
                  </span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className={`text-3xl font-bold ${getStatusColor(kpi.status)}`}>
                    {kpi.value.toLocaleString()}{kpi.unit}
                  </span>
                  <Badge variant={
                    kpi.status === 'excellent' ? 'default' :
                    kpi.status === 'good' ? 'default' :
                    kpi.status === 'warning' ? 'secondary' : 'destructive'
                  }>
                    {kpi.status}
                  </Badge>
                </div>
                
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      kpi.status === 'excellent' ? 'bg-green-400' :
                      kpi.status === 'good' ? 'bg-cyan-400' :
                      kpi.status === 'warning' ? 'bg-yellow-400' : 'bg-red-400'
                    }`}
                    style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Target: {kpi.target.toLocaleString()}{kpi.unit}</span>
                  <span className={`${kpi.value >= kpi.target ? 'text-green-400' : 'text-yellow-400'}`}>
                    {((kpi.value / kpi.target) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6 mb-8">
            <TabsTrigger value="executive">Executive</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
          </TabsList>

          {/* Executive Dashboard */}
          <TabsContent value="executive">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Summary */}
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-green-400" />
                  Revenue Performance
                </h3>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Total Revenue</div>
                      <div className="text-2xl font-bold text-green-400">
                        ${analytics.revenue.totalRevenue.toLocaleString()}
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        {getTrendIcon(analytics.revenue.revenueGrowth > 0 ? 'up' : 'down')}
                        <span className={`text-sm ${analytics.revenue.revenueGrowth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {analytics.revenue.revenueGrowth.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Monthly Recurring</div>
                      <div className="text-2xl font-bold text-cyan-400">
                        ${(analytics.revenue.recurringRevenue / 12).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        {((analytics.revenue.recurringRevenue / analytics.revenue.totalRevenue) * 100).toFixed(1)}% of total
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Average Order Value</span>
                      <span className="font-semibold">${analytics.revenue.averageOrderValue.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Conversion Rate</span>
                      <span className="font-semibold">{analytics.revenue.conversionRate.toFixed(2)}%</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Gross Margin</span>
                      <span className="font-semibold text-green-400">
                        {analytics.revenue.profitability?.grossMargin?.toFixed(1) || 'N/A'}%
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Customer Metrics */}
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-cyan-400" />
                  Customer Intelligence
                </h3>
                
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Total Customers</div>
                      <div className="text-2xl font-bold text-cyan-400">
                        {analytics.customers.totalCustomers.toLocaleString()}
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        {getTrendIcon(analytics.customers.customerGrowth > 0 ? 'up' : 'down')}
                        <span className={`text-sm ${analytics.customers.customerGrowth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {analytics.customers.customerGrowth.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-800 p-4 rounded-lg">
                      <div className="text-sm text-gray-400 mb-1">Lifetime Value</div>
                      <div className="text-2xl font-bold text-purple-400">
                        ${analytics.customers.lifetimeValue.toFixed(0)}
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        per customer
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>New Customers</span>
                      <span className="font-semibold">{analytics.customers.newCustomers.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Churn Rate</span>
                      <span className={`font-semibold ${analytics.customers.churnRate < 5 ? 'text-green-400' : 'text-red-400'}`}>
                        {analytics.customers.churnRate.toFixed(2)}%
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span>Satisfaction Score</span>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{analytics.customers.satisfactionScore.toFixed(1)}/10</span>
                        <div className="w-16 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(analytics.customers.satisfactionScore / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Operational Excellence */}
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-purple-400" />
                  Operational Excellence
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Order Fulfillment</span>
                      <span className="font-semibold">{analytics.operations.orderFulfillmentTime}h avg</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-cyan-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(0, (48 - analytics.operations.orderFulfillmentTime) / 48 * 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Inventory Accuracy</span>
                      <span className="font-semibold">{analytics.operations.inventoryAccuracy.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-green-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${analytics.operations.inventoryAccuracy}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Automation Level</span>
                      <span className="font-semibold">{analytics.operations.automationLevel.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-purple-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${analytics.operations.automationLevel}%` }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Overall Efficiency</span>
                      <span className="font-semibold">{analytics.operations.operationalEfficiency.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${analytics.operations.operationalEfficiency}%` }}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Product Performance */}
              <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Package className="w-5 h-5 mr-2 text-yellow-400" />
                  Product Intelligence
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <div className="text-xs text-gray-400 mb-1">Active Products</div>
                      <div className="text-lg font-bold">{analytics.products.totalProducts.toLocaleString()}</div>
                    </div>
                    
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <div className="text-xs text-gray-400 mb-1">Inventory Turns</div>
                      <div className="text-lg font-bold">{analytics.products.inventoryTurnover.toFixed(1)}x</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-semibold mb-2">Top Performers</div>
                    <div className="space-y-2">
                      {ArrayUtils.slice(analytics?.products?.bestSellers, 0, 3).map((product, index) => (
                        <div key={product.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline">#{index + 1}</Badge>
                            <span className="text-sm truncate">{product.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-green-400">
                              ${product.revenue.toLocaleString()}
                            </div>
                            <div className="text-xs text-gray-400">
                              {product.units} units
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* AI Insights */}
          <TabsContent value="ai-insights">
            {aiMode ? (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-400/30 rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Brain className="w-6 h-6 text-purple-400" />
                    <h3 className="text-xl font-semibold text-purple-400">AI-Powered Insights</h3>
                  </div>
                  <p className="text-gray-300 mb-4">
                    Our advanced machine learning algorithms analyze patterns across all business metrics to provide actionable insights and predictions.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {ArrayUtils.slice(analytics?.forecasts?.aiInsights, 0, 6).map((insight, index) => (
                      <Card key={index} className="p-4 bg-gray-800/50 border-purple-400/20">
                        <div className="flex items-start space-x-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${
                            insight.priority === 'high' ? 'bg-red-400' :
                            insight.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                          }`} />
                          <div>
                            <h4 className="font-semibold mb-2">{insight.title}</h4>
                            <p className="text-sm text-gray-300 mb-3">{insight.description}</p>
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-xs">
                                {insight.confidence}% confident
                              </Badge>
                              <span className="text-xs text-gray-400">{insight.category}</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Predictive Charts would go here */}
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-cyan-400" />
                    Revenue Forecast (Next 6 Months)
                  </h3>
                  <div className="h-64 bg-gray-800 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                      <p className="text-gray-400">AI-powered revenue forecast chart</p>
                      <p className="text-sm text-gray-500">Integration with ML prediction models</p>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Brain className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <h3 className="text-xl font-semibold mb-2">AI Insights Disabled</h3>
                <p className="text-gray-400 mb-4">
                  Enable AI mode to access advanced machine learning insights and predictions.
                </p>
                <Button 
                  onClick={() => setAiMode(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Enable AI Insights
                </Button>
              </Card>
            )}
          </TabsContent>

          {/* Other tabs would continue with similar patterns... */}
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}

// Additional interfaces for completeness
interface ChannelRevenue {
  channel: string;
  revenue: number;
  percentage: number;
  growth: number;
}

interface RegionRevenue {
  region: string;
  revenue: number;
  percentage: number;
  growth: number;
}

interface TrendPoint {
  date: string;
  value: number;
  forecast?: boolean;
}

interface ProfitabilityMetrics {
  grossMargin: number;
  netMargin: number;
  ebitda: number;
}

interface CustomerSegment {
  segment: string;
  count: number;
  percentage: number;
  revenue: number;
}

interface AcquisitionChannel {
  channel: string;
  customers: number;
  cost: number;
  ltv: number;
  roi: number;
}

interface RetentionMetrics {
  monthlyRetention: number;
  yearlyRetention: number;
  cohortAnalysis: any[];
}

interface ProductPerformance {
  id: string;
  name: string;
  revenue: number;
  units: number;
  growth: number;
  margin: number;
}

interface CategoryMetrics {
  category: string;
  revenue: number;
  growth: number;
  margin: number;
  units: number;
}

interface ProfitMargin {
  product: string;
  margin: number;
  trend: 'up' | 'down' | 'stable';
}

interface SeasonalTrend {
  period: string;
  demand: number;
  variance: number;
}

interface PriceOptimization {
  product: string;
  currentPrice: number;
  optimizedPrice: number;
  expectedLift: number;
}

interface ProcessMetric {
  process: string;
  efficiency: number;
  automation: number;
  bottlenecks: string[];
}

interface ResourceMetrics {
  cpuUtilization: number;
  memoryUtilization: number;
  storageUtilization: number;
}

interface ForecastPoint {
  date: string;
  predicted: number;
  confidence: number;
  factors: string[];
}

interface DemandForecast {
  product: string;
  demand: number;
  confidence: number;
  seasonality: number;
}

interface SeasonalPrediction {
  season: string;
  impact: number;
  confidence: number;
  recommendations: string[];
}

interface MarketTrend {
  trend: string;
  impact: 'positive' | 'negative' | 'neutral';
  probability: number;
  timeframe: string;
}

interface RiskAssessment {
  risk: string;
  probability: number;
  impact: number;
  mitigation: string[];
}

interface AIInsight {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  confidence: number;
  category: string;
  recommendations: string[];
}