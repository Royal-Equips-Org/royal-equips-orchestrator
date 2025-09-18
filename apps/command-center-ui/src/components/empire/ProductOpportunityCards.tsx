// Product Opportunity Cards Component - Simplified Version
import { useState } from 'react';
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
import { usePendingProducts, useEmpireStore } from '@/store/empire-store';
import type { ProductOpportunity } from '@/types/empire';

// Mock product opportunities
const mockProducts: ProductOpportunity[] = [
  {
    id: "prod_001",
    title: "Portable Solar Power Bank with Wireless Charging",
    price_range: "$25-$35",
    trend_score: 87,
    profit_potential: "High",
    source_platform: "Amazon",
    search_volume: 45000,
    competition_level: "Medium",
    seasonal_factor: "Year-round",
    supplier_leads: ["SolarTech Co.", "GreenPower Ltd.", "EcoCharge Inc."],
    market_insights: "Growing demand for eco-friendly tech accessories. Peak season during outdoor activities.",
    image_url: "/api/placeholder/300/200",
    category: "Electronics",
    estimated_profit_margin: 45,
    risk_level: "Low",
    approval_status: "pending",
    discovered_at: new Date()
  },
  {
    id: "prod_002", 
    title: "Ergonomic Standing Desk Converter",
    price_range: "$120-$180",
    trend_score: 92,
    profit_potential: "High",
    source_platform: "eBay",
    search_volume: 28000,
    competition_level: "Low",
    seasonal_factor: "Q1 peak (New Year resolutions)",
    supplier_leads: ["WorkWell Systems", "ErgoDesk Pro"],
    market_insights: "Remote work trend driving demand. Health-conscious professionals main target.",
    category: "Home Office",
    estimated_profit_margin: 38,
    risk_level: "Low",
    approval_status: "pending",
    discovered_at: new Date()
  },
  {
    id: "prod_003",
    title: "Smart Garden Watering System",
    price_range: "$85-$115",
    trend_score: 79,
    profit_potential: "Medium",
    source_platform: "Shopify",
    search_volume: 18500,
    competition_level: "High",
    seasonal_factor: "Spring/Summer peak",
    supplier_leads: ["GardenTech Solutions", "SmartGrow Co."],
    market_insights: "Urban gardening trend growing. Smart home integration important.",
    category: "Home & Garden",
    estimated_profit_margin: 32,
    risk_level: "Medium",
    approval_status: "pending",
    discovered_at: new Date()
  }
];

function ProductCard({ product, onApprove, onReject }: {
  product: ProductOpportunity;
  onApprove: () => void;
  onReject: () => void;
}) {
  const getProfitColor = () => {
    switch (product.profit_potential) {
      case 'High':
        return 'text-green-400';
      case 'Medium':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTrendIcon = () => {
    return product.trend_score > 75 ? 
      <TrendingUp className="w-4 h-4 text-green-400" /> :
      <TrendingDown className="w-4 h-4 text-red-400" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-6 mb-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-2 line-clamp-2">
            {product.title}
          </h3>
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-hologram font-medium">{product.price_range}</span>
            <span className={getProfitColor()}>
              {product.profit_potential} Profit
            </span>
          </div>
        </div>
        
        <div className="text-right">
          <div className="flex items-center space-x-1 mb-1">
            {getTrendIcon()}
            <span className="text-xl font-bold">{product.trend_score}</span>
          </div>
          <div className="text-xs opacity-70">Trend Score</div>
        </div>
      </div>

      {/* Product Image Placeholder */}
      <div className="w-full h-32 bg-gradient-to-br from-blue-900/20 to-purple-900/20 rounded-lg mb-4 flex items-center justify-center">
        <div className="text-4xl">📦</div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Eye className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-sm font-medium">
            {product.search_volume ? `${(product.search_volume / 1000).toFixed(0)}K` : 'N/A'}
          </div>
          <div className="text-xs opacity-70">Monthly Searches</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <DollarSign className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-sm font-medium">{product.estimated_profit_margin}%</div>
          <div className="text-xs opacity-70">Profit Margin</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Star className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-sm font-medium">{product.competition_level}</div>
          <div className="text-xs opacity-70">Competition</div>
        </div>
      </div>

      {/* Market Insights */}
      <div className="mb-4">
        <p className="text-sm text-gray-300 line-clamp-3">
          {product.market_insights}
        </p>
      </div>

      {/* Suppliers */}
      <div className="mb-4">
        <div className="text-xs opacity-70 mb-1">Supplier Leads:</div>
        <div className="flex flex-wrap gap-1">
          {product.supplier_leads.slice(0, 2).map((supplier, i) => (
            <span key={i} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
              {supplier}
            </span>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onReject}
          className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg border border-red-500/30 flex items-center space-x-2"
        >
          <ThumbsDown className="w-4 h-4" />
          <span>Reject</span>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg border border-blue-500/30 flex items-center space-x-2"
        >
          <Info className="w-4 h-4" />
          <span>More Info</span>
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onApprove}
          className="px-6 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg border border-green-500/30 flex items-center space-x-2"
        >
          <ThumbsUp className="w-4 h-4" />
          <span>Approve</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function ProductOpportunityCards() {
  const pendingProducts = usePendingProducts();
  const { approveProduct, rejectProduct } = useEmpireStore();
  
  // Use mock data if no products in store yet
  const displayProducts = pendingProducts.length > 0 ? pendingProducts : mockProducts;
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleApprove = (productId: string) => {
    approveProduct(productId);
    setCurrentIndex(prev => prev + 1);
  };

  const handleReject = (productId: string) => {
    rejectProduct(productId, 'Manually rejected');
    setCurrentIndex(prev => prev + 1);
  };

  const visibleProducts = displayProducts.slice(currentIndex, currentIndex + 1);

  if (visibleProducts.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
          <p className="text-gray-400">No pending product opportunities at the moment.</p>
          <p className="text-sm text-gray-500 mt-2">
            Agents are discovering new opportunities...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="text-hologram font-medium">{displayProducts.length}</span>
          <span className="text-gray-400 ml-1">opportunities pending</span>
        </div>
        <div className="text-gray-400">
          Product {currentIndex + 1} of {displayProducts.length}
        </div>
      </div>

      {/* Current Product */}
      {visibleProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onApprove={() => handleApprove(product.id)}
          onReject={() => handleReject(product.id)}
        />
      ))}
    </div>
  );
}