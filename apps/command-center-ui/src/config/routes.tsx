import { lazy } from 'react';
import { Routes, Route } from 'react-router-dom';

// Lazy load all modules for optimal performance
const AiraModule = lazy(() => import('../modules/aira/AiraModule'));
const AnalyticsModule = lazy(() => import('../modules/analytics/AnalyticsModule'));
const AgentsModule = lazy(() => import('../modules/agents/AgentsModule'));
const DashboardModule = lazy(() => import('../modules/dashboard/DashboardModule'));
const RevenueModule = lazy(() => import('../modules/revenue/RevenueModule'));
const InventoryModule = lazy(() => import('../modules/inventory/InventoryModule'));
const MarketingModule = lazy(() => import('../modules/marketing/MarketingModule'));
const CustomerSupportModule = lazy(() => import('../modules/customer-support/CustomerSupportModule'));
const SecurityModule = lazy(() => import('../modules/security/SecurityModule'));
const FinanceModule = lazy(() => import('../modules/finance/FinanceModule'));
const ShopifyModule = lazy(() => import('../modules/shopify/ShopifyModule'));

// Main landing page
const CommandCenterHome = lazy(() => import('../components/empire/EmpireDashboard'));

export function AppRoutes() {
  return (
    <Routes>
      {/* Main command center landing */}
      <Route path="/" element={<CommandCenterHome />} />
      <Route path="/command" element={<CommandCenterHome />} />
      
      {/* Core modules */}
      <Route path="/dashboard" element={<DashboardModule />} />
      <Route path="/aira" element={<AiraModule />} />
      
      {/* Intelligence modules */}
      <Route path="/analytics" element={<AnalyticsModule />} />
      <Route path="/agents" element={<AgentsModule />} />
      
      {/* Operations modules */}
      <Route path="/shopify" element={<ShopifyModule />} />
      <Route path="/marketing" element={<MarketingModule />} />
      <Route path="/inventory" element={<InventoryModule />} />
      <Route path="/revenue" element={<RevenueModule />} />
      <Route path="/customer-support" element={<CustomerSupportModule />} />
      <Route path="/security" element={<SecurityModule />} />
      <Route path="/finance" element={<FinanceModule />} />
      
      {/* Fallback route */}
      <Route path="*" element={<CommandCenterHome />} />
    </Routes>
  );
}