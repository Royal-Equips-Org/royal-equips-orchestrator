// Revenue Tracker Component
import { motion } from 'framer-motion';
import { TrendingUp, Target, DollarSign } from 'lucide-react';
import { useEmpireMetrics } from '@/store/empire-store';

export default function RevenueTracker() {
  const metrics = useEmpireMetrics();

  const currentRevenue = metrics?.revenue_progress || 0;
  const targetRevenue = metrics?.target_revenue || 100000000; // $100M
  const progress = (currentRevenue / targetRevenue) * 100;
  
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const formatPercentage = (value: number) => {
    return Math.min(value, 100).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Main Revenue Display */}
      <div className="text-center">
        <div className="text-4xl font-bold text-yellow-400 mb-2">
          {formatCurrency(currentRevenue)}
        </div>
        <div className="text-sm opacity-70">
          of {formatCurrency(targetRevenue)} target
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="w-full bg-gray-800 rounded-full h-6 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="h-full bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-300 relative"
          >
            {/* Animated shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          </motion.div>
        </div>
        
        {/* Progress Text */}
        <div className="absolute inset-0 flex items-center justify-center text-sm font-medium">
          {formatPercentage(progress)}% Complete
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="bg-black/30 rounded-lg p-3">
          <DollarSign className="w-4 h-4 mx-auto mb-1 text-green-400" />
          <div className="text-lg font-bold text-green-400">
            {metrics?.profit_margin_avg || 0}%
          </div>
          <div className="text-xs opacity-70">Profit Margin</div>
        </div>

        <div className="bg-black/30 rounded-lg p-3">
          <TrendingUp className="w-4 h-4 mx-auto mb-1 text-blue-400" />
          <div className="text-lg font-bold text-blue-400">
            {metrics?.approved_products || 0}
          </div>
          <div className="text-xs opacity-70">Products Live</div>
        </div>

        <div className="bg-black/30 rounded-lg p-3">
          <Target className="w-4 h-4 mx-auto mb-1 text-purple-400" />
          <div className="text-lg font-bold text-purple-400">
            {Math.ceil((targetRevenue - currentRevenue) / 1000000)}M
          </div>
          <div className="text-xs opacity-70">To Target</div>
        </div>
      </div>

      {/* Revenue Milestones */}
      <div className="space-y-2">
        <div className="text-sm font-medium mb-2">Milestones</div>
        {[
          { amount: 1000000, label: "$1M" },
          { amount: 10000000, label: "$10M" },
          { amount: 50000000, label: "$50M" },
          { amount: 100000000, label: "$100M" }
        ].map((milestone) => {
          const reached = currentRevenue >= milestone.amount;
          const isNext = !reached && currentRevenue < milestone.amount;
          
          return (
            <div
              key={milestone.amount}
              className={`flex items-center justify-between p-2 rounded text-sm ${
                reached 
                  ? "bg-green-500/20 text-green-400" 
                  : isNext 
                    ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                    : "bg-gray-500/20 text-gray-400"
              }`}
            >
              <span>{milestone.label}</span>
              <div className="flex items-center space-x-2">
                {reached && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-4 h-4 rounded-full bg-green-400 flex items-center justify-center"
                  >
                    ✓
                  </motion.div>
                )}
                {isNext && (
                  <div className="w-4 h-4 rounded-full border-2 border-yellow-400 animate-pulse" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}