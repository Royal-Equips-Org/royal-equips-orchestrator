import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PenTool, 
  Target, 
  TrendingUp, 
  Zap, 
  Play, 
  Pause, 
  BarChart3,
  Users,
  ShoppingBag,
  PlusCircle,
  Settings,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Eye
} from 'lucide-react';
import { useEmpireStore } from '../../store/empire-store';
import { shopifyService } from '../../services/shopify-service';
import { empireService } from '../../services/empire-service';

interface MarketingCampaign {
  id: string;
  name: string;
  platform: 'facebook' | 'instagram' | 'google' | 'tiktok' | 'twitter';
  status: 'active' | 'paused' | 'completed' | 'draft' | 'error';
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  conversions: number;
  productIds: string[];
  targetAudience: string;
  createdAt: string;
  updatedAt: string;
}

interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  totalSales: number;
  ordersCount: number;
  inventoryLevel: number;
}

interface CampaignCreationRequest {
  productIds: string[];
  platform: string;
  budget: number;
  targetAudience: string;
  campaignType: 'awareness' | 'conversion' | 'retargeting';
}

export default function MarketingStudioModule() {
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showCampaignCreator, setShowCampaignCreator] = useState(false);
  const [creatingCampaign, setCreatingCampaign] = useState(false);

  const { agents, isConnected } = useEmpireStore();

  // Load marketing data
  useEffect(() => {
    loadMarketingData();
  }, []);

  const loadMarketingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load campaigns from empire service
      const campaignsData = await empireService.fetchMarketingCampaigns();
      
      // Transform campaigns data to match our interface
      const transformedCampaigns: MarketingCampaign[] = campaignsData.map(campaign => ({
        id: campaign.id,
        name: `Campaign ${campaign.id}`, // Generate name since it's not in the API type
        platform: campaign.platform,
        status: campaign.status,
        budget: campaign.budget || 0,
        spent: campaign.spent || 0,
        impressions: campaign.reach || 0, // Use reach as impressions
        clicks: campaign.clicks || 0,
        conversions: campaign.conversions || 0,
        productIds: [campaign.product_id], // Convert single product_id to array
        targetAudience: 'General', // Default since not in API
        createdAt: campaign.created_at.toString(), // Convert Date to string
        updatedAt: campaign.created_at.toString() // Use created_at as fallback
      }));

      setCampaigns(transformedCampaigns);

      // Load Shopify products
      const shopifyMetrics = await shopifyService.fetchMetrics();
      setProducts(shopifyMetrics.topProducts);

    } catch (err) {
      console.error('Failed to load marketing data:', err);
      setError('Failed to load marketing data. Please check your connections.');
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async (request: CampaignCreationRequest) => {
    try {
      setCreatingCampaign(true);

      // Find marketing agents
      const marketingAgents = agents.filter(agent => 
        agent.type === 'marketing' || agent.name.toLowerCase().includes('marketing')
      );

      if (marketingAgents.length === 0) {
        throw new Error('No marketing agents available. Please ensure marketing agents are running.');
      }

      // Create campaign through empire service
      const campaignData = {
        name: `AI Generated Campaign - ${request.platform}`,
        platform: request.platform,
        budget: request.budget,
        target_audience: request.targetAudience,
        product_ids: request.productIds,
        campaign_type: request.campaignType,
        agent_id: marketingAgents[0].id
      };

      // Here we would call a real campaign creation endpoint
      // For now, simulate the creation
      const newCampaign: MarketingCampaign = {
        id: `campaign_${Date.now()}`,
        name: campaignData.name,
        platform: request.platform as any,
        status: 'draft',
        budget: request.budget,
        spent: 0,
        impressions: 0,
        clicks: 0,
        conversions: 0,
        productIds: request.productIds,
        targetAudience: request.targetAudience,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setCampaigns(prev => [newCampaign, ...prev]);
      setShowCampaignCreator(false);
      setSelectedProducts([]);

    } catch (err) {
      console.error('Failed to create campaign:', err);
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setCreatingCampaign(false);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'facebook': return '📘';
      case 'instagram': return '📷';
      case 'google': return '🔍';
      case 'tiktok': return '🎵';
      case 'twitter': return '🐦';
      default: return '📊';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'paused': return 'text-yellow-400';
      case 'completed': return 'text-blue-400';
      case 'draft': return 'text-gray-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return CheckCircle;
      case 'paused': return Pause;
      case 'completed': return CheckCircle;
      case 'draft': return Clock;
      case 'error': return AlertCircle;
      default: return AlertCircle;
    }
  };

  if (loading) {
    return (
      <div className="h-full bg-gradient-to-br from-gray-900/50 to-black/50 p-6">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-cyan-400">Loading Marketing Studio...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full bg-gradient-to-br from-gray-900/50 to-black/50 p-6">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-white text-lg font-bold mb-2">Marketing Studio Error</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={loadMarketingData}
              className="px-4 py-2 bg-cyan-500/20 border border-cyan-400 rounded-lg text-cyan-400 hover:bg-cyan-500/30 transition-colors"
            >
              Retry Loading
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gradient-to-br from-gray-900/50 to-black/50 overflow-auto">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="p-3 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-2xl border border-pink-400/30"
            >
              <PenTool className="w-6 h-6 text-pink-400" />
            </motion.div>
            <div>
              <h1 className="text-2xl font-bold text-white">Marketing Studio</h1>
              <p className="text-gray-400">AI-Powered Campaign Management & Shopify Integration</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-800/50 rounded-full">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-sm text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCampaignCreator(true)}
              disabled={selectedProducts.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/30 rounded-lg text-pink-400 hover:bg-pink-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PlusCircle className="w-4 h-4" />
              Create Campaign
            </motion.button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
        {/* Shopify Products Selection */}
        <div className="lg:col-span-1">
          <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center gap-3 mb-4">
              <ShoppingBag className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">Shopify Products</h3>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {products.map(product => (
                <motion.div
                  key={product.id}
                  whileHover={{ scale: 1.02 }}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedProducts.includes(product.id)
                      ? 'bg-cyan-500/20 border-cyan-400/50'
                      : 'bg-gray-700/30 border-gray-600/50 hover:border-gray-500/50'
                  }`}
                  onClick={() => {
                    setSelectedProducts(prev => 
                      prev.includes(product.id)
                        ? prev.filter(id => id !== product.id)
                        : [...prev, product.id]
                    );
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-white text-sm">{product.title}</h4>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <DollarSign className="w-3 h-3" />
                      {product.totalSales.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>{product.ordersCount} orders</span>
                    <span>{product.inventoryLevel} in stock</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {selectedProducts.length > 0 && (
              <div className="mt-4 p-3 bg-cyan-500/10 rounded-lg border border-cyan-400/30">
                <p className="text-sm text-cyan-400">
                  {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected for campaign
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="lg:col-span-2">
          <div className="bg-gray-800/30 rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-pink-400" />
                <h3 className="text-lg font-semibold text-white">Active Campaigns</h3>
              </div>
              <div className="text-sm text-gray-400">
                {campaigns.length} total campaigns
              </div>
            </div>

            <div className="space-y-4">
              {campaigns.map(campaign => {
                const StatusIcon = getStatusIcon(campaign.status);
                const roas = campaign.spent > 0 ? (campaign.conversions * 50) / campaign.spent : 0; // Simplified ROAS calculation

                return (
                  <motion.div
                    key={campaign.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getPlatformIcon(campaign.platform)}</span>
                        <div>
                          <h4 className="font-medium text-white">{campaign.name}</h4>
                          <p className="text-xs text-gray-400">{campaign.targetAudience}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`w-4 h-4 ${getStatusColor(campaign.status)}`} />
                        <span className={`text-sm capitalize ${getStatusColor(campaign.status)}`}>
                          {campaign.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Budget</p>
                        <p className="text-white font-medium">${campaign.budget.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Spent</p>
                        <p className="text-white font-medium">${campaign.spent.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Impressions</p>
                        <p className="text-white font-medium">{campaign.impressions.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">ROAS</p>
                        <p className="text-white font-medium">{roas.toFixed(2)}x</p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-xs text-gray-400">
                        {campaign.productIds.length} product{campaign.productIds.length > 1 ? 's' : ''} linked
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {campaigns.length === 0 && (
              <div className="text-center py-12">
                <Target className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-white mb-2">No Active Campaigns</h4>
                <p className="text-gray-400 mb-4">
                  Select products and create your first AI-powered marketing campaign
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Campaign Creator Modal */}
      <AnimatePresence>
        {showCampaignCreator && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => !creatingCampaign && setShowCampaignCreator(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <PlusCircle className="w-5 h-5 text-pink-400" />
                <h3 className="text-lg font-semibold text-white">Create AI Campaign</h3>
              </div>

              <CampaignCreatorForm
                selectedProducts={selectedProducts}
                onSubmit={createCampaign}
                onCancel={() => setShowCampaignCreator(false)}
                loading={creatingCampaign}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Campaign Creator Form Component
interface CampaignCreatorFormProps {
  selectedProducts: string[];
  onSubmit: (request: CampaignCreationRequest) => void;
  onCancel: () => void;
  loading: boolean;
}

function CampaignCreatorForm({ selectedProducts, onSubmit, onCancel, loading }: CampaignCreatorFormProps) {
  const [platform, setPlatform] = useState<string>('facebook');
  const [budget, setBudget] = useState<number>(1000);
  const [campaignType, setCampaignType] = useState<'awareness' | 'conversion' | 'retargeting'>('conversion');
  const [targetAudience, setTargetAudience] = useState<string>('Interested in technology and gadgets');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      productIds: selectedProducts,
      platform,
      budget,
      targetAudience,
      campaignType
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Platform</label>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-pink-400 focus:border-transparent"
          disabled={loading}
        >
          <option value="facebook">Facebook</option>
          <option value="instagram">Instagram</option>
          <option value="google">Google Ads</option>
          <option value="tiktok">TikTok</option>
          <option value="twitter">Twitter</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Campaign Type</label>
        <select
          value={campaignType}
          onChange={(e) => setCampaignType(e.target.value as any)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-pink-400 focus:border-transparent"
          disabled={loading}
        >
          <option value="awareness">Brand Awareness</option>
          <option value="conversion">Conversion Focused</option>
          <option value="retargeting">Retargeting</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Budget ($)</label>
        <input
          type="number"
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          min="100"
          max="50000"
          step="100"
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-pink-400 focus:border-transparent"
          disabled={loading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Target Audience</label>
        <textarea
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          rows={3}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-pink-400 focus:border-transparent"
          placeholder="Describe your target audience..."
          disabled={loading}
        />
      </div>

      <div className="text-sm text-gray-400 bg-gray-700/50 rounded-lg p-3">
        <p className="font-medium mb-1">AI Campaign Generation</p>
        <p>Our marketing agents will create optimized ad copy, visuals, and targeting for your selected {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''}.</p>
      </div>

      <div className="flex gap-3">
        <motion.button
          type="button"
          onClick={onCancel}
          disabled={loading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-600 transition-colors disabled:opacity-50"
        >
          Cancel
        </motion.button>
        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/30 rounded-lg text-pink-400 hover:bg-pink-500/30 transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Campaign'}
        </motion.button>
      </div>
    </form>
  );
}