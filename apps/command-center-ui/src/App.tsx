import { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ToastProvider } from './contexts/ToastContext'
import { NavigationProvider } from './contexts/NavigationContext'
import AppLayout from './components/layout/AppLayout'
import LoadingSpinner from './components/LoadingSpinner'
import './styles/globals.css'
import './command-center/ai-core/AiCore.css'

// Lazy-loaded page components
const CommandCenterPage = lazy(() => import('./pages/CommandCenterPage'))
const AiraPage = lazy(() => import('./pages/AiraPage'))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'))
const AgentsPage = lazy(() => import('./pages/AgentsPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const RevenuePage = lazy(() => import('./pages/RevenuePage'))
const InventoryPage = lazy(() => import('./pages/InventoryPage'))
const MarketingPage = lazy(() => import('./pages/MarketingPage'))
const CustomerSupportPage = lazy(() => import('./pages/CustomerSupportPage'))
const SecurityPage = lazy(() => import('./pages/SecurityPage'))
const FinancePage = lazy(() => import('./pages/FinancePage'))
const ShopifyPage = lazy(() => import('./pages/ShopifyPage'))
const ProductsPage = lazy(() => import('./pages/ProductsPage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const CustomersPage = lazy(() => import('./pages/CustomersPage'))
const MonitoringPage = lazy(() => import('./pages/MonitoringPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

function App() {
  return (
    <Router>
      <NavigationProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<AppLayout />}>
              <Route index element={
                <Suspense fallback={<LoadingSpinner />}>
                  <CommandCenterPage />
                </Suspense>
              } />
              <Route path="/dashboard" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <DashboardPage />
                </Suspense>
              } />
              <Route path="/aira" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <AiraPage />
                </Suspense>
              } />
              <Route path="/analytics" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <AnalyticsPage />
                </Suspense>
              } />
              <Route path="/agents" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <AgentsPage />
                </Suspense>
              } />
              <Route path="/revenue" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <RevenuePage />
                </Suspense>
              } />
              <Route path="/inventory" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <InventoryPage />
                </Suspense>
              } />
              <Route path="/marketing" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <MarketingPage />
                </Suspense>
              } />
              <Route path="/customer-support" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <CustomerSupportPage />
                </Suspense>
              } />
              <Route path="/security" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <SecurityPage />
                </Suspense>
              } />
              <Route path="/finance" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <FinancePage />
                </Suspense>
              } />
              <Route path="/shopify" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <ShopifyPage />
                </Suspense>
              } />
              <Route path="/products" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <ProductsPage />
                </Suspense>
              } />
              <Route path="/orders" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <OrdersPage />
                </Suspense>
              } />
              <Route path="/customers" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <CustomersPage />
                </Suspense>
              } />
              <Route path="/monitoring" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <MonitoringPage />
                </Suspense>
              } />
              <Route path="/settings" element={
                <Suspense fallback={<LoadingSpinner />}>
                  <SettingsPage />
                </Suspense>
              } />
            </Route>
          </Routes>
        </ToastProvider>
      </NavigationProvider>
    </Router>
  )
}

export default App
