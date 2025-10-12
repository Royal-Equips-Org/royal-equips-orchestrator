import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, DollarSign, TrendingUp, Eye, Search, Filter, ArrowUpDown, 
  ShoppingCart, Heart, Share2, Star, Tag, Truck, Shield, Zap 
} from 'lucide-react';
import { useEmpireStore } from '@/store/empire-store';

interface ShopifyProduct {
  id: string;
  title: string;
  status: string;
  handle: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
  productType?: string;
  vendor?: string;
  tags?: string[];
  onlineStoreUrl?: string;
  totalInventory?: number;
  images?: {
    edges: Array<{
      node: {
        id: string;
        url: string;
        altText?: string;
        width?: number;
        height?: number;
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        sku: string;
        price: string;
        compareAtPrice?: string;
        availableForSale?: boolean;
        inventoryQuantity?: number;
        weight?: number;
        weightUnit?: string;
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
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('title');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [dataSource, setDataSource] = useState<string>('');
  const [totalProducts, setTotalProducts] = useState(0);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

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

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setFavorites(newFavorites);
  };

  const filteredAndSortedProducts = products
    .filter(product => {
      const matchesSearch = product.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || product.status === statusFilter;
      const matchesCategory = categoryFilter === 'ALL' || product.productType === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
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
      case 'ACTIVE': return 'status-active';
      case 'DRAFT': return 'status-draft';
      case 'ARCHIVED': return 'status-archived';
      default: return 'text-gray-400';
    }
  };

  const getDataSourceBadge = () => {
    const badges = {
      'live_shopify': { text: 'Live Data', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
      'enhanced_cached_data': { text: 'Enhanced Data', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
      'cached_data': { text: 'Cached Data', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
      'no_data': { text: 'No Data', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' }
    };
    
    const badge = badges[dataSource as keyof typeof badges] || badges.no_data;
    return (
      <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${badge.color}`}>
        {badge.text}
      </span>
    );
  };

  const categories = [...new Set(products.map(p => p.productType).filter(Boolean))];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-gradient rounded-full mx-auto mb-4"
            style={{
              borderImage: 'linear-gradient(45deg, #667eea, #764ba2) 1'
            }}
          />
          <p className="premium-text text-lg">Loading Premium Products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      {/* Elite Header */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-6">
            <div className="w-16 h-16 premium-card flex items-center justify-center">
              <Package className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold premium-text mb-2">
                Royal Equips Store
              </h1>
              <div className="flex items-center space-x-4 text-gray-300">
                <span className="text-lg font-medium">{totalProducts} Premium Products</span>
                <span className="text-gray-500">•</span>
                {getDataSourceBadge()}
              </div>
            </div>
          </div>
          
          <button
            onClick={fetchProducts}
            className="premium-button flex items-center space-x-2"
          >
            <motion.div animate={{ rotate: loading ? 360 : 0 }} transition={{ duration: 1 }}>
              <Package className="w-4 h-4" />
            </motion.div>
            <span>Refresh Catalog</span>
          </button>
        </div>

        {/* Elite Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { 
              icon: Package, 
              value: filteredAndSortedProducts.length, 
              label: 'Total Products',
              color: 'text-blue-400'
            },
            { 
              icon: TrendingUp, 
              value: filteredAndSortedProducts.filter(p => p.status === 'ACTIVE').length, 
              label: 'Active Products',
              color: 'text-emerald-400'
            },
            { 
              icon: DollarSign, 
              value: `$${filteredAndSortedProducts.length > 0 ? (
                filteredAndSortedProducts.reduce((sum, p) => {
                  const price = parseFloat(p.variants?.edges?.[0]?.node?.price || '0');
                  return sum + price;
                }, 0) / filteredAndSortedProducts.length
              ).toFixed(2) : '0.00'}`, 
              label: 'Avg Price',
              color: 'text-amber-400'
            },
            { 
              icon: Eye, 
              value: categories.length, 
              label: 'Categories',
              color: 'text-purple-400'
            }
          ].map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="premium-card p-6"
            >
              <div className="flex items-center space-x-4">
                <stat.icon className={`w-10 h-10 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Elite Filters */}
        <div className="premium-card p-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search premium products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="premium-input w-full pl-12"
                />
              </div>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="premium-input"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="premium-input"
            >
              <option value="ALL">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="premium-input"
            >
              <option value="title">Name</option>
              <option value="price">Price</option>
              <option value="createdAt">Created</option>
              <option value="updatedAt">Updated</option>
            </select>
            
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="premium-button p-3"
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>

            <div className="flex border border-gray-600 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Error State */}
      {error && (
        <div className="premium-card p-6 mb-8 border-red-500/30 bg-red-500/10">
          <p className="text-red-400 font-medium">{error}</p>
        </div>
      )}

      {/* Elite Products Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8" 
          : "space-y-6"
        }
      >
        {filteredAndSortedProducts.map((product, index) => {
          const variant = product.variants?.edges?.[0]?.node;
          const price = variant?.price || '0';
          const compareAtPrice = variant?.compareAtPrice;
          const imageUrl = product.images?.edges?.[0]?.node?.url;
          const isAvailable = variant?.availableForSale !== false;
          const inventory = variant?.inventoryQuantity || 0;
          
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`product-card ${viewMode === 'list' ? 'flex gap-6' : ''} relative group`}
            >
              {/* Product Image */}
              <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-48 h-48' : 'h-64'} bg-gradient-to-br from-gray-800 to-gray-900 rounded-t-lg`}>
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => {
                      // Fallback to gradient background with product icon
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
                    <Package className="w-16 h-16 text-white/80" />
                  </div>
                )}
                
                {/* Status Badge */}
                <div className={`status-badge ${getStatusColor(product.status)}`}>
                  {product.status}
                </div>

                {/* Action Buttons Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-3">
                  <button
                    onClick={() => toggleFavorite(product.id)}
                    className={`p-3 rounded-full backdrop-blur-md transition-colors ${
                      favorites.has(product.id) 
                        ? 'bg-red-500/80 text-white' 
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${favorites.has(product.id) ? 'fill-current' : ''}`} />
                  </button>
                  <button className="p-3 rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-md transition-colors">
                    <Eye className="w-5 h-5" />
                  </button>
                  <button className="p-3 rounded-full bg-blue-600/80 text-white hover:bg-blue-700/80 backdrop-blur-md transition-colors">
                    <ShoppingCart className="w-5 h-5" />
                  </button>
                </div>

                {/* Discount Badge */}
                {compareAtPrice && parseFloat(compareAtPrice) > parseFloat(price) && (
                  <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-bold">
                    {Math.round((1 - parseFloat(price) / parseFloat(compareAtPrice)) * 100)}% OFF
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                {/* Category & Vendor */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-blue-400 bg-blue-500/20 px-2 py-1 rounded">
                    {product.productType || 'General'}
                  </span>
                  {product.vendor && (
                    <span className="text-xs text-gray-400">{product.vendor}</span>
                  )}
                </div>

                {/* Product Title */}
                <h3 className="font-bold text-white mb-2 line-clamp-2 group-hover:text-blue-400 transition-colors">
                  {product.title}
                </h3>

                {/* Description */}
                {product.description && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {product.description}
                  </p>
                )}

                {/* Price Section */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-emerald-400">${price}</span>
                    {compareAtPrice && parseFloat(compareAtPrice) > parseFloat(price) && (
                      <span className="text-lg text-gray-500 line-through">${compareAtPrice}</span>
                    )}
                  </div>
                  {product.tags && product.tags.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-400">4.8</span>
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="space-y-2 mb-4 text-sm text-gray-400">
                  {variant?.sku && (
                    <div className="flex items-center space-x-2">
                      <Tag className="w-4 h-4" />
                      <span>SKU: {variant.sku}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4" />
                    <span>Stock: {inventory} units</span>
                  </div>
                  {variant?.weight && (
                    <div className="flex items-center space-x-2">
                      <Truck className="w-4 h-4" />
                      <span>Weight: {variant.weight} {variant.weightUnit?.toLowerCase()}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button 
                    className={`w-full premium-button flex items-center justify-center space-x-2 ${
                      !isAvailable ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={!isAvailable}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>{isAvailable ? 'Add to Cart' : 'Out of Stock'}</span>
                  </button>
                  
                  <div className="flex space-x-2">
                    <button className="flex-1 px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm">
                      Quick View
                    </button>
                    <button className="px-4 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="flex items-center justify-center space-x-4 mt-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Shield className="w-3 h-3" />
                    <span>Secure</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Truck className="w-3 h-3" />
                    <span>Fast Ship</span>
                  </div>
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Zap className="w-3 h-3" />
                    <span>Premium</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Empty State */}
      {filteredAndSortedProducts.length === 0 && !loading && (
        <div className="text-center py-20">
          <Package className="w-24 h-24 text-gray-600 mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-gray-400 mb-4">No Products Found</h3>
          <p className="text-gray-500 mb-8">
            {searchTerm || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
              ? 'Try adjusting your filters to see more products' 
              : 'No products are currently available'}
          </p>
          <button 
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
              setCategoryFilter('ALL');
            }}
            className="premium-button"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
}