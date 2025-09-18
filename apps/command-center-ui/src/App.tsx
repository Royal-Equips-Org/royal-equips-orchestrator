import { useEffect } from 'react'
import { useEmpireStore } from '@/store/empire-store'
import EmpireDashboard from '@/components/empire/EmpireDashboard'
import type { EmpireMetrics } from '@/types/empire'

// Mock data to populate the store initially
const mockMetrics: EmpireMetrics = {
  total_agents: 6,
  active_agents: 3,
  total_opportunities: 12,
  approved_products: 28,
  rejected_products: 15,
  revenue_progress: 2.4,
  current_revenue: 2400000,
  target_revenue: 100000000,
  daily_discoveries: 8,
  avg_trend_score: 83,
  profit_margin_avg: 38,
  automation_level: 65,
  uptime_percentage: 99.2,
  global_regions_active: 12,
  suppliers_connected: 156,
  customer_satisfaction: 87
}

function App() {
  const { setMetrics, setConnectionStatus, updateLastSeen } = useEmpireStore()

  useEffect(() => {
    // Initialize the store with mock data
    setMetrics(mockMetrics)
    setConnectionStatus('connected')
    updateLastSeen()

    // Simulate real-time updates
    const interval = setInterval(() => {
      updateLastSeen()
      
      // Occasionally update metrics to simulate live data
      if (Math.random() > 0.8) {
        setMetrics({
          ...mockMetrics,
          current_revenue: mockMetrics.current_revenue + Math.random() * 1000,
          daily_discoveries: mockMetrics.daily_discoveries + Math.floor(Math.random() * 2),
          active_agents: Math.min(6, Math.max(2, mockMetrics.active_agents + (Math.random() > 0.5 ? 1 : -1)))
        })
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [setMetrics, setConnectionStatus, updateLastSeen])

  return <EmpireDashboard />
}

export default App