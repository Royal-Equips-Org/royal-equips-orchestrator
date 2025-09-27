import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, DollarSign, TrendingUp, Eye, Search, Filter, ArrowUpDown } from 'lucide-react';
import { useEmpireStore } from '@/store/empire-store';

interface ShopifyProduct {
  id: string;
  title: string;
  status: string;
  handle: string;
  createdAt: string;
  updatedAt: string;
  variants: {
    edges: Array<{
      node: {
        id: string;
        sku: string;
        price: string;
        compareAtPrice?: string;
        inventoryItem: { id: string };
      };
    }>;
  };
}

interface ProductsData {
  products: {
    edges: Array<{
      cursor: string;
      node: ShopifyProduct;
    }>;
    pageInfo: {
      hasNextPage: boolean;
    };
  };
  success: boolean;
  source: string;
  total?: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [dataSource, setDataSource] = useState<string>('');
  const [totalProducts, setTotalProducts] = useState(0);

  const { isConnected } = useEmpireStore();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/v1/shopify/products?limit=100');
      const data: ProductsData = await response.json();
      
      if (data.success) {
        const productList = data.products.edges.map(edge => edge.node);
        setProducts(productList);
        setDataSource(data.source);
        setTotalProducts(data.total || productList.length);
      } else {
        setError('Failed to fetch products');
      }
    } catch (err) {
      setError('Network error while fetching products');
      console.error('Products fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedProducts = products
    .filter(product => {
      const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || product.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue: any = a[sortBy as keyof ShopifyProduct];
      let bValue: any = b[sortBy as keyof ShopifyProduct];
      
      if (sortBy === 'price') {
        aValue = parseFloat(a.variants?.edges?.[0]?.node?.price || '0');
        bValue = parseFloat(b.variants?.edges?.[0]?.node?.price || '0');
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'text-green-400 bg-green-400/20';
      case 'DRAFT': return 'text-yellow-400 bg-yellow-400/20';
      case 'ARCHIVED': return 'text-red-400 bg-red-400/20';
      default: return 'text-gray-400 bg-gray-400/20';
    }
  };

  const getDataSourceBadge = () => {
    switch (dataSource) {
      case 'live_shopify':
        return <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">Live Data</span>;
      case 'cached_data':
        return <span className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded">Cached Data</span>;
      case 'mock_data':
        return <span className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 rounded">Demo Data</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-cyan-400">Loading Products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Products Catalog
              </h1>
              <p className="text-gray-400">
                {totalProducts} products • {getDataSourceBadge()}
              </p>
            </div>
          </div>
          
          <button
            onClick={fetchProducts}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors flex items-center space-x-2"
          >
            <motion.div animate={{ rotate: loading ? 360 : 0 }} transition={{ duration: 1 }}>
              <Package className="w-4 h-4" />
            </motion.div>
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8 text-blue-400" />
              <div>
                <p className="text-2xl font-bold">{filteredAndSortedProducts.length}</p>
                <p className="text-sm text-gray-400">Total Products</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <TrendingUp className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold">
                  {filteredAndSortedProducts.filter(p => p.status === 'ACTIVE').length}
                </p>
                <p className="text-sm text-gray-400">Active Products</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="w-8 h-8 text-yellow-400" />
              <div>
                <p className="text-2xl font-bold">
                  ${filteredAndSortedProducts.length > 0 ? (
                    filteredAndSortedProducts.reduce((sum, p) => {
                      const price = parseFloat(p.variants?.edges?.[0]?.node?.price || '0');
                      return sum + price;
                    }, 0) / filteredAndSortedProducts.length
                  ).toFixed(2) : '0.00'}
                </p>
                <p className="text-sm text-gray-400">Avg Price</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Eye className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-2xl font-bold">
                  {filteredAndSortedProducts.filter(p => p.status === 'DRAFT').length}
                </p>
                <p className="text-sm text-gray-400">Draft Products</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-cyan-400 focus:outline-none"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
          >
            <option value="title">Name</option>
            <option value="price">Price</option>
            <option value="createdAt">Created</option>
            <option value="updatedAt">Updated</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white hover:bg-gray-700 transition-colors"
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Error State */}
      {error && (
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Products Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {filteredAndSortedProducts.map((product, index) => {
          const variant = product.variants?.edges?.[0]?.node;
          const price = variant?.price || '0';
          const compareAtPrice = variant?.compareAtPrice;
          
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-cyan-400/50 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`px-2 py-1 text-xs rounded ${getStatusColor(product.status)}`}>
                  {product.status}
                </span>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-400">${price}</p>
                  {compareAtPrice && (
                    <p className="text-sm text-gray-400 line-through">${compareAtPrice}</p>
                  )}
                </div>
              </div>
              
              <h3 className="font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">
                {product.title}
              </h3>
              
              <div className="space-y-1 text-sm text-gray-400">
                <p>SKU: {variant?.sku || 'N/A'}</p>
                <p>Handle: {product.handle}</p>
                <p>Created: {new Date(product.createdAt).toLocaleDateString()}</p>
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-700">
                <button className="w-full px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 rounded text-sm transition-colors">
                  View Details
                </button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Empty State */}
      {filteredAndSortedProducts.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-400 mb-2">No Products Found</h3>
          <p className="text-gray-500">
            {searchTerm || statusFilter !== 'ALL' 
              ? 'Try adjusting your filters' 
              : 'No products available'}
          </p>
        </div>
      )}
    </div>
  );
}