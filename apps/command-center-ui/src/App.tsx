import React, { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ToastProvider } from './contexts/ToastContext'
import { NavigationProvider } from './contexts/NavigationContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AppLayout from './components/layout/AppLayout'
import LoadingScreen from './components/ui/LoadingScreen'
import './styles/globals.css'

// Lazy load pages for optimal performance
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'))
const AIRAPage = React.lazy(() => import('./pages/AIRAPage'))
const AnalyticsPage = React.lazy(() => import('./pages/AnalyticsPage'))
const AgentsPage = React.lazy(() => import('./pages/AgentsPage'))
const RevenuePage = React.lazy(() => import('./pages/RevenuePage'))
const InventoryPage = React.lazy(() => import('./pages/InventoryPage'))
const MarketingPage = React.lazy(() => import('./pages/MarketingPage'))
const SecurityPage = React.lazy(() => import('./pages/SecurityPage'))
const FinancePage = React.lazy(() => import('./pages/FinancePage'))

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
})

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/aira" element={<AIRAPage />} />
      <Route path="/analytics" element={<AnalyticsPage />} />
      <Route path="/agents" element={<AgentsPage />} />
      <Route path="/revenue" element={<RevenuePage />} />
      <Route path="/inventory" element={<InventoryPage />} />
      <Route path="/marketing" element={<MarketingPage />} />
      <Route path="/security" element={<SecurityPage />} />
      <Route path="/finance" element={<FinancePage />} />
      {/* Add more routes as needed */}
    </Routes>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationProvider>
        <ToastProvider>
          <Router>
            <AppLayout>
              <Suspense fallback={<LoadingScreen />}>
                <AppRoutes />
              </Suspense>
            </AppLayout>
          </Router>
        </ToastProvider>
      </NavigationProvider>
    </QueryClientProvider>
  )
}

export default App
