import { Package, TrendingUp, AlertCircle, Plus } from 'lucide-react'
import { Card } from '../components/ui/Card'

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Product Catalog & Inventory
          </h1>
          <p className="text-cyan-200/70 mt-2">
            AI-powered product management with real-time inventory tracking
          </p>
        </div>
        <button className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-lg hover:from-cyan-600 hover:to-purple-600 transition-all flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Product
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border-cyan-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-cyan-200/70 text-sm">Total Products</p>
              <p className="text-2xl font-bold text-white mt-1">2,847</p>
            </div>
            <Package className="w-8 h-8 text-cyan-400" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm">+23% this month</span>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200/70 text-sm">In Stock</p>
              <p className="text-2xl font-bold text-white mt-1">2,156</p>
            </div>
            <Package className="w-8 h-8 text-purple-400" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm">97.5% availability</span>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-900/30 to-red-900/30 border-orange-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-200/70 text-sm">Low Stock</p>
              <p className="text-2xl font-bold text-white mt-1">47</p>
            </div>
            <AlertCircle className="w-8 h-8 text-orange-400" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <AlertCircle className="w-4 h-4 text-orange-400" />
            <span className="text-orange-400 text-sm">Requires restocking</span>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-200/70 text-sm">Total Value</p>
              <p className="text-2xl font-bold text-white mt-1">€847K</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-400" />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm">+15.3% value growth</span>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-gradient-to-br from-gray-900/50 to-slate-900/50 border-gray-700/50">
        <h2 className="text-xl font-semibold text-white mb-4">Product Management</h2>
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Product Management System</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Advanced AI-powered product catalog with real-time inventory tracking, automated restocking recommendations, and intelligent pricing optimization.
          </p>
          <div className="flex justify-center gap-4">
            <button className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
              Import Products
            </button>
            <button className="px-6 py-3 border border-cyan-600 text-cyan-400 hover:bg-cyan-600/10 rounded-lg transition-colors">
              Configure Auto-Sync
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}