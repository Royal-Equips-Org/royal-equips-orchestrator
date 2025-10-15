/**
 * Customers Module - Royal Equips Command Center
 * Connected to real Shopify API via /api/customers endpoints
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Search, 
  RefreshCw,
  AlertCircle,
  DollarSign,
  Mail,
  ShoppingCart,
  TrendingUp,
  Award
} from 'lucide-react';
import { apiClient } from '../../services/api-client';

interface Customer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  created_at: string;
  orders_count: number;
  total_spent: number;
  verified_email: boolean;
  currency: string;
}

interface CustomerStats {
  overview: {
    total_customers: number;
    verified_emails: number;
    marketing_subscribed: number;
  };
  lifetime_value: {
    total: number;
    average: number;
    segments: {
      vip: number;
      high_value: number;
      medium_value: number;
      low_value: number;
      no_orders: number;
    };
  };
  engagement: {
    repeat_customers: number;
    one_time_customers: number;
    retention_rate: number;
  };
}

export default function CustomersModule() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        page,
        limit: 50
      };
      
      if (searchQuery.trim()) {
        params.search = searchQuery;
      }
      
      const response = await apiClient.get<{
        customers: Customer[];
        total: number;
      }>('/customers', { params });
      
      setCustomers(response.customers);
    } catch (err: any) {
      console.error('Failed to fetch customers:', err);
      setError(err?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get<CustomerStats>('/customers/stats');
      setStats(response);
    } catch (err) {
      console.error('Failed to fetch customer stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCustomers();
    fetchStats();
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const getCustomerSegment = (totalSpent: number) => {
    if (totalSpent > 1000) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-500/20 text-purple-400">VIP</span>;
    }
    if (totalSpent > 500) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400">High Value</span>;
    }
    if (totalSpent > 100) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400">Medium Value</span>;
    }
    if (totalSpent > 0) {
      return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400">Low Value</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300">New</span>;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Users className="w-8 h-8 text-pink-400" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                Customer Management
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Advanced customer relationship management and analytics
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-pink-500/20 text-pink-400 rounded-lg hover:bg-pink-500/30 transition-colors disabled:opacity-50"
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
                  <p className="text-gray-400 text-sm">Total Customers</p>
                  <p className="text-2xl font-bold text-white mt-1">{stats.overview.total_customers}</p>
                </div>
                <Users className="w-8 h-8 text-pink-400" />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                {stats.overview.verified_emails} verified emails
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
                  <p className="text-gray-400 text-sm">Avg Lifetime Value</p>
                  <p className="text-2xl font-bold text-green-400 mt-1">
                    ${stats.lifetime_value.average.toFixed(2)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
              <div className="mt-4 text-sm text-gray-400">Per customer</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900 p-6 rounded-lg border border-gray-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">VIP Customers</p>
                  <p className="text-2xl font-bold text-purple-400 mt-1">{stats.lifetime_value.segments.vip}</p>
                </div>
                <Award className="w-8 h-8 text-purple-400" />
              </div>
              <div className="mt-4 text-sm text-gray-400">&gt;1,000 spent</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-900 p-6 rounded-lg border border-gray-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Retention Rate</p>
                  <p className="text-2xl font-bold text-blue-400 mt-1">
                    {stats.engagement.retention_rate.toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-400" />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                {stats.engagement.repeat_customers} repeat customers
              </div>
            </motion.div>
          </div>
        )}

        {/* Search */}
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers by name, email, phone..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-pink-500 focus:outline-none"
            />
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

        {/* Customers Table */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-pink-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading customers...</p>
            </div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No customers found</p>
              <p className="text-gray-500 text-sm">
                {searchQuery
                  ? 'Try adjusting your search'
                  : 'Connect Shopify to see your customers'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Orders</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Total Spent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Segment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {customers.map((customer) => (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                            <span className="text-pink-400 font-medium">
                              {customer.first_name?.[0] || customer.email?.[0]?.toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">{customer.full_name}</p>
                            {customer.verified_email && (
                              <span className="text-xs text-green-400">Verified</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-gray-300">{customer.email}</p>
                          {customer.phone && (
                            <p className="text-gray-400 text-sm">{customer.phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <ShoppingCart className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-300">{customer.orders_count}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-green-400 font-medium">
                          ${customer.total_spent.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getCustomerSegment(customer.total_spent)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-400">
                          {new Date(customer.created_at).toLocaleDateString()}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {customers.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">Showing {customers.length} customers</p>
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
                disabled={customers.length < 50}
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
