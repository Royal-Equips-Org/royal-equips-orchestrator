/**
 * Comprehensive Shopify Integration System
 * Real-time inventory flows, customer management, orders, products, and dashboards
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  MapPin,
  Truck,
  Star,
  Filter,
  Download,
  Upload,
  Zap
} from 'lucide-react';

// Shopify Integration Types
interface ShopifyStore {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'maintenance' | 'error';
  lastSync: Date;
  totalProducts: number;
  totalCustomers: number;
  totalOrders: number;
  monthlyRevenue: number;
}

interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  status: 'active' | 'draft' | 'archived';
  inventory: number;
  price: number;
  comparePrice?: number;
  vendor: string;
  productType: string;
  tags: string[];
  images: string[];
  variants: ShopifyVariant[];
  createdAt: Date;
  updatedAt: Date;
}

interface ShopifyVariant {
  id: string;
  title: string;
  price: number;
  inventory: number;
  sku: string;
  weight: number;
  requiresShipping: boolean;
}

interface ShopifyCustomer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  totalSpent: number;
  ordersCount: number;
  lastOrderDate?: Date;
  acceptsMarketing: boolean;
  tags: string[];
  addresses: ShopifyAddress[];
  createdAt: Date;
  lifetimeValue: number;
  segment: 'new' | 'regular' | 'vip' | 'at_risk';
}

interface ShopifyAddress {
  id: string;
  firstName: string;
  lastName: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  country: string;
  zip: string;
  phone?: string;
  isDefault: boolean;
}

interface ShopifyOrder {
  id: string;
  orderNumber: string;
  email: string;
  financialStatus: 'pending' | 'paid' | 'partially_paid' | 'refunded' | 'voided';
  fulfillmentStatus: 'fulfilled' | 'partial' | 'unfulfilled' | 'restocked';
  totalPrice: number;
  subtotalPrice: number;
  totalTax: number;
  shippingPrice: number;
  currency: string;
  lineItems: ShopifyLineItem[];
  shippingAddress: ShopifyAddress;
  billingAddress: ShopifyAddress;
  createdAt: Date;
  updatedAt: Date;
  customer: ShopifyCustomer;
  riskLevel: 'low' | 'medium' | 'high';
}

interface ShopifyLineItem {
  id: string;
  productId: string;
  variantId: string;
  title: string;
  quantity: number;
  price: number;
  totalDiscount: number;
  sku: string;
}

interface InventoryAlert {
  id: string;
  productId: string;
  variantId: string;
  productTitle: string;
  currentStock: number;
  reorderPoint: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  predictedStockout: Date;
  suggestedReorderQuantity: number;
}

export function ComprehensiveShopifyIntegration() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'inventory' | 'customers' | 'orders' | 'analytics'>('dashboard');
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<ShopifyStore | null>(null);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [customers, setCustomers] = useState<ShopifyCustomer[]>([]);
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<InventoryAlert[]>([]);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  // Initialize Shopify data
  const initializeShopifyData = useCallback(async () => {
    try {
      setSyncStatus('syncing');
      
      // Simulate fetching store data
      const storeData: ShopifyStore = {
        id: 'store_001',
        name: 'Royal Equips Store',
        domain: 'royal-equips.myshopify.com',
        status: 'active',
        lastSync: new Date(),
        totalProducts: 1247,
        totalCustomers: 8934,
        totalOrders: 15623,
        monthlyRevenue: 284750.50
      };
      
      setStores([storeData]);
      setSelectedStore(storeData);
      
      // Initialize sample data for demonstration
      initializeSampleData();
      
      setSyncStatus('idle');
    } catch (error) {
      console.error('Shopify initialization failed:', error);
      setSyncStatus('error');
    }
  }, []);

  const initializeSampleData = () => {
    // Sample products
    const sampleProducts: ShopifyProduct[] = [
      {
        id: 'prod_001',
        title: 'Premium Office Chair',
        handle: 'premium-office-chair',
        status: 'active',
        inventory: 45,
        price: 299.99,
        comparePrice: 399.99,
        vendor: 'ErgoTech',
        productType: 'Furniture',
        tags: ['office', 'ergonomic', 'bestseller'],
        images: ['/images/chair1.jpg'],
        variants: [
          {
            id: 'var_001',
            title: 'Black',
            price: 299.99,
            inventory: 25,
            sku: 'CHAIR-001-BLK',
            weight: 15.5,
            requiresShipping: true
          },
          {
            id: 'var_002', 
            title: 'White',
            price: 299.99,
            inventory: 20,
            sku: 'CHAIR-001-WHT',
            weight: 15.5,
            requiresShipping: true
          }
        ],
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date()
      }
      // Add more sample products...
    ];

    // Sample customers
    const sampleCustomers: ShopifyCustomer[] = [
      {
        id: 'cust_001',
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1-555-0123',
        totalSpent: 1245.99,
        ordersCount: 8,
        lastOrderDate: new Date('2024-09-20'),
        acceptsMarketing: true,
        tags: ['vip', 'repeat-customer'],
        addresses: [],
        createdAt: new Date('2023-05-10'),
        lifetimeValue: 2890.50,
        segment: 'vip'
      }
      // Add more sample customers...
    ];

    // Sample inventory alerts
    const sampleAlerts: InventoryAlert[] = [
      {
        id: 'alert_001',
        productId: 'prod_001',
        variantId: 'var_001',
        productTitle: 'Premium Office Chair - Black',
        currentStock: 25,
        reorderPoint: 50,
        severity: 'medium',
        predictedStockout: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        suggestedReorderQuantity: 100
      }
    ];

    setProducts(sampleProducts);
    setCustomers(sampleCustomers);
    setInventoryAlerts(sampleAlerts);
  };

  // Real-time sync function
  const performSync = useCallback(async () => {
    if (!selectedStore) return;
    
    setSyncStatus('syncing');
    
    try {
      // Simulate API calls to Shopify
      await Promise.all([
        // Fetch products
        new Promise(resolve => setTimeout(resolve, 1000)),
        // Fetch customers  
        new Promise(resolve => setTimeout(resolve, 800)),
        // Fetch orders
        new Promise(resolve => setTimeout(resolve, 1200)),
        // Check inventory levels
        new Promise(resolve => setTimeout(resolve, 600))
      ]);
      
      // Update last sync time
      setStores(prev => prev.map(store => 
        store.id === selectedStore.id 
          ? { ...store, lastSync: new Date() }
          : store
      ));
      
      setSyncStatus('idle');
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus('error');
    }
  }, [selectedStore]);

  // Auto-sync setup
  useEffect(() => {
    initializeShopifyData();
  }, [initializeShopifyData]);

  useEffect(() => {
    if (!realTimeUpdates) return;
    
    const interval = setInterval(performSync, 30000); // Sync every 30 seconds
    return () => clearInterval(interval);
  }, [realTimeUpdates, performSync]);

  // Dashboard Overview
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Store Status */}
      {selectedStore && (
        <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg p-6 border border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">{selectedStore.name}</h3>
              <p className="text-sm text-gray-400">{selectedStore.domain}</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  selectedStore.status === 'active' ? 'bg-green-400' :
                  selectedStore.status === 'maintenance' ? 'bg-yellow-400' : 
                  'bg-red-400'
                }`}></div>
                <span className="text-sm text-gray-300 capitalize">{selectedStore.status}</span>
              </div>
              
              <button
                onClick={performSync}
                disabled={syncStatus === 'syncing'}
                className="flex items-center space-x-2 px-3 py-1 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/40 hover:bg-blue-500/30 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                <span>{syncStatus === 'syncing' ? 'Syncing...' : 'Sync'}</span>
              </button>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-400">
            Last sync: {selectedStore.lastSync.toLocaleString()}
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            label: 'Total Products', 
            value: selectedStore?.totalProducts.toLocaleString() || '0',
            icon: <Package className="h-6 w-6" />,
            color: 'text-blue-400 bg-blue-500/20'
          },
          {
            label: 'Total Customers',
            value: selectedStore?.totalCustomers.toLocaleString() || '0', 
            icon: <Users className="h-6 w-6" />,
            color: 'text-green-400 bg-green-500/20'
          },
          {
            label: 'Total Orders',
            value: selectedStore?.totalOrders.toLocaleString() || '0',
            icon: <ShoppingCart className="h-6 w-6" />,
            color: 'text-purple-400 bg-purple-500/20'
          },
          {
            label: 'Monthly Revenue',
            value: `$${selectedStore?.monthlyRevenue.toLocaleString() || '0'}`,
            icon: <DollarSign className="h-6 w-6" />,
            color: 'text-yellow-400 bg-yellow-500/20'
          }
        ].map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-800/30 rounded-lg p-6 border border-gray-700/50"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{metric.label}</p>
                <p className="text-2xl font-semibold text-white">{metric.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${metric.color}`}>
                {metric.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Inventory Alerts */}
      {inventoryAlerts.length > 0 && (
        <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-400" />
              Inventory Alerts
            </h3>
            <span className="text-sm text-gray-400">{inventoryAlerts.length} alerts</span>
          </div>
          
          <div className="space-y-3">
            {inventoryAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border-l-4 ${
                  alert.severity === 'critical' ? 'border-l-red-500 bg-red-500/10' :
                  alert.severity === 'high' ? 'border-l-orange-500 bg-orange-500/10' :
                  alert.severity === 'medium' ? 'border-l-yellow-500 bg-yellow-500/10' :
                  'border-l-blue-500 bg-blue-500/10'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-white">{alert.productTitle}</h4>
                    <p className="text-sm text-gray-300">
                      Current stock: {alert.currentStock} | Reorder point: {alert.reorderPoint}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Predicted stockout: {alert.predictedStockout.toLocaleDateString()}
                    </p>
                  </div>
                  
                  <button className="px-3 py-1 text-xs rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30">
                    Reorder {alert.suggestedReorderQuantity}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-gray-800/30 rounded-lg p-6 border border-gray-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">Real-time Activity</h3>
        
        <div className="space-y-3">
          {[
            { type: 'order', message: 'New order #12345 from John Doe', time: '2 minutes ago', icon: <ShoppingCart className="h-4 w-4 text-green-400" /> },
            { type: 'inventory', message: 'Low stock alert for Premium Office Chair', time: '5 minutes ago', icon: <Package className="h-4 w-4 text-yellow-400" /> },
            { type: 'customer', message: 'New customer registration: jane.smith@email.com', time: '8 minutes ago', icon: <Users className="h-4 w-4 text-blue-400" /> },
            { type: 'sync', message: 'Inventory sync completed successfully', time: '12 minutes ago', icon: <CheckCircle className="h-4 w-4 text-green-400" /> }
          ].map((activity, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-700/30">
              {activity.icon}
              <div className="flex-1">
                <p className="text-sm text-gray-200">{activity.message}</p>
                <p className="text-xs text-gray-400">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // Products Management
  const renderProducts = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Products Management</h3>
        <div className="flex items-center space-x-3">
          <button className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg border border-green-500/40 hover:bg-green-500/30">
            <Upload className="h-4 w-4 mr-2 inline" />
            Import Products
          </button>
          <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/40 hover:bg-blue-500/30">
            Add Product
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {products.map((product) => (
          <div key={product.id} className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-white">{product.title}</h4>
                <p className="text-sm text-gray-400">{product.vendor} • {product.productType}</p>
                
                <div className="flex items-center space-x-4 mt-2">
                  <span className="text-sm text-gray-300">
                    ${product.price} {product.comparePrice && (
                      <span className="text-gray-500 line-through ml-1">${product.comparePrice}</span>
                    )}
                  </span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    product.inventory > 50 ? 'bg-green-500/20 text-green-400' :
                    product.inventory > 10 ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {product.inventory} in stock
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${
                    product.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    product.status === 'draft' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {product.status}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2 mt-2">
                  {product.tags.map((tag) => (
                    <span key={tag} className="text-xs px-2 py-1 bg-gray-700/50 text-gray-300 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-400 hover:text-white">
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-white">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="comprehensive-shopify-integration">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Shopify Integration Hub</h1>
            <p className="text-gray-400 mt-1">
              Real-time e-commerce operations • Inventory flows • Customer intelligence
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setRealTimeUpdates(!realTimeUpdates)}
              className={`px-3 py-2 rounded-lg flex items-center space-x-2 ${
                realTimeUpdates
                  ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/40'
              }`}
            >
              <Zap className="h-4 w-4" />
              <span>Real-time {realTimeUpdates ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-700/50 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-4 w-4" /> },
            { id: 'products', label: 'Products', icon: <Package className="h-4 w-4" /> },
            { id: 'inventory', label: 'Inventory', icon: <Truck className="h-4 w-4" /> },
            { id: 'customers', label: 'Customers', icon: <Users className="h-4 w-4" /> },
            { id: 'orders', label: 'Orders', icon: <ShoppingCart className="h-4 w-4" /> },
            { id: 'analytics', label: 'Analytics', icon: <TrendingUp className="h-4 w-4" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 py-3 px-1 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'products' && renderProducts()}
          {activeTab === 'inventory' && (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300">Inventory Management</h3>
              <p className="text-gray-500">Real-time inventory tracking and forecasting</p>
            </div>
          )}
          {activeTab === 'customers' && (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300">Customer Intelligence</h3>
              <p className="text-gray-500">Customer segmentation and lifecycle management</p>
            </div>
          )}
          {activeTab === 'orders' && (
            <div className="text-center py-12">
              <ShoppingCart className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300">Order Management</h3>
              <p className="text-gray-500">Order processing and fulfillment automation</p>
            </div>
          )}
          {activeTab === 'analytics' && (
            <div className="text-center py-12">
              <TrendingUp className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-300">Business Analytics</h3>
              <p className="text-gray-500">Revenue insights and predictive analytics</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default ComprehensiveShopifyIntegration;