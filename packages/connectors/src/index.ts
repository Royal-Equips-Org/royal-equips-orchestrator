// Main connector exports with explicit naming to avoid conflicts
export { ShopifyConnector } from './shopify.js';
export { ShopifyConnector as ShopifySimpleConnector } from './shopify-simple.js';
export { SupabaseConnector } from './supabase.js';
export { SupabaseConnector as SupabaseSimpleConnector } from './supabase-simple.js';

// Type exports for external usage
export type {
  ShopifyProduct,
  ShopifyOrder,
  ShopifyVariant,
  ShopifyAPIProduct,
  ShopifyInventoryLevel
} from './shopify.js';

export type {
  ShopifyProduct as SimpleShopifyProduct,
  ShopifyOrder as SimpleShopifyOrder
} from './shopify-simple.js';

export type {
  Database,
  AgentConfig,
  ExecutionParameters,
  ExecutionResults,
  ExecutionMetrics
} from './supabase.js';

export type {
  SimpleExecutionParams,
  SimpleMetrics
} from './supabase-simple.js';