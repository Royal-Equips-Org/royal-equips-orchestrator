import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { 
  ShoppingCart, Package, Users, DollarSign, 
  TrendingUp, Activity, Zap, AlertCircle, 
  CheckCircle, Clock, RefreshCw
} from 'lucide-react';
import { useEmpireStore } from '../../store/empire-store';
import { shopifyService, ShopifyMetrics } from '../../services/shopify-service';

export default function ShopifyDashboard() {
  const [metrics, setMetrics] = useState<ShopifyMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [storeHealth, setStoreHealth] = useState<{
    status: 'connected' | 'disconnected' | 'error';
    shopName?: string;
    details: string;
  } | null>(null);

  const { isConnected } = useEmpireStore();

  // Fetch real Shopify metrics
  const fetchShopifyMetrics = async () => {
    try {
      setLoading(true);
      
      // Fetch live data from Shopify
      const [metricsData, healthData] = await Promise.all([
        shopifyService.fetchMetrics(),
        shopifyService.getStoreHealth()
      ]);

      setMetrics(metricsData);
      setStoreHealth(healthData);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Failed to fetch Shopify metrics:', error);
      setMetrics(null);
      setStoreHealth({
        status: 'error',
        details: 'Failed to connect to Shopify API'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopifyMetrics();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchShopifyMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return (
      <div className="h-full flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-2 border-hologram border-t-transparent rounded-full"
        />
        <span className="ml-3 text-hologram font-mono">Loading Shopify Data...</span>
      </div>
    );
  }

  if (!metrics && !loading) {
    return (
      <div className="h-full flex items-center justify-center flex-col space-y-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <div className="text-center">
          <h3 className="text-white text-lg font-bold mb-2">Shopify Connection Required</h3>
          <p className="text-gray-400 mb-4">Configure your Shopify API credentials to view real-time data</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={fetchShopifyMetrics}
            className="px-4 py-2 bg-hologram/20 border border-hologram rounded-lg text-hologram hover:bg-hologram/30 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Connection
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 bg-gradient-to-br from-gray-900/50 to-black/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="p-3 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-2xl border border-green-400/30"
          >
            <ShoppingCart className="w-8 h-8 text-green-400" />
          </motion.div>
          <div>
            <h1 className="text-3xl font-bold text-white">Shopify Command Center</h1>
            <p className="text-green-400">
              {storeHealth?.status === 'connected' ? `Connected to ${storeHealth.shopName}` : 'Live E-commerce Operations'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {storeHealth && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              storeHealth.status === 'connected' 
                ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                : storeHealth.status === 'error'
                ? 'bg-red-500/20 text-red-300 border border-red-400/30'
                : 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/30'
            }`}>
              {storeHealth.status === 'connected' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {storeHealth.status === 'connected' ? 'Connected' : 'Disconnected'}
            </div>
          )}
          
          {lastUpdated && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Clock className="w-4 h-4" />
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            onClick={fetchShopifyMetrics}
            className="p-2 bg-hologram/20 border border-hologram rounded-lg text-hologram hover:bg-hologram/30 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Orders */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-green-400/30"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500/20 rounded-xl">
              <ShoppingCart className="w-6 h-6 text-green-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Total Orders</p>
            <p className="text-3xl font-bold text-white">{metrics?.totalOrders || 0}</p>
            <p className="text-sm text-green-400">
              ${(metrics?.totalRevenue || 0).toLocaleString()} revenue
            </p>
          </div>
        </motion.div>

        {/* Products */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-blue-400/30"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Package className="w-6 h-6 text-blue-400" />
            </div>
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Total Products</p>
            <p className="text-3xl font-bold text-white">{metrics?.totalProducts || 0}</p>
            <p className="text-sm text-blue-400">Live catalog items</p>
          </div>
        </motion.div>

        {/* Customers */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-400/30"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-purple-400" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Total Customers</p>
            <p className="text-3xl font-bold text-white">{metrics?.totalCustomers || 0}</p>
            <p className="text-sm text-purple-400">
              {(metrics?.conversionRate || 0).toFixed(1)}% conversion rate
            </p>
          </div>
        </motion.div>

        {/* Revenue */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-yellow-400/30"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-500/20 rounded-xl">
              <DollarSign className="w-6 h-6 text-yellow-400" />
            </div>
            <Zap className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="space-y-2">
            <p className="text-sm text-gray-400">Average Order Value</p>
            <p className="text-3xl font-bold text-white">
              ${(metrics?.averageOrderValue || 0).toFixed(2)}
            </p>
            <p className="text-sm text-yellow-400">
              {metrics?.trafficEstimate || 0} visitors tracked
            </p>
          </div>
        </motion.div>
      </div>

      {/* Real-time Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-600/30"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Live Store Activity</h2>
          <div className="flex items-center gap-2 text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">Live Data Stream</span>
          </div>
        </div>

        <div className="space-y-4">
          {metrics && (
            <>
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-500/10 to-transparent rounded-lg border-l-4 border-green-400">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-white font-medium">Store sync completed</p>
                  <p className="text-sm text-gray-400">
                    {metrics.totalProducts} products • {metrics.totalOrders} orders processed
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-500/10 to-transparent rounded-lg border-l-4 border-blue-400">
                <Activity className="w-5 h-5 text-blue-400" />
                <div>
                  <p className="text-white font-medium">Revenue tracking active</p>
                  <p className="text-sm text-gray-400">
                    ${metrics.totalRevenue.toLocaleString()} total revenue monitored
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-500/10 to-transparent rounded-lg border-l-4 border-purple-400">
                <Users className="w-5 h-5 text-purple-400" />
                <div>
                  <p className="text-white font-medium">Customer analytics updated</p>
                  <p className="text-sm text-gray-400">
                    {metrics.totalCustomers} customers • {metrics.conversionRate.toFixed(1)}% conversion rate
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}