// Royal Equips Empire Command Center - Main Dashboard
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Globe, Users } from 'lucide-react';
import CommandCenter3DScene from '../three/CommandCenter3DScene';
import AgentNetworkGrid from './AgentNetworkGrid';
import RevenueTracker from './RevenueTracker';
import ProductOpportunityCards from './ProductOpportunityCards';
import AIChatInterface from './AIChatInterface';
import EmergencyControls from './EmergencyControls';
import { MarketingStudio } from './MarketingStudio';
import { useEmpireStore } from '@/store/empire-store';

export default function EmpireDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { metrics, agents, isConnected } = useEmpireStore();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="scanner-line absolute w-full h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-30"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-black to-purple-900/10"></div>
      </div>

      {/* Header */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-black/40 backdrop-blur-md border-b border-cyan-500/30 p-6 mb-6 relative z-10"
      >
        <div className="flex items-center justify-between">
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
      </motion.header>

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
                  transition={{ delay: 0.1 * index }}
                  className={`p-3 rounded-lg border ${
                    agent.status === 'active' ? 'bg-green-500/10 border-green-500/30' :
                    agent.status === 'deploying' ? 'bg-yellow-500/10 border-yellow-500/30' :
                    agent.status === 'error' ? 'bg-red-500/10 border-red-500/30' :
                    'bg-gray-500/10 border-gray-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{agent.emoji}</span>
                    <span className={`text-xs uppercase font-bold ${
                      agent.status === 'active' ? 'text-green-400' :
                      agent.status === 'deploying' ? 'text-yellow-400' :
                      agent.status === 'error' ? 'text-red-400' :
                      'text-gray-400'
                    }`}>
                      {agent.status}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-white mb-1">{agent.name}</div>
                  <div className="text-lg font-bold text-cyan-400">{agent.performance_score}</div>
                </motion.div>
              )) : (
                // Fallback while loading
                [...Array(3)].map((_, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * index }}
                    className="p-3 rounded-lg border bg-gray-500/10 border-gray-500/30"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">⚙️</span>
                      <span className="text-xs uppercase font-bold text-gray-400">LOADING</span>
                    </div>
                    <div className="text-sm font-medium text-white mb-1">Loading...</div>
                    <div className="text-lg font-bold text-cyan-400">--</div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* Product Opportunities */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="col-span-12 lg:col-span-8"
        >
          <div className="bg-black/40 backdrop-blur-md border border-cyan-500/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              💎 Product Opportunities
            </h3>
            <div className="bg-black/30 border border-cyan-500/20 rounded-lg p-4">
              <h4 className="text-xl font-bold text-white mb-2">
                Portable Solar Power Bank with Wireless Charging
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">87</div>
                  <div className="text-xs text-gray-400">Trend Score</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">$25-$35</div>
                  <div className="text-xs text-gray-400">Price Range</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-400">45K</div>
                  <div className="text-xs text-gray-400">Monthly Searches</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-400">High</div>
                  <div className="text-xs text-gray-400">Profit Potential</div>
                </div>
              </div>
              <div className="flex space-x-4">
                <button className="flex-1 py-2 px-4 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg hover:bg-red-600/30 transition-colors">
                  Reject
                </button>
                <button className="flex-1 py-2 px-4 bg-green-600/20 text-green-400 border border-green-600/30 rounded-lg hover:bg-green-600/30 transition-colors">
                  Approve for Shopify
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* AI Chat Interface */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="col-span-12 lg:col-span-4"
        >
          <AIChatInterface />
        </motion.div>

        {/* Marketing Studio - Full Width */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="col-span-12"
        >
          <MarketingStudio />
        </motion.div>

        {/* Revenue Tracker */}
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="col-span-12 lg:col-span-6"
        >
          <RevenueTracker />
        </motion.div>

        {/* Product Opportunities */}
        <motion.div 
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="col-span-12 lg:col-span-6"
        >
          <ProductOpportunityCards />
        </motion.div>

        {/* 3D Empire Visualization */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="col-span-12 lg:col-span-8"
        >
          <div className="bg-black/40 backdrop-blur-md border border-cyan-500/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Globe className="w-5 h-5 mr-2 text-purple-400" />
              Empire Network Visualization
            </h3>
            <CommandCenter3DScene className="rounded-lg" />
          </div>
        </motion.div>

        {/* Agent Network Grid */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.0 }}
          className="col-span-12 lg:col-span-4"
        >
          <AgentNetworkGrid />
        </motion.div>

        {/* Emergency Controls */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="col-span-12"
        >
          <EmergencyControls />
        </motion.div>
      </div>
    </div>
  );
}
