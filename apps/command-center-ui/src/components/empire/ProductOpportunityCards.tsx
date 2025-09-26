// Product Opportunity Cards Component - Real API Integration
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Eye, 
  ThumbsUp, 
  ThumbsDown,
  Info,
  Star
} from 'lucide-react';
import { useProductOpportunities, useEmpireStore } from '@/store/empire-store';
import { useToastContext } from '@/contexts/ToastContext';
import type { ProductOpportunity } from '@/types/empire';

export default function ProductOpportunityCards() {
  const opportunities = useProductOpportunities();
  const { approveProduct, rejectProduct, oppsLoading, oppsError } = useEmpireStore();
  const { success, error } = useToastContext();
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentOpportunity = opportunities[currentIndex];

  const handleApprove = async () => {
    if (currentOpportunity) {
      try {
        await approveProduct(currentOpportunity.id);
        success('Product Approved', `${currentOpportunity.title} has been approved for deployment`);
        // Move to next opportunity
        if (currentIndex < opportunities.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          setCurrentIndex(0);
        }
      } catch (err) {
        error('Approval Failed', 'Failed to approve product. Please try again.');
      }
    }
  };

  const handleReject = async () => {
    if (currentOpportunity) {
      try {
        await rejectProduct(currentOpportunity.id, 'Manual rejection from UI');
        success('Product Rejected', `${currentOpportunity.title} has been rejected`);
        // Move to next opportunity
        if (currentIndex < opportunities.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          setCurrentIndex(0);
        }
      } catch (err) {
        error('Rejection Failed', 'Failed to reject product. Please try again.');
      }
    }
  };

  const getTrendIcon = (score: number) => {
    return score >= 80 ? (
      <TrendingUp className="w-5 h-5 text-green-400" />
    ) : (
      <TrendingDown className="w-5 h-5 text-yellow-400" />
    );
  };

  const getProfitColor = (potential: string) => {
    switch (potential.toLowerCase()) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (oppsLoading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <div className="animate-spin w-16 h-16 mx-auto border-4 border-cyan-500 border-t-transparent rounded-full"></div>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Loading Opportunities</h3>
        <p className="text-gray-400">Analyzing market opportunities...</p>
      </div>
    );
  }

  if (oppsError) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <Info className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">Failed to Load Opportunities</h3>
        <p className="text-gray-400 mb-4">{oppsError}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-cyan-600/20 text-cyan-400 border border-cyan-600/30 rounded-lg hover:bg-cyan-600/30 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!currentOpportunity || opportunities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <Info className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No Opportunities Available</h3>
        <p className="text-gray-400">The market intelligence agents are analyzing new opportunities...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Product Opportunities</h3>
          <p className="text-sm text-gray-400">
            {currentIndex + 1} of {opportunities.length} opportunities
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Star className="w-5 h-5 text-yellow-400" />
          <span className="text-yellow-400 font-bold">{currentOpportunity.trend_score}</span>
          <span className="text-gray-400 text-sm">Trend Score</span>
        </div>
      </div>

      {/* Main Card */}
      <motion.div
        key={currentOpportunity.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-black/40 border border-cyan-500/30 rounded-lg p-6 backdrop-blur-md"
      >
        {/* Product Title */}
        <div className="mb-4">
          <h4 className="text-xl font-bold text-white mb-2">{currentOpportunity.title}</h4>
          <div className="flex items-center space-x-4 text-sm text-gray-400">
            <span>Source: {currentOpportunity.platform}</span>
            <span>•</span>
            <span>Competition: {currentOpportunity.competition_level}</span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div className="text-lg font-bold text-white">{currentOpportunity.price_range}</div>
            <div className="text-xs text-gray-400">Price Range</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              {getTrendIcon(currentOpportunity.trend_score)}
            </div>
            <div className="text-lg font-bold text-white">{currentOpportunity.trend_score}</div>
            <div className="text-xs text-gray-400">Trend Score</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Eye className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-lg font-bold text-white">
              {currentOpportunity.search_volume?.toLocaleString() || 'N/A'}
            </div>
            <div className="text-xs text-gray-400">Monthly Searches</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <TrendingUp className={`w-5 h-5 ${getProfitColor(currentOpportunity.profit_potential)}`} />
            </div>
            <div className={`text-lg font-bold ${getProfitColor(currentOpportunity.profit_potential)}`}>
              {currentOpportunity.profit_potential}
            </div>
            <div className="text-xs text-gray-400">Profit Potential</div>
          </div>
        </div>

        {/* Market Insights */}
        <div className="mb-6">
          <h5 className="font-semibold text-white mb-2">Market Insights</h5>
          <p className="text-gray-300 text-sm">{currentOpportunity.market_insights}</p>
        </div>

        {/* Supplier Leads */}
        <div className="mb-6">
          <h5 className="font-semibold text-white mb-2">Supplier Leads</h5>
          <div className="flex flex-wrap gap-2">
            {currentOpportunity.supplier_leads?.map((supplier, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full border border-blue-500/30"
              >
                {supplier}
              </span>
            )) || <span className="text-gray-400 text-sm">No suppliers available</span>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReject}
            className="flex-1 flex items-center justify-center space-x-2 py-3 px-6 bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg hover:bg-red-600/30 transition-colors"
          >
            <ThumbsDown className="w-5 h-5" />
            <span>Reject</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleApprove}
            className="flex-1 flex items-center justify-center space-x-2 py-3 px-6 bg-green-600/20 text-green-400 border border-green-600/30 rounded-lg hover:bg-green-600/30 transition-colors"
          >
            <ThumbsUp className="w-5 h-5" />
            <span>Approve for Shopify</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Navigation */}
      <div className="flex justify-center space-x-2">
        {opportunities.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full transition-colors ${index === currentIndex
              ? 'bg-cyan-400'
              : 'bg-gray-600 hover:bg-gray-500'
              }`}
          />
        ))}
      </div>
    </div>
  );
}
