import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useEmpireStore } from '@/store/empire-store';
import { PenTool, TrendingUp, Zap } from 'lucide-react';

export function MarketingStudio() {
  const { 
    marketingCampaigns: campaigns, 
    campaignsLoading, 
    campaignsError, 
    loadMarketingCampaigns 
  } = useEmpireStore();

  useEffect(() => {
    loadMarketingCampaigns();
  }, [loadMarketingCampaigns]);

  const getCampaignIcon = (platform: string) => {
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
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  if (campaignsLoading) {
    return (
      <div className="glass-panel h-full rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-6">
          <PenTool className="w-5 h-5 text-hologram" />
          <h2 className="text-lg font-bold hologram-text">MARKETING STUDIO</h2>
        </div>
        <div className="text-center py-8">
          <div className="text-hologram">Loading marketing campaigns...</div>
        </div>
      </div>
    );
  }

  if (campaignsError) {
    return (
      <div className="glass-panel h-full rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-6">
          <PenTool className="w-5 h-5 text-hologram" />
          <h2 className="text-lg font-bold hologram-text">MARKETING STUDIO</h2>
        </div>
        <div className="text-center py-8">
          <div className="text-red-400">Failed to load campaigns</div>
          <div className="text-xs text-gray-400 mt-2">{campaignsError}</div>
          <button 
            onClick={() => loadMarketingCampaigns()}
            className="mt-4 px-4 py-2 bg-hologram bg-opacity-20 text-hologram rounded hover:bg-opacity-30 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel h-full rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <PenTool className="w-5 h-5 text-hologram" />
          <h2 className="text-lg font-bold hologram-text">MARKETING STUDIO</h2>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-400">
          <TrendingUp className="w-4 h-4" />
          <span>{campaigns.length} Active Campaigns</span>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400">No marketing campaigns yet</div>
          <div className="text-xs text-gray-500 mt-2">Start creating campaigns to reach your audience</div>
        </div>
      ) : (
        <div className="space-y-4 max-h-[calc(100%-120px)] overflow-y-auto">
          {campaigns.map((campaign) => (
            <motion.div
              key={campaign.id}
              className="hologram-border rounded-lg p-4 hover:bg-hologram hover:bg-opacity-5 transition-colors"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getCampaignIcon(campaign.platform)}</span>
                  <div>
                    <h3 className="font-semibold text-white">{campaign.product_title}</h3>
                    <p className="text-sm text-gray-400 capitalize">{campaign.platform} • {campaign.format}</p>
                  </div>
                </div>
                <span className={`text-xs uppercase font-medium ${getStatusColor(campaign.status)}`}>
                  {campaign.status}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-400">Budget</div>
                  <div className="font-semibold text-green-400">${campaign.budget}</div>
                </div>
                <div>
                  <div className="text-gray-400">Reach</div>
                  <div className="font-semibold">{campaign.reach.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-400">Clicks</div>
                  <div className="font-semibold text-blue-400">{campaign.clicks.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-400">ROAS</div>
                  <div className="font-semibold text-purple-400">{campaign.roas}x</div>
                </div>
              </div>

              <div className="mt-3 p-3 bg-black bg-opacity-30 rounded">
                <div className="text-sm">
                  <div className="font-medium text-white mb-1">{campaign.content.headline}</div>
                  <div className="text-gray-400 text-xs">{campaign.content.description}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-hologram border-opacity-30">
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          <div>
            <div className="text-green-400 font-bold">
              {campaigns.filter(c => c.status === 'active').length}
            </div>
            <div className="opacity-70">Active</div>
          </div>
          <div>
            <div className="text-yellow-400 font-bold">
              {campaigns.filter(c => c.status === 'paused').length}
            </div>
            <div className="opacity-70">Paused</div>
          </div>
          <div>
            <div className="text-blue-400 font-bold">
              {campaigns.filter(c => c.status === 'completed').length}
            </div>
            <div className="opacity-70">Completed</div>
          </div>
        </div>
      </div>
    </div>
  );
}