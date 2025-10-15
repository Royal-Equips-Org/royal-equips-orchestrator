/**
 * Orders Module - Royal Equips Command Center
 * Connected to real Shopify API via /api/orders endpoints
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  Search, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Package,
  TrendingUp,
  Clock
} from 'lucide-react';
import { apiClient } from '../../services/api-client';

interface Order {
  id: string;
  order_number: number;
  name: string;
  email: string;
  created_at: string;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: number;
  currency: string;
  items_count: number;
  customer_name: string;
}

interface OrderStats {
  overview: {
    total_orders: number;
    open: number;
    fulfilled: number;
    cancelled: number;
  };
  financial: {
    paid: number;
    pending: number;
    refunded: number;
    total_revenue: number;
    avg_order_value: number;
  };
}

export default function OrdersModule() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'any' | 'open' | 'closed'>('any');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        page,
        limit: 50,
        status: statusFilter
      };
      
      const response = await apiClient.get<{
        orders: Order[];
        total: number;
      }>('/orders', { params });
      
      setOrders(response.orders);
    } catch (err: any) {
      console.error('Failed to fetch orders:', err);
      setError(err?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, statusFilter]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get<OrderStats>('/orders/stats');
      setStats(response);
    } catch (err) {
      console.error('Failed to fetch order stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
    fetchStats();
  };

  const getStatusBadge = (financialStatus: string, fulfillmentStatus: string | null) => {
    if (financialStatus === 'paid' && fulfillmentStatus === 'fulfilled') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400">Completed</span>;
    }
    if (financialStatus === 'paid' && !fulfillmentStatus) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400">Processing</span>;
    }
    if (financialStatus === 'pending') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400">Pending Payment</span>;
    }
    if (financialStatus === 'refunded') {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400">Refunded</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300">{financialStatus}</span>;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <ShoppingCart className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Order Management
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Complete order lifecycle management and fulfillment automation
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900 p-6 rounded-lg border border-gray-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Orders</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.overview.total_orders}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-400" />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                {stats.overview.open} open • {stats.overview.fulfilled} fulfilled
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-900 p-6 rounded-lg border border-gray-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-400 mt-1">
                    ${stats.financial.total_revenue.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
              <div className="mt-4 text-sm text-gray-400">Last 30 days</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900 p-6 rounded-lg border border-gray-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Avg Order Value</p>
                  <p className="text-2xl font-bold text-purple-400 mt-1">
                    ${stats.financial.avg_order_value.toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-400" />
              </div>
              <div className="mt-4 text-sm text-gray-400">Per order</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-900 p-6 rounded-lg border border-gray-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Pending Orders</p>
                  <p className="text-2xl font-bold text-yellow-400 mt-1">{stats.financial.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
              <div className="mt-4 text-sm text-gray-400">Awaiting payment</div>
            </motion.div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
          <div className="flex gap-2">
            {(['any', 'open', 'closed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {status === 'any' ? 'All Orders' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No orders found</p>
              <p className="text-gray-500 text-sm">Connect Shopify to see your orders</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Items</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {orders.map((order) => (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white font-medium">#{order.order_number}</p>
                          <p className="text-gray-400 text-sm">{order.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white">{order.customer_name}</p>
                          <p className="text-gray-400 text-sm">{order.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-300">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(order.financial_status, order.fulfillment_status)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-green-400 font-medium">
                          ${order.total_price.toFixed(2)} {order.currency}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">{order.items_count}</span>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {orders.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">Showing {orders.length} orders</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={orders.length < 50}
                className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
