/**
 * Shopify Integration Module - Direct Command Center Integration
 * 
 * Real-time Shopify automation with direct API connections:
 * - Live product management and inventory sync
 * - Automated order processing with production agents
 * - Real-time analytics and performance metrics
 * - Direct database storage with Supabase auto-schema
 * - AI-powered business automation
 */

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { ensureArray } from '../../utils/array-utils';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  Shield,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Brain,
  Database,
  Link,
  Settings,
  BarChart3,
  Truck,
  Bell,
  Target
} from 'lucide-react';
import { apiClient } from '../../services/api-client';
import ErrorBoundary from '../../components/error/ErrorBoundary';

interface ShopifyStore {
  id: string;
  name: string;
  domain: string;
  email: string;
  plan: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  lastSync: string;
  currency: string;
  timezone: string;
}

interface ShopifyMetrics {
  totalProducts: number;
  totalOrders: number;
  totalCustomers: number;
  totalRevenue: number;
  inventoryValue: number;
  lowStockItems: number;
  recentOrders: Order[];
  topProducts: Product[];
  customerInsights: CustomerMetrics;
}

interface Product {
  id: string;
  title: string;
  handle: string;
  status: string;
  totalInventory: number;
  price: string;
  images: string[];
  variants: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

interface ProductVariant {
  id: string;
  title: string;
  price: string;
  sku: string;
  inventoryQuantity: number;
  availableForSale: boolean;
}

interface Order {
  id: string;
  orderNumber: string;
  totalPrice: string;
  displayFinancialStatus: string;
  displayFulfillmentStatus: string;
  customerEmail: string;
  createdAt: string;
  lineItems: OrderLineItem[];
}

interface OrderLineItem {
  productId: string;
  title: string;
  quantity: number;
  price: string;
}

interface CustomerMetrics {
  totalCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  averageOrderValue: number;
  lifetimeValue: number;
}

interface AutomationAgent {
  id: string;
  name: string;
  type: 'inventory' | 'orders' | 'marketing' | 'analytics' | 'pricing';
  status: 'active' | 'inactive' | 'processing' | 'error';
  lastRun: string;
  tasksCompleted: number;
  performance: number;
}

export default function ShopifyModule() {
  const [store, setStore] = useState<ShopifyStore | null>(null);
  const [metrics, setMetrics] = useState<ShopifyMetrics | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<AutomationAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    initializeShopifyModule();
    
    // Real-time updates every 30 seconds
    const interval = setInterval(fetchShopifyData, 30000);
    return () => clearInterval(interval);
  }, []);

  const initializeShopifyModule = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchStoreInfo(),
        fetchShopifyData(),
        fetchAutomationAgents()
      ]);
    } catch (error) {
      console.error('Failed to initialize Shopify module:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStoreInfo = async () => {
    try {
      const response = await apiClient.get('/shopify/status');
      setStore(response.data.store);
    } catch (error) {
      console.error('Failed to fetch store info:', error);
      setStore(null);
    }
  };

  const fetchShopifyData = async () => {
    try {
      const [metricsResponse, productsResponse, ordersResponse] = await Promise.all([
        apiClient.get('/shopify/metrics'),
        apiClient.get('/shopify/products', { params: { limit: 50 } }),
        apiClient.get('/shopify/orders', { params: { limit: 20 } })
      ]);

      setMetrics(metricsResponse.data);
      setProducts(ensureArray(productsResponse.data?.products));
      setOrders(ensureArray(ordersResponse.data?.orders));
    } catch (error) {
      console.error('Failed to fetch Shopify data:', error);
    }
  };

  const fetchAutomationAgents = async () => {
    try {
      const response = await apiClient.get('/agents/shopify');
      setAgents(ensureArray(response.data?.agents));
    } catch (error) {
      console.error('Failed to fetch automation agents:', error);
      setAgents([]);
    }
  };

  const syncShopifyData = async () => {
    try {
      setSyncing(true);
      await apiClient.post('/shopify/sync');
      await fetchShopifyData();
    } catch (error) {
      console.error('Failed to sync Shopify data:', error);
    } finally {
      setSyncing(false);
    }
  };

  const toggleAgent = async (agentId: string) => {
    try {
      await apiClient.post(`/agents/shopify/${agentId}/toggle`);
      await fetchAutomationAgents();
    } catch (error) {
      console.error('Failed to toggle agent:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return 'text-green-400';
      case 'syncing':
      case 'processing':
        return 'text-yellow-400';
      case 'disconnected':
      case 'inactive':
        return 'text-gray-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'syncing':
      case 'processing':
        return <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />;
      case 'disconnected':
      case 'inactive':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-cyan-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-300">Loading Shopify Integration...</h2>
          <p className="text-gray-400">Connecting to store and automation agents</p>
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-400 mb-2">Shopify Not Connected</h2>
          <p className="text-gray-300 mb-6">Connect your Shopify store to enable automation</p>
          <Button className="bg-green-600 hover:bg-green-700">
            <Link className="w-4 h-4 mr-2" />
            Connect Shopify Store
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      fallback={(error, retry) => (
        <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-400 mb-2">Shopify Module Error</h2>
            <p className="text-gray-300 mb-4">{error.message}</p>
            <Button onClick={retry} className="bg-cyan-600 hover:bg-cyan-700">
              Retry
            </Button>
          </div>
        </div>
      )}
    >
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header with Store Info */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <ShoppingCart className="w-8 h-8 text-green-400" />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
                  {store.name}
                </h1>
                <p className="text-gray-400 mt-1">
                  {store.domain} • {store.plan} Plan • {getStatusColor(store.status)}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {getStatusIcon(store.status)}
                <span className={`text-sm ${getStatusColor(store.status)}`}>
                  {store.status}
                </span>
              </div>
              
              <Button 
                onClick={syncShopifyData}
                disabled={syncing}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                <span>Sync Data</span>
              </Button>

              <Button className="bg-green-600 hover:bg-green-700">
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
            </div>
          </div>

          {/* Key Metrics */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <Package className="w-8 h-8 text-blue-400" />
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {metrics.totalProducts.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">Products</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <ShoppingCart className="w-8 h-8 text-purple-400" />
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {metrics.totalOrders.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">Orders</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <Users className="w-8 h-8 text-cyan-400" />
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {metrics.totalCustomers.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">Customers</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-8 h-8 text-green-400" />
                  <div>
                    <div className="text-2xl font-bold text-white">
                      ${metrics.totalRevenue.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">Revenue</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <Database className="w-8 h-8 text-orange-400" />
                  <div>
                    <div className="text-2xl font-bold text-white">
                      ${metrics.inventoryValue.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">Inventory</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-8 h-8 text-yellow-400" />
                  <div>
                    <div className="text-2xl font-bold text-white">
                      {metrics.lowStockItems}
                    </div>
                    <div className="text-sm text-gray-400">Low Stock</div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 mb-8">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="automation">Automation</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Orders */}
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-6 flex items-center">
                    <Truck className="w-5 h-5 mr-2 text-purple-400" />
                    Recent Orders
                  </h3>
                  
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div className="flex-1">
                          <div className="font-semibold text-white">#{order.orderNumber}</div>
                          <div className="text-sm text-gray-400">{order.customerEmail}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-400">{order.totalPrice}</div>
                          <div className="text-xs text-gray-400">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Top Products */}
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-6 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-green-400" />
                    Top Products
                  </h3>
                  
                  <div className="space-y-3">
                    {products.slice(0, 5).map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {product.images.length > 0 && (
                            <img 
                              src={product.images[0]} 
                              alt={product.title}
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <div>
                            <div className="font-semibold text-white">{product.title}</div>
                            <div className="text-sm text-gray-400">
                              Stock: {product.totalInventory}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-cyan-400">{product.price}</div>
                          <Badge variant={product.status === 'active' ? 'default' : 'secondary'}>
                            {product.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Automation Tab */}
            <TabsContent value="automation">
              <div className="space-y-6">
                <Card className="p-6">
                  <h3 className="text-xl font-semibold mb-6 flex items-center">
                    <Brain className="w-5 h-5 mr-2 text-purple-400" />
                    AI Automation Agents
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {agents.map((agent) => (
                      <Card key={agent.id} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            <span className="font-semibold">{agent.name}</span>
                          </div>
                          {getStatusIcon(agent.status)}
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Type:</span>
                            <Badge variant="outline">{agent.type}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Tasks:</span>
                            <span className="text-cyan-400">{agent.tasksCompleted}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Performance:</span>
                            <span className="text-green-400">{agent.performance}%</span>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={() => toggleAgent(agent.id)}
                          className="w-full mt-3"
                          variant={agent.status === 'active' ? 'destructive' : 'default'}
                        >
                          {agent.status === 'active' ? 'Pause' : 'Activate'}
                        </Button>
                      </Card>
                    ))}
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* Other tabs would continue with similar real data patterns */}
          </Tabs>
        </div>
      </div>
    </ErrorBoundary>
  );
}