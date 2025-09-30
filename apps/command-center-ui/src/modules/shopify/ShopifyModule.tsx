import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  TrendingUp, 
  Package, 
  Users, 
  DollarSign,
  Activity,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useEmpireStore } from '../../store/empire-store';

interface ShopifyMetrics {
  totalOrders: number;
  todayOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  activeProducts: number;
  lowStockProducts: number;
  totalCustomers: number;
  newCustomers: number;
  conversionRate: number;
  averageOrderValue: number;
}

interface ShopifyOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: 'pending' | 'fulfilled' | 'cancelled';
  createdAt: string;
  items: number;
}

export default function ShopifyModule() {
  const [metrics, setMetrics] = useState<ShopifyMetrics>({
    totalOrders: 0,
    todayOrders: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    activeProducts: 0,
    lowStockProducts: 0,
    totalCustomers: 0,
    newCustomers: 0,
    conversionRate: 0,
    averageOrderValue: 0
  });
  const [recentOrders, setRecentOrders] = useState<ShopifyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const isConnected = useEmpireStore(store => store.isConnected);

  useEffect(() => {
    fetchShopifyData();
    const interval = setInterval(fetchShopifyData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchShopifyData = async () => {
    try {
      setLoading(true);
      setError(null);

      // TODO: Replace with real Shopify API calls
      // For now, simulate real data structure
      const response = await fetch('/api/shopify/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch Shopify data');
      }

      const data = await response.json();
      setMetrics(data.metrics);
      setRecentOrders(data.recentOrders);
      setLastSync(new Date());
    } catch (err) {
      console.error('Error fetching Shopify data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Fallback to mock data structure (to be replaced with real API)
      setMetrics({
        totalOrders: 1247,
        todayOrders: 23,
        totalRevenue: 89750.50,
        todayRevenue: 1892.75,
        activeProducts: 342,
        lowStockProducts: 12,
        totalCustomers: 2893,
        newCustomers: 18,
        conversionRate: 3.2,
        averageOrderValue: 72.15
      });
      
      setRecentOrders([
        {
          id: '1',
          orderNumber: '#1001',
          customerName: 'John Smith',
          total: 129.99,
          status: 'fulfilled',
          createdAt: new Date().toISOString(),
          items: 3
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = () => {
    fetchShopifyData();
  };

  if (loading && !metrics.totalOrders) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3 text-cyan-400">
          <RefreshCw className="w-6 h-6 animate-spin" />
          <span>Loading Shopify data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-cyan-300">Shopify Dashboard</h1>
          <p className="text-cyan-400/80 mt-1">Real-time store analytics and order management</p>
        </div>
        
        <div className="flex items-center gap-4">
          {lastSync && (
            <span className="text-sm text-cyan-400/60">
              Last sync: {lastSync.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleSync}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-400/20 border border-cyan-400/30 rounded-lg hover:bg-cyan-400/30 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Sync
          </button>
        </div>
      </div>

      {/* Connection Status */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-400/20 border border-red-400/30 rounded-lg p-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-red-300 font-medium">Connection Error</p>
              <p className="text-red-400/80 text-sm">{error}</p>
            </div>
          </div>
        </motion.div>
      )}

      {isConnected && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-400/20 border border-green-400/30 rounded-lg p-4"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-green-300">Connected to Shopify API</p>
          </div>
        </motion.div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-black/40 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-400/80 text-sm">Total Orders</p>
              <p className="text-2xl font-bold text-cyan-300">{metrics.totalOrders.toLocaleString()}</p>
              <p className="text-green-400 text-sm">+{metrics.todayOrders} today</p>
            </div>
            <ShoppingBag className="w-8 h-8 text-cyan-400/60" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-black/40 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-400/80 text-sm">Total Revenue</p>
              <p className="text-2xl font-bold text-cyan-300">${metrics.totalRevenue.toLocaleString()}</p>
              <p className="text-green-400 text-sm">+${metrics.todayRevenue.toFixed(2)} today</p>
            </div>
            <DollarSign className="w-8 h-8 text-cyan-400/60" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-black/40 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-400/80 text-sm">Active Products</p>
              <p className="text-2xl font-bold text-cyan-300">{metrics.activeProducts}</p>
              <p className="text-orange-400 text-sm">{metrics.lowStockProducts} low stock</p>
            </div>
            <Package className="w-8 h-8 text-cyan-400/60" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-black/40 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-400/80 text-sm">Customers</p>
              <p className="text-2xl font-bold text-cyan-300">{metrics.totalCustomers.toLocaleString()}</p>
              <p className="text-green-400 text-sm">+{metrics.newCustomers} new</p>
            </div>
            <Users className="w-8 h-8 text-cyan-400/60" />
          </div>
        </motion.div>
      </div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-black/40 backdrop-blur-sm border border-cyan-400/30 rounded-lg p-6"
      >
        <h2 className="text-xl font-semibold text-cyan-300 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Recent Orders
        </h2>
        
        <div className="space-y-3">
          {recentOrders.length > 0 ? (
            recentOrders.map((order, idx) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * idx }}
                className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-cyan-400/20"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-cyan-300 font-medium">{order.orderNumber}</p>
                    <p className="text-cyan-400/80 text-sm">{order.customerName}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-cyan-300 font-medium">${order.total.toFixed(2)}</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        order.status === 'fulfilled'
                          ? 'bg-green-400/20 text-green-300'
                          : order.status === 'pending'
                          ? 'bg-yellow-400/20 text-yellow-300'
                          : 'bg-red-400/20 text-red-300'
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <p className="text-cyan-400/60 text-center py-8">No recent orders found</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}