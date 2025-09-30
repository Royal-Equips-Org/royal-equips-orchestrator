import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import ModulePlaceholder from '../components/layout/ModulePlaceholder';

// Lazy load all modules for better performance
const DashboardModule = React.lazy(() => import('../modules/dashboard/DashboardModule'));
const AiraModule = React.lazy(() => import('../modules/aira/AiraModule'));
const AnalyticsModule = React.lazy(() => import('../modules/analytics/AnalyticsModule'));
const AgentsModule = React.lazy(() => import('../modules/agents/AgentsModule'));
const RevenueModule = React.lazy(() => import('../modules/revenue/RevenueModule'));
const InventoryModule = React.lazy(() => import('../modules/inventory/InventoryModule'));
const MarketingModule = React.lazy(() => import('../modules/marketing/MarketingModule'));
const CustomerSupportModule = React.lazy(() => import('../modules/customer-support/CustomerSupportModule'));
const SecurityModule = React.lazy(() => import('../modules/security/SecurityModule'));
const FinanceModule = React.lazy(() => import('../modules/finance/FinanceModule'));
const AIRAIntelligenceModule = React.lazy(() => import('../modules/aira-intelligence/AIRAIntelligenceModule'));
const ShopifyModule = React.lazy(() => import('../modules/shopify/ShopifyModule'));

const LoadingFallback = ({ title }: { title: string }) => (
  <ModulePlaceholder title={`Loading ${title}...`} size="lg" />
);

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          <Route 
            path="/dashboard" 
            element={
              <Suspense fallback={<LoadingFallback title="Dashboard" />}>
                <DashboardModule />
              </Suspense>
            } 
          />
          
          <Route 
            path="/aira" 
            element={
              <Suspense fallback={<LoadingFallback title="AIRA" />}>
                <AiraModule />
              </Suspense>
            } 
          />
          
          <Route 
            path="/analytics" 
            element={
              <Suspense fallback={<LoadingFallback title="Analytics" />}>
                <AnalyticsModule />
              </Suspense>
            } 
          />
          
          <Route 
            path="/agents" 
            element={
              <Suspense fallback={<LoadingFallback title="Agents" />}>
                <AgentsModule />
              </Suspense>
            } 
          />
          
          <Route 
            path="/revenue" 
            element={
              <Suspense fallback={<LoadingFallback title="Revenue" />}>
                <RevenueModule />
              </Suspense>
            } 
          />
          
          <Route 
            path="/inventory" 
            element={
              <Suspense fallback={<LoadingFallback title="Inventory" />}>
                <InventoryModule />
              </Suspense>
            } 
          />
          
          <Route 
            path="/marketing" 
            element={
              <Suspense fallback={<LoadingFallback title="Marketing" />}>
                <MarketingModule />
              </Suspense>
            } 
          />
          
          <Route 
            path="/customer-support" 
            element={
              <Suspense fallback={<LoadingFallback title="Customer Support" />}>
                <CustomerSupportModule />
              </Suspense>
            } 
          />
          
          <Route 
            path="/security" 
            element={
              <Suspense fallback={<LoadingFallback title="Security" />}>
                <SecurityModule />
              </Suspense>
            } 
          />
          
          <Route 
            path="/finance" 
            element={
              <Suspense fallback={<LoadingFallback title="Finance" />}>
                <FinanceModule />
              </Suspense>
            } 
          />
          
          <Route 
            path="/aira-intelligence" 
            element={
              <Suspense fallback={<LoadingFallback title="AIRA Intelligence" />}>
                <AIRAIntelligenceModule isActive={true} />
              </Suspense>
            } 
          />
          
          <Route 
            path="/shopify" 
            element={
              <Suspense fallback={<LoadingFallback title="Shopify" />}>
                <ShopifyModule />
              </Suspense>
            } 
          />
          
          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}