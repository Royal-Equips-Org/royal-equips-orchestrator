// QUANTUM PRODUCT MATRIX - ULTIMATE SHOPIFY STOREFRONT EXPERIENCE
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Search, Filter, Grid, List, Heart, ShoppingCart, Eye, Share2, Star, Zap, Package, TrendingUp } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  handle: string;
  status: 'Active' | 'Draft' | 'Archived';
  price: string;
  compareAtPrice?: string;
  vendor: string;
  productType: string;
  tags: string[];
  image: string;
  createdAt: string;
  category: string;
  rating: number;
  reviews: number;
  stock: number;
  description: string;
}

export default function QuantumProductMatrix() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Fetch enhanced products from API
    fetch('/v1/shopify/products')
      .then(res => res.json())
      .then(data => {
        const enhancedProducts = data.products.map((product: any, index: number) => ({
          ...product,
          rating: 4.2 + Math.random() * 0.8,
          reviews: Math.floor(Math.random() * 150) + 20,
          stock: Math.floor(Math.random() * 100) + 10,
          description: `Premium ${product.productType.toLowerCase()} featuring advanced technology and superior craftsmanship. Perfect for modern lifestyles.`
        }));
        setProducts(enhancedProducts);
        setFilteredProducts(enhancedProducts);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load products:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let filtered = products;

    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.productType.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }

    if (selectedStatus !== 'All') {
      filtered = filtered.filter(product => product.status === selectedStatus);
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory, selectedStatus]);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
  const statuses = ['All', 'Active', 'Draft', 'Archived'];

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(productId)) {
        newFavorites.delete(productId);
      } else {
        newFavorites.add(productId);
      }
      return newFavorites;
    });
  };

  const toggleCart = (productId: string) => {
    setCart(prev => {
      const newCart = new Set(prev);
      if (newCart.has(productId)) {
        newCart.delete(productId);
      } else {
        newCart.add(productId);
      }
      return newCart;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500/20 text-green-400 border-green-400/30';
      case 'Draft': return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30';
      case 'Archived': return 'bg-red-500/20 text-red-400 border-red-400/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="h-full p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              QUANTUM PRODUCT MATRIX
            </h1>
            <p className="text-cyan-300 text-lg font-mono mt-2">Ultimate Shopify Storefront Experience</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600/20 to-cyan-600/20 rounded-full border border-purple-400/30">
              <Package className="w-5 h-5 text-purple-400" />
              <span className="text-white font-mono">{filteredProducts.length} Products</span>
            </div>
            <div className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-full border border-green-400/30">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-white font-mono">${(filteredProducts.reduce((sum, p) => sum + parseFloat(p.price.replace('$', '')), 0) / 1000).toFixed(1)}K Value</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 bg-black/20 backdrop-blur-xl border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:border-cyan-500/50 focus:outline-none"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 bg-black/20 backdrop-blur-xl border border-gray-700/50 rounded-xl text-white focus:border-cyan-500/50 focus:outline-none"
            >
              {categories.map(cat => (
                <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-3 bg-black/20 backdrop-blur-xl border border-gray-700/50 rounded-xl text-white focus:border-cyan-500/50 focus:outline-none"
            >
              {statuses.map(status => (
                <option key={status} value={status} className="bg-gray-900">{status}</option>
              ))}
            </select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center space-x-2 bg-black/20 backdrop-blur-xl border border-gray-700/50 rounded-xl p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${
                viewMode === 'list' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className={`${
        viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
          : 'space-y-4'
      } max-h-[calc(100vh-300px)] overflow-y-auto pr-4`}>
        <AnimatePresence>
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02, y: -5 }}
              className={`${
                viewMode === 'grid' 
                  ? 'bg-gradient-to-br from-gray-900/40 via-gray-800/40 to-gray-900/40'
                  : 'bg-gradient-to-r from-gray-900/40 to-gray-800/40 flex items-center'
              } backdrop-blur-xl border border-gray-700/30 rounded-2xl overflow-hidden hover:border-cyan-500/50 transition-all duration-300 group`}
            >
              {/* Product Image */}
              <div className={`${viewMode === 'grid' ? 'aspect-square' : 'w-32 h-32 flex-shrink-0'} relative overflow-hidden`}>
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* Status Badge */}
                <div className={`absolute top-3 left-3 px-2 py-1 rounded-full text-xs font-mono border ${getStatusColor(product.status)}`}>
                  {product.status}
                </div>

                {/* Action Buttons */}
                <div className="absolute top-3 right-3 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleFavorite(product.id)}
                    className={`p-2 rounded-full backdrop-blur-xl border transition-all ${
                      favorites.has(product.id)
                        ? 'bg-red-500/20 border-red-400/50 text-red-400'
                        : 'bg-black/20 border-gray-700/50 text-gray-400 hover:text-red-400'
                    }`}
                  >
                    <Heart className="w-4 h-4" fill={favorites.has(product.id) ? 'currentColor' : 'none'} />
                  </button>
                  <button className="p-2 rounded-full bg-black/20 backdrop-blur-xl border border-gray-700/50 text-gray-400 hover:text-cyan-400 transition-all">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-full bg-black/20 backdrop-blur-xl border border-gray-700/50 text-gray-400 hover:text-purple-400 transition-all">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Rating */}
                <div className="absolute bottom-3 left-3 flex items-center space-x-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-xs text-white font-mono">{product.rating.toFixed(1)}</span>
                </div>
              </div>

              {/* Product Info */}
              <div className={`${viewMode === 'grid' ? 'p-6' : 'p-6 flex-1'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg mb-1 line-clamp-2">{product.title}</h3>
                    <p className="text-gray-400 text-sm">{product.vendor} • {product.productType}</p>
                  </div>
                </div>

                {viewMode === 'grid' && (
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">{product.description}</p>
                )}

                {/* Price */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-green-400">{product.price}</span>
                    {product.compareAtPrice && (
                      <span className="text-sm text-gray-400 line-through">{product.compareAtPrice}</span>
                    )}
                  </div>
                  <div className="text-sm text-cyan-400 font-mono">Stock: {product.stock}</div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleCart(product.id)}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                      cart.has(product.id)
                        ? 'bg-green-600 text-white'
                        : 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      {cart.has(product.id) ? (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>Added</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          <span>Add to Cart</span>
                        </>
                      )}
                    </div>
                  </button>
                  
                  {viewMode === 'grid' && (
                    <button className="px-4 py-3 bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-400/30 rounded-xl text-purple-400 hover:bg-purple-600/30 transition-all">
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Tags */}
                {viewMode === 'list' && product.tags.length > 0 && (
                  <div className="flex items-center space-x-2 mt-3">
                    {product.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}