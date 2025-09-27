// Royal Equips Empire Command Center - Main Dashboard
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Globe, Users, Package, TrendingUp, BarChart3, Settings } from 'lucide-react';
import CommandCenter3DScene from '../three/CommandCenter3DScene';
import AgentNetworkGrid from './AgentNetworkGrid';
import RevenueTracker from './RevenueTracker';
import ProductOpportunityCards from './ProductOpportunityCards';
import AIChatInterface from './AIChatInterface';
import EmergencyControls from './EmergencyControls';
import { MarketingStudio } from './MarketingStudio';
import ProductsPage from './ProductsPage';
import { useEmpireStore } from '@/store/empire-store';

type DashboardView = 'overview' | 'products' | 'agents' | 'marketing' | 'analytics' | 'settings';

const navigationItems = [
  { id: 'overview', label: 'Overview', icon: Globe },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'agents', label: 'Agents', icon: Users },
  { id: 'marketing', label: 'Marketing', icon: TrendingUp },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function EmpireDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [currentView, setCurrentView] = useState<DashboardView>('overview');
  const { metrics, agents, isConnected } = useEmpireStore();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const renderCurrentView = () => {
    switch (currentView) {
      case 'products':
        return <ProductsPage />;
      case 'agents':
        return <AgentNetworkGrid />;
      case 'marketing':
        return <MarketingStudio />;
      case 'analytics':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">Analytics Dashboard</h2>
            <p className="text-gray-400">Analytics coming soon...</p>
          </div>
        );
      case 'settings':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-cyan-400 mb-6">System Settings</h2>
            <p className="text-gray-400">Settings panel coming soon...</p>
          </div>
        );
      default:
        return renderOverviewDashboard();
    }
  };

  const renderOverviewDashboard = () => (
    <>
      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-6 px-6 pb-6">
        {/* Empire Status */}
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="col-span-12 lg:col-span-4"
        >
          <div className="bg-black/40 backdrop-blur-md border border-cyan-500/30 rounded-lg h-full p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Globe className="w-5 h-5 mr-2 text-cyan-400" />
              Empire Status
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Revenue Progress</span>
                <span className="text-xl font-bold text-green-400">
                  ${metrics ? (metrics.revenue_progress / 1000000).toFixed(1) : '0'}M
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-green-400 to-cyan-400 h-2 rounded-full" 
                  style={{
                    width: `${metrics ? ((metrics.revenue_progress / metrics.target_revenue) * 100).toFixed(1) : 0}%`
                  }}
                />
              </div>
              <div className="text-sm text-gray-400">
                {metrics ? ((metrics.revenue_progress / metrics.target_revenue) * 100).toFixed(1) : 0}% toward 
                ${metrics ? (metrics.target_revenue / 1000000).toFixed(0) : '100'}M target
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">
                    {metrics?.approved_products || 0}
                  </div>
                  <div className="text-xs text-gray-400">Products Approved</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">
                    {metrics?.automation_level || 0}%
                  </div>
                  <div className="text-xs text-gray-400">Automation Level</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Agent Network */}
        <motion.div 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="col-span-12 lg:col-span-8"
        >
          <div className="bg-black/40 backdrop-blur-md border border-cyan-500/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-purple-400" />
              Agent Network Status
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {agents.length > 0 ? agents.map((agent, index) => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-3 h-3 rounded-full ${
                      agent.status === 'active' ? 'bg-green-400' : 
                      agent.status === 'inactive' ? 'bg-yellow-400' : 'bg-red-400'
                    }`} />
                    <span className="text-xs uppercase font-medium text-gray-400">
                      {agent.status}
                    </span>
                  </div>
                  <h4 className="font-medium text-white mb-1">{agent.name}</h4>
                  <p className="text-xs text-gray-400">
                    Last: {agent.last_execution ? new Date(agent.last_execution).toLocaleTimeString() : '--'}
                  </p>
                </motion.div>
              )) : (
                <div className="col-span-full text-center py-8">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400">Loading agents...</p>
                </div>
              )}
            </div>

            {/* Quick Action: View Products */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <button
                onClick={() => setCurrentView('products')}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Package className="w-5 h-5" />
                <span>View Live Products Catalog</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* AI Chat Interface */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="col-span-12 lg:col-span-8"
        >
          <AIChatInterface />
        </motion.div>

        {/* Marketing Studio */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="col-span-12 lg:col-span-4"
        >
          <MarketingStudio />
        </motion.div>

        {/* Revenue Tracker */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="col-span-12"
        >
          <RevenueTracker />
        </motion.div>

        {/* Product Opportunity Cards */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="col-span-12 lg:col-span-8"
        >
          <ProductOpportunityCards />
        </motion.div>

        {/* 3D Visualization */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="col-span-12"
        >
          <div className="bg-black/40 backdrop-blur-md border border-cyan-500/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Globe className="w-5 h-5 mr-2 text-cyan-400" />
              Empire Network Visualization
            </h3>
            <div className="h-96 rounded-lg overflow-hidden">
              <CommandCenter3DScene />
            </div>
          </div>
        </motion.div>

        {/* Agent Network Grid */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="col-span-12 lg:col-span-8"
        >
          <AgentNetworkGrid />
        </motion.div>

        {/* Emergency Controls */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="col-span-12 lg:col-span-4"
        >
          <EmergencyControls />
        </motion.div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="scanner-line absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-black to-purple-900/10"></div>
      </div>

      {/* Header with Navigation */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-black/40 backdrop-blur-md border-b border-cyan-500/30 p-6 mb-6 relative z-10"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center"
            >
              👑
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-1">
                ROYAL EQUIPS EMPIRE COMMAND CENTER
              </h1>
              <p className="text-sm opacity-70">
                Autonomous E-commerce Empire • {currentTime.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
              isConnected 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <span className="uppercase font-medium">
                {isConnected ? 'CONNECTED' : 'OFFLINE'}
              </span>
            </div>

            {/* Active Agents */}
            <div className="text-right">
              <div className="text-xl font-bold text-cyan-400">
                {agents?.length || 0}
              </div>
              <div className="text-xs opacity-70">Active Agents</div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as DashboardView)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  currentView === item.id
                    ? 'bg-cyan-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </motion.header>

      {/* Main Content */}
      {renderCurrentView()}
    </div>
  );
}