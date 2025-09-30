import { Activity, Server, AlertTriangle, CheckCircle } from 'lucide-react'
import { Card } from '../components/ui/Card'

export default function MonitoringPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            System Health & Performance
          </h1>
          <p className="text-cyan-200/70 mt-2">
            Real-time monitoring and performance analytics for all empire systems
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200/70 text-sm">System Status</p>
              <p className="text-2xl font-bold text-white mt-1">Healthy</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm">All systems operational</span>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-200/70 text-sm">Uptime</p>
              <p className="text-2xl font-bold text-white mt-1">99.97%</p>
            </div>
            <Server className="w-8 h-8 text-cyan-400" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Server className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-400 text-sm">847 days continuous</span>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200/70 text-sm">Response Time</p>
              <p className="text-2xl font-bold text-white mt-1">247ms</p>
            </div>
            <Activity className="w-8 h-8 text-purple-400" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Activity className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm">-15ms improvement</span>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-900/30 to-red-900/30 border-orange-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-200/70 text-sm">Alerts</p>
              <p className="text-2xl font-bold text-white mt-1">3</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-400" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 text-sm">Low priority warnings</span>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-gradient-to-br from-gray-900/50 to-slate-900/50 border-gray-700/50">
        <h2 className="text-xl font-semibold text-white mb-4">Monitoring Dashboard</h2>
        <div className="text-center py-12">
          <Activity className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Comprehensive System Monitoring</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Advanced monitoring system with real-time metrics, automated alerting, and predictive analytics for proactive system management.
          </p>
          <div className="flex justify-center gap-4">
            <button className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
              View Live Metrics
            </button>
            <button className="px-6 py-3 border border-cyan-600 text-cyan-400 hover:bg-cyan-600/10 rounded-lg transition-colors">
              Configure Alerts
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}