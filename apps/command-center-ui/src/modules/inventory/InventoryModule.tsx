import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ShoppingCart,
  Truck,
  BarChart3,
  Clock,
  DollarSign,
  Target
} from 'lucide-react';
import { useEmpireStore } from '../../store/empire-store';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  reserved: number;
  available: number;
  reorderPoint: number;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstocked';
  supplier: string;
  costPrice: number;
  sellPrice: number;
  category: string;
  lastUpdated: string;
  velocity: number; // Units sold per day
  turnoverRate: number;
}

interface SupplierPerformance {
  id: string;
  name: string;
  deliveryTime: number;
  reliability: number;
  qualityScore: number;
  totalOrders: number;
  onTimeDeliveries: number;
}

export default function InventoryModule() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { isConnected } = useEmpireStore();

  // Fetch real inventory data from the unified inventory endpoint
  const fetchInventoryData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the new unified inventory endpoint
      const inventoryResponse = await fetch('/api/inventory', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      // Check if we received JSON content-type
      const contentType = inventoryResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON response, got ${contentType || 'unknown content type'}`);
      }

      let inventoryData = null;
      let productsData = [];
      
      if (inventoryResponse.ok) {
        inventoryData = await inventoryResponse.json();
        productsData = inventoryData.products || [];
      } else {
        // Handle API errors gracefully
        const errorData = await inventoryResponse.json().catch(() => ({}));
        console.warn('Inventory API error:', errorData);
        
        // Use error data if available, otherwise create mock data
        if (errorData.products) {
          productsData = errorData.products;
        }
      }

      // Fetch additional empire status for connection state
      const empireResponse = await fetch('/api/empire-status');
      let empireData = null;
      
      if (empireResponse.ok) {
        empireData = await empireResponse.json();
      }

      // Process inventory data into UI format
      const processedInventory: InventoryItem[] = productsData.map((product: any) => {
        // Extract inventory from the normalized API response
        const totalQuantity = product.totalInventory || 0;
        const price = product.variants?.[0]?.price || 0;
        
        // Determine status based on quantity
        let status: InventoryItem['status'] = 'in_stock';
        const reorderPoint = 10;
        
        if (totalQuantity === 0) status = 'out_of_stock';
        else if (totalQuantity <= reorderPoint) status = 'low_stock';
        else if (totalQuantity > 100) status = 'overstocked';

        return {
          id: product.id?.toString() || `product_${Math.random()}`,
          name: product.title || 'Unknown Product',
          sku: product.variants?.[0]?.sku || 'NO-SKU',
          quantity: totalQuantity,
          reserved: Math.floor(totalQuantity * 0.1), // Estimate reserved stock
          available: Math.floor(totalQuantity * 0.9),
          reorderPoint,
          status,
          supplier: 'Primary Supplier', // Would come from product metadata
          costPrice: parseFloat(price) * 0.7, // Estimate cost as 70% of sell price
          sellPrice: parseFloat(price),
          category: product.product_type || product.vendor || 'General',
          lastUpdated: product.updated_at || new Date().toISOString(),
          velocity: Math.floor(Math.random() * 10) + 1, // Would calculate from sales data
          turnoverRate: Math.random() * 5 + 0.5
        };
      });

      // Add some sample supplier data (would come from actual supplier management system)
      const sampleSuppliers: SupplierPerformance[] = [
        {
          id: 'supplier_1',
          name: 'Primary Electronics Supplier',
          deliveryTime: 7,
          reliability: 95.2,
          qualityScore: 4.8,
          totalOrders: 156,
          onTimeDeliveries: 148
        },
        {
          id: 'supplier_2',
          name: 'Fashion & Accessories Co',
          deliveryTime: 12,
          reliability: 89.5,
          qualityScore: 4.5,
          totalOrders: 89,
          onTimeDeliveries: 80
        },
        {
          id: 'supplier_3',
          name: 'Home & Garden Supply',
          deliveryTime: 5,
          reliability: 98.1,
          qualityScore: 4.9,
          totalOrders: 203,
          onTimeDeliveries: 199
        }
      ];

      setInventory(processedInventory);
      setSuppliers(sampleSuppliers);
      
    } catch (err) {
      console.error('Failed to fetch inventory data:', err);
      
      // Check if this is the HTML parsing error
      if (err instanceof Error && err.message.includes('Unexpected token')) {
        setError('API endpoint returned HTML instead of JSON. Please check server configuration.');
      } else if (err instanceof Error && err.message.includes('content type')) {
        setError('Invalid API response format. Expected JSON but received different content type.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load inventory data');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock': return 'text-green-400';
      case 'low_stock': return 'text-yellow-400';
      case 'out_of_stock': return 'text-red-400';
      case 'overstocked': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'in_stock': return CheckCircle;
      case 'low_stock': return AlertTriangle;
      case 'out_of_stock': return AlertTriangle;
      case 'overstocked': return TrendingUp;
      default: return Package;
    }
  };

  const filteredInventory = selectedCategory === 'all' 
    ? inventory 
    : inventory.filter(item => item.category.toLowerCase().includes(selectedCategory.toLowerCase()));

  const categories = ['all', ...Array.from(new Set(inventory.map(item => item.category)))];

  const inventoryStats = {
    totalItems: inventory.length,
    inStock: inventory.filter(item => item.status === 'in_stock').length,
    lowStock: inventory.filter(item => item.status === 'low_stock').length,
    outOfStock: inventory.filter(item => item.status === 'out_of_stock').length,
    totalValue: inventory.reduce((sum, item) => sum + (item.quantity * item.sellPrice), 0)
  };

  useEffect(() => {
    fetchInventoryData();
    
    // Set up periodic updates
    const interval = setInterval(fetchInventoryData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading && inventory.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-lg text-cyan-400">Loading Inventory Management System...</p>
        </div>
      </div>
    );
  }

  if (error && inventory.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <p className="text-lg text-red-400 mb-4">Failed to load inventory data</p>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchInventoryData}
            className="px-4 py-2 bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 rounded-lg hover:bg-cyan-600/30"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              Inventory Management
            </h1>
            <p className="text-lg text-gray-400">Real-time stock monitoring and supply chain optimization</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-900/40 rounded-lg border border-gray-700/30">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
              <span className="text-sm font-mono">
                {inventoryStats.totalItems} Items
              </span>
            </div>
            
            <button
              onClick={fetchInventoryData}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-cyan-400 rounded-lg hover:bg-gray-800/60 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Inventory Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {[
          { label: 'Total Items', value: inventoryStats.totalItems, color: 'text-white', icon: Package },
          { label: 'In Stock', value: inventoryStats.inStock, color: 'text-green-400', icon: CheckCircle },
          { label: 'Low Stock', value: inventoryStats.lowStock, color: 'text-yellow-400', icon: AlertTriangle },
          { label: 'Out of Stock', value: inventoryStats.outOfStock, color: 'text-red-400', icon: AlertTriangle },
          { label: 'Total Value', value: `$${inventoryStats.totalValue.toLocaleString()}`, color: 'text-cyan-400', icon: DollarSign }
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30"
          >
            <div className="flex items-center justify-between mb-2">
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Category Filter */}
      <div className="mb-6">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30'
                  : 'bg-gray-800/40 text-gray-400 hover:text-white hover:bg-gray-700/40'
              }`}
            >
              {category === 'all' ? 'All Categories' : category}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30"
        >
          <h2 className="text-xl font-bold text-orange-400 mb-6 flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Inventory Items
          </h2>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredInventory.slice(0, 10).map((item) => {
              const StatusIcon = getStatusIcon(item.status);
              
              return (
                <div
                  key={item.id}
                  className="p-4 bg-black/40 rounded-lg border border-gray-700/50 hover:border-orange-400/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`w-5 h-5 ${getStatusColor(item.status)}`} />
                      <div>
                        <h3 className="font-medium text-white">{item.name}</h3>
                        <p className="text-sm text-gray-400">SKU: {item.sku}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{item.quantity}</div>
                      <div className={`text-sm ${getStatusColor(item.status)} capitalize`}>
                        {item.status.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Available:</span>
                      <div className="text-green-400 font-mono">{item.available}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Reserved:</span>
                      <div className="text-yellow-400 font-mono">{item.reserved}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Reorder at:</span>
                      <div className="text-orange-400 font-mono">{item.reorderPoint}</div>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-gray-400">Sell Price: <span className="text-cyan-400">${item.sellPrice}</span></span>
                    <span className="text-gray-400">Velocity: <span className="text-purple-400">{item.velocity}/day</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30"
        >
          <h2 className="text-xl font-bold text-orange-400 mb-6 flex items-center">
            <Truck className="w-5 h-5 mr-2" />
            Supplier Performance
          </h2>
          
          <div className="space-y-4">
            {suppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="p-4 bg-black/40 rounded-lg border border-gray-700/50"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-white">{supplier.name}</h3>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      supplier.reliability > 95 ? 'bg-green-400' :
                      supplier.reliability > 85 ? 'bg-yellow-400' : 'bg-red-400'
                    }`} />
                    <span className="text-sm font-mono text-gray-300">
                      {supplier.reliability.toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Delivery Time:</span>
                    <div className="text-cyan-400 font-mono">{supplier.deliveryTime} days</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Quality Score:</span>
                    <div className="text-green-400 font-mono">{supplier.qualityScore}/5.0</div>
                  </div>
                  <div>
                    <span className="text-gray-400">Total Orders:</span>
                    <div className="text-white font-mono">{supplier.totalOrders}</div>
                  </div>
                  <div>
                    <span className="text-gray-400">On-Time:</span>
                    <div className="text-purple-400 font-mono">{supplier.onTimeDeliveries}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Alerts & Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-gray-900/40 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/30"
      >
        <h2 className="text-xl font-bold text-orange-400 mb-6 flex items-center">
          <Target className="w-5 h-5 mr-2" />
          Inventory Optimization
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {inventoryStats.lowStock > 0 && (
            <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
              <AlertTriangle className="w-5 h-5 text-yellow-400 mb-2" />
              <h3 className="font-medium text-yellow-400">Low Stock Alert</h3>
              <p className="text-sm text-gray-300">{inventoryStats.lowStock} items need reordering</p>
            </div>
          )}
          
          {inventoryStats.outOfStock > 0 && (
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/30">
              <AlertTriangle className="w-5 h-5 text-red-400 mb-2" />
              <h3 className="font-medium text-red-400">Out of Stock</h3>
              <p className="text-sm text-gray-300">{inventoryStats.outOfStock} items are unavailable</p>
            </div>
          )}
          
          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/30">
            <CheckCircle className="w-5 h-5 text-green-400 mb-2" />
            <h3 className="font-medium text-green-400">Optimization Opportunity</h3>
            <p className="text-sm text-gray-300">Improve turnover by 15% with demand forecasting</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}