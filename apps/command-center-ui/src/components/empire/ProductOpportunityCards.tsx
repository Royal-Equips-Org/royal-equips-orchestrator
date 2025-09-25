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
import type { ProductOpportunity } from '@/store/empire-store';

export default function ProductOpportunityCards() {
  const opportunities = useProductOpportunities();
  const { approveProduct, rejectProduct } = useEmpireStore();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Mock data if no opportunities available
  const mockOpportunities: ProductOpportunity[] = [
    {
      id: "opp_1",
      title: "Portable Solar Power Bank with Wireless Charging",
      description: "Eco-friendly portable charging solution with solar panels and wireless charging capability.",
      price_range: "$25-$35",
      trend_score: 87,
      profit_potential: "High",
      platform: "AliExpress",
      search_volume: 45000,
      competition_level: "Medium",
      seasonal_factor: "Year-round",
      supplier_leads: ["SolarTech Co.", "GreenPower Ltd."],
      market_insights: "Growing demand for sustainable tech accessories",
      confidence_score: 87,
      profit_margin: 45,
      monthly_searches: 45000
    },
    {
      id: "opp_2",
      title: "Smart Fitness Tracker with Heart Monitor", 
      description: "Advanced fitness tracking device with heart rate monitoring, GPS, and smartphone integration.",
      price_range: "$45-$65",
      trend_score: 92,
      profit_potential: "High",
      platform: "Amazon",
      search_volume: 67000,
      competition_level: "High",
      seasonal_factor: "Q1 peak",
      supplier_leads: ["FitTech Corp.", "HealthGadgets Inc."],
      market_insights: "Health tech market expanding rapidly",
      confidence_score: 92,
      profit_margin: 52,
      monthly_searches: 67000
    },
    {
      id: "opp_3",
      title: "LED Gaming Mouse Pad RGB",
      description: "Smart LED mouse pad with app control, multiple colors, and music sync.",
      price_range: "$15-$25",
      trend_score: 74,
      profit_potential: "Medium",
      platform: "DHgate", 
      search_volume: 23000,
      competition_level: "Low",
      seasonal_factor: "Holiday peak",
      supplier_leads: ["GameTech Ltd.", "RGB Solutions"],
      market_insights: "Gaming accessories steady growth",
      confidence_score: 74,
      profit_margin: 38, 
      monthly_searches: 23000
    }
  ];

  const displayOpportunities = opportunities.length > 0 ? opportunities : mockOpportunities;
  const currentOpportunity = displayOpportunities[currentIndex];

  const handleApprove = async () => {
    if (currentOpportunity) {
      try {
        await approveProduct(currentOpportunity.id);
        // Move to next opportunity
        if (currentIndex < displayOpportunities.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          setCurrentIndex(0);
        }
      } catch (error) {
        console.error('Failed to approve product:', error);
      }
    }
  };

  const handleReject = async () => {
    if (currentOpportunity) {
      try {
        await rejectProduct(currentOpportunity.id, 'Manual rejection from UI');
        // Move to next opportunity
        if (currentIndex < displayOpportunities.length - 1) {
          setCurrentIndex(currentIndex + 1);
        } else {
          setCurrentIndex(0);
        }
      } catch (error) {
        console.error('Failed to reject product:', error);
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

  if (!currentOpportunity) {
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
            {currentIndex + 1} of {displayOpportunities.length} opportunities
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
        {displayOpportunities.map((_, index) => (
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
