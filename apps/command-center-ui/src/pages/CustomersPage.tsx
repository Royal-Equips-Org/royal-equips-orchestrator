import { Users, TrendingUp, Heart, Star } from 'lucide-react'
import { Card } from '../components/ui/Card'

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Customer Relationship Management
          </h1>
          <p className="text-cyan-200/70 mt-2">
            AI-powered customer insights and relationship automation
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-200/70 text-sm">Total Customers</p>
              <p className="text-2xl font-bold text-white mt-1">48,352</p>
            </div>
            <Users className="w-8 h-8 text-cyan-400" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm">+12% this month</span>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200/70 text-sm">Active Users</p>
              <p className="text-2xl font-bold text-white mt-1">31,247</p>
            </div>
            <Heart className="w-8 h-8 text-purple-400" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Heart className="w-4 h-4 text-purple-400" />
            <span className="text-purple-400 text-sm">64.6% engagement rate</span>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200/70 text-sm">Avg. Rating</p>
              <p className="text-2xl font-bold text-white mt-1">4.8</p>
            </div>
            <Star className="w-8 h-8 text-green-400" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <Star className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm">97.2% satisfaction</span>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-900/30 to-yellow-900/30 border-orange-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-200/70 text-sm">LTV</p>
              <p className="text-2xl font-bold text-white mt-1">€847</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-400" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm">+23% lifetime value</span>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-gradient-to-br from-gray-900/50 to-slate-900/50 border-gray-700/50">
        <h2 className="text-xl font-semibold text-white mb-4">Customer Intelligence Platform</h2>
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">AI-Powered Customer Insights</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Advanced customer relationship management with AI-driven insights, automated segmentation, and personalized engagement strategies.
          </p>
          <div className="flex justify-center gap-4">
            <button className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
              View Customer Insights
            </button>
            <button className="px-6 py-3 border border-cyan-600 text-cyan-400 hover:bg-cyan-600/10 rounded-lg transition-colors">
              Configure Segmentation
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}