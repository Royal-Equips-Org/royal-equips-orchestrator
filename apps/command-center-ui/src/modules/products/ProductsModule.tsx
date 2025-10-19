/**
 * Products Module - Royal Equips Command Center
 * 
 * Connected to real Shopify API via /api/products endpoints
 * Displays product catalog with search, filtering, and management
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  Search, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Eye,
  Edit,
  BarChart3
} from 'lucide-react';
import { apiClient } from '../../services/api-client';

interface Product {
  id: string;
  title: string;
  handle: string;
  status: string;
  vendor: string;
  product_type: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  tags: string[];
  variants_count: number;
  inventory_quantity: number;
  price_range: {
    min: number;
    max: number;
    formatted: string;
  };
  image: string | null;
  has_variants: boolean;
  inventory_tracked: boolean;
  published: boolean;
}

interface ProductStats {
  overview: {
    total_products: number;
    published: number;
    draft: number;
    archived: number;
  };
  inventory: {
    total_units: number;
    low_stock: number;
    out_of_stock: number;
    in_stock: number;
  };
}

export default function ProductsModule() {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        page,
        limit: 50
      };
      
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      
      if (searchQuery.trim()) {
        params.search = searchQuery;
      }
      
      const response = await apiClient.get<{
        products: Product[];
        total: number;
        page: number;
        limit: number;
      }>('/products', { params });
      
      setProducts(response.products);
    } catch (err: any) {
      console.error('Failed to fetch products:', err);
      setError(err?.message || 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, statusFilter, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get<ProductStats>('/products/stats');
      setStats(response);
    } catch (err) {
      console.error('Failed to fetch product stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchProducts();
    fetchStats();
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const getStatusBadge = (status: string, published: boolean) => {
    if (!published) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300">
          Draft
        </span>
      );
    }
    
    switch (status) {
      case 'active':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-500/20 text-green-400">
            Active
          </span>
        );
      case 'draft':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-500/20 text-yellow-400">
            Draft
          </span>
        );
      case 'archived':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-500/20 text-red-400">
            Archived
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300">
            {status}
          </span>
        );
    }
  };

  const getInventoryStatus = (quantity: number) => {
    if (quantity === 0) {
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    } else if (quantity < 10) {
      return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    }
    return <CheckCircle className="w-4 h-4 text-green-400" />;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Package className="w-8 h-8 text-orange-400" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                Product Catalog
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Manage your complete product catalog with real-time Shopify sync
              </p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors disabled:opacity-50"
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
                  <p className="text-gray-400 text-sm">Total Products</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stats.overview.total_products}
                  </p>
                </div>
                <Package className="w-8 h-8 text-orange-400" />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                {stats.overview.published} published • {stats.overview.draft} drafts
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
                  <p className="text-gray-400 text-sm">Total Inventory</p>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stats.inventory.total_units}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-400" />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                {stats.inventory.in_stock} in stock
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900 p-6 rounded-lg border border-gray-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-400 mt-1">
                    {stats.inventory.low_stock}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-yellow-400" />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                Requires attention
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-900 p-6 rounded-lg border border-gray-800"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Out of Stock</p>
                  <p className="text-2xl font-bold text-red-400 mt-1">
                    {stats.inventory.out_of_stock}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
              <div className="mt-4 text-sm text-gray-400">
                Needs reorder
              </div>
            </motion.div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products by name, description, tags..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-orange-500 focus:outline-none"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'active', 'draft', 'archived'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setStatusFilter(status);
                    setPage(1);
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    statusFilter === status
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
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

        {/* Products Table */}
        <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No products found</p>
              <p className="text-gray-500 text-sm">
                {searchQuery
                  ? 'Try adjusting your search or filters'
                  : 'Connect Shopify to see your product catalog'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800 border-b border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Inventory
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {products.map((product) => (
                    <motion.tr
                      key={product.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.title}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-600" />
                            </div>
                          )}
                          <div>
                            <p className="text-white font-medium">{product.title}</p>
                            <p className="text-gray-400 text-sm">{product.vendor}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(product.status, product.published)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {getInventoryStatus(product.inventory_quantity)}
                          <span className="text-gray-300">{product.inventory_quantity}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-green-400 font-medium">
                          {product.price_range.formatted}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-400">{product.product_type || 'Uncategorized'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                            <Eye className="w-4 h-4 text-gray-400" />
                          </button>
                          <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
                            <Edit className="w-4 h-4 text-gray-400" />
                          </button>
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
        {products.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">
              Showing {products.length} products
            </p>
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
                disabled={products.length < 50}
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
