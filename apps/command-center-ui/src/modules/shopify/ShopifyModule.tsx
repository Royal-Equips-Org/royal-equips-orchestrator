import React from 'react';
import ShopifyDashboard from '../../components/shopify/ShopifyDashboard';

/**
 * Shopify Module - E-commerce Store Management
 * 
 * Dedicated page for Shopify store operations, syncing, and management.
 * Integrates with real Shopify APIs for store data and operations.
 */
export default function ShopifyModule() {
  return (
    <div className="w-full h-full">
      <ShopifyDashboard />
    </div>
  );
}