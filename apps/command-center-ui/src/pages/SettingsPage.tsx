import { Settings, User, Shield, Database, Zap } from 'lucide-react'
import { Card } from '../components/ui/Card'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            System Configuration
          </h1>
          <p className="text-cyan-200/70 mt-2">
            Configure and customize your Royal Equips Empire system
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border-cyan-500/30 hover:border-cyan-400/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <User className="w-8 h-8 text-cyan-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">User Profile</h3>
              <p className="text-cyan-200/70 text-sm">Manage account and preferences</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/30 hover:border-purple-400/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <Shield className="w-8 h-8 text-purple-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Security</h3>
              <p className="text-purple-200/70 text-sm">Authentication and access control</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-500/30 hover:border-green-400/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <Database className="w-8 h-8 text-green-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Integrations</h3>
              <p className="text-green-200/70 text-sm">Connect external services</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-900/30 to-yellow-900/30 border-orange-500/30 hover:border-orange-400/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <Zap className="w-8 h-8 text-orange-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Performance</h3>
              <p className="text-orange-200/70 text-sm">System optimization settings</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-900/30 to-pink-900/30 border-red-500/30 hover:border-red-400/50 transition-colors cursor-pointer">
          <div className="flex items-center gap-4 mb-4">
            <Settings className="w-8 h-8 text-red-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">Advanced</h3>
              <p className="text-red-200/70 text-sm">Advanced system configuration</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 bg-gradient-to-br from-gray-900/50 to-slate-900/50 border-gray-700/50">
        <h2 className="text-xl font-semibold text-white mb-4">System Configuration Hub</h2>
        <div className="text-center py-12">
          <Settings className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Configure Your Empire</h3>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Customize and optimize your Royal Equips Empire with advanced configuration options, integrations, and performance settings.
          </p>
          <div className="flex justify-center gap-4">
            <button className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
              Quick Setup
            </button>
            <button className="px-6 py-3 border border-cyan-600 text-cyan-400 hover:bg-cyan-600/10 rounded-lg transition-colors">
              Advanced Configuration
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}