import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  PenTool, 
  TrendingUp, 
  Zap,
  Play,
  Pause,
  Settings,
  Eye
} from 'lucide-react';

interface Campaign {
  id: string;
  productId: string;
  productTitle: string;
  type: 'facebook' | 'instagram' | 'google' | 'tiktok' | 'twitter';
  format: 'image' | 'video' | 'carousel' | 'story';
  status: 'active' | 'paused' | 'completed' | 'draft';
  budget: number;
  reach: number;
  clicks: number;
  conversions: number;
  roas: number;
  createdAt: Date;
  content: {
    headline: string;
    description: string;
    callToAction: string;
    imageUrl?: string;
    videoUrl?: string;
  };
}

interface ContentTemplate {
  id: string;
  name: string;
  type: 'ad' | 'social-post' | 'email' | 'product-description';
  platform: string;
  template: string;
  performance: number;
}

export function MarketingStudio() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'content' | 'analytics' | 'automation'>('campaigns');
  const [isGenerating, setIsGenerating] = useState(false);
  const [contentTemplates, setContentTemplates] = useState<ContentTemplate[]>([]);

  // Load real campaigns from API
  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const response = await fetch('/api/marketing/campaigns', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('empire_token') || 'royal-empire-2024'}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          const apiCampaigns = result.campaigns.map((campaign: any) => ({
            id: campaign.id.toString(),
            productId: campaign.product_id,
            productTitle: campaign.product_title || 'Unknown Product',
            type: campaign.platform,
            format: campaign.format,
            status: campaign.status,
            budget: campaign.budget,
            reach: campaign.reach,
            clicks: campaign.clicks,
            conversions: campaign.conversions,
            roas: campaign.roas,
            createdAt: new Date(campaign.created_at),
            content: {
              headline: campaign.content?.headline || `${campaign.platform} Campaign`,
              description: campaign.content?.description || 'Campaign content',
              callToAction: campaign.content?.call_to_action || 'Shop Now',
              imageUrl: campaign.content?.image_url,
              videoUrl: campaign.content?.video_url
            }
          }));
          
          setCampaigns(apiCampaigns);
        } else {
          // Fallback to mock data
          setCampaigns(mockCampaigns);
        }
      } catch (error) {
        console.error('Failed to load campaigns:', error);
        setCampaigns(mockCampaigns);
      }
    };

    const loadTemplates = async () => {
      try {
        const response = await fetch('/api/marketing/templates', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('empire_token') || 'royal-empire-2024'}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          setContentTemplates(result.templates || mockTemplates);
        } else {
          setContentTemplates(mockTemplates);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
        setContentTemplates(mockTemplates);
      }
    };

    const mockCampaigns: Campaign[] = [
      {
        id: '1',
        productId: 'prod_1',
        productTitle: 'Portable Solar Power Bank',
        type: 'facebook',
        format: 'image',
        status: 'active',
        budget: 500,
        reach: 15420,
        clicks: 823,
        conversions: 47,
        roas: 3.2,
        createdAt: new Date('2024-01-15'),
        content: {
          headline: '🔋 Never Run Out of Power Again!',
          description: 'Portable solar power bank with wireless charging. Perfect for outdoor adventures!',
          callToAction: 'Shop Now',
          imageUrl: '/api/placeholder/400/300'
        }
      },
      {
        id: '2',
        productId: 'prod_2',
        productTitle: 'Smart Fitness Tracker',
        type: 'instagram',
        format: 'video',
        status: 'active',
        budget: 750,
        reach: 28350,
        clicks: 1456,
        conversions: 89,
        roas: 4.7,
        createdAt: new Date('2024-01-16'),
        content: {
          headline: '💪 Track Your Fitness Journey',
          description: 'Advanced fitness tracker with heart rate monitoring and GPS.',
          callToAction: 'Get Yours',
          videoUrl: '/api/video/fitness-tracker-demo'
        }
      }
    ];

    const mockTemplates: ContentTemplate[] = [
      {
        id: '1',
        name: 'High-Converting Product Ad',
        type: 'ad',
        platform: 'Facebook',
        template: '🔥 {product_name} - {benefit}\n\n✅ {feature_1}\n✅ {feature_2}\n✅ {feature_3}\n\n💰 Special Price: ${price}\n\n👆 {call_to_action}',
        performance: 94
      },
      {
        id: '2',
        name: 'Instagram Story Template',
        type: 'social-post',
        platform: 'Instagram',
        template: '📱 NEW ARRIVAL 📱\n\n{product_name}\n\n{emoji} {key_benefit}\n\nSwipe up to shop! 👆',
        performance: 87
      }
    ];

    loadCampaigns();
    loadTemplates();
  }, []);

  const generateContent = async (productId: string, platform: string, format: string) => {
    setIsGenerating(true);
    
    // Real API call to generate content
    try {
      const response = await fetch('/api/marketing/content/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('empire_token') || 'royal-empire-2024'}`
        },
        body: JSON.stringify({
          product_id: productId,
          platform: platform,
          format: format
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.detail || 'Content generation failed');
      }
      
      const newCampaign: Campaign = {
        id: `campaign_${Date.now()}`,
        productId,
        productTitle: result.content.product_title || 'Generated Product',
        type: platform as any,
        format: format as any,
        status: 'draft',
        budget: result.content.suggested_budget || 500,
        reach: 0,
        clicks: 0,
        conversions: 0,
        roas: 0,
        createdAt: new Date(),
        content: {
          headline: result.content.headline || 'AI Generated Headline',
          description: result.content.description || 'AI generated compelling product description...',
          callToAction: result.content.call_to_action || 'Shop Now',
          imageUrl: result.content.image_url,
          videoUrl: result.content.video_url
        }
      };
      
      setCampaigns(prev => [newCampaign, ...prev]);
      
    } catch (error) {
      console.error('Content generation error:', error);
      // Fallback to mock data if API fails
      const newCampaign: Campaign = {
        id: `campaign_${Date.now()}`,
        productId,
        productTitle: 'Generated Product',
        type: platform as any,
        format: format as any,
        status: 'error',
        budget: 0,
        reach: 0,
        clicks: 0,
        conversions: 0,
        roas: 0,
        createdAt: new Date(),
        content: {
          headline: 'Content Generation Failed',
          description: 'Please try again or contact support.',
          callToAction: 'Retry'
        }
      };
      
      setCampaigns(prev => [newCampaign, ...prev]);
    }

    setCampaigns(prev => [newCampaign, ...prev]);
    setIsGenerating(false);
  };

  const pauseCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('empire_token') || 'royal-empire-2024'}`
        }
      });
      
      if (response.ok) {
        setCampaigns(prev => prev.map(campaign => 
          campaign.id === campaignId 
            ? { ...campaign, status: 'paused' as const }
            : campaign
        ));
      }
    } catch (error) {
      console.error('Failed to pause campaign:', error);
    }
  };

  const resumeCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('empire_token') || 'royal-empire-2024'}`
        }
      });
      
      if (response.ok) {
        setCampaigns(prev => prev.map(campaign => 
          campaign.id === campaignId 
            ? { ...campaign, status: 'active' as const }
            : campaign
        ));
      }
    } catch (error) {
      console.error('Failed to resume campaign:', error);
    }
  };

  const deleteCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/marketing/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('empire_token') || 'royal-empire-2024'}`
        }
      });
      
      if (response.ok) {
        setCampaigns(prev => prev.filter(campaign => campaign.id !== campaignId));
      }
    } catch (error) {
      console.error('Failed to delete campaign:', error);
    }
  };

  const createCampaignFromTemplate = async (templateId: string, productId: string) => {
    try {
      const response = await fetch('/api/marketing/campaigns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('empire_token') || 'royal-empire-2024'}`
        },
        body: JSON.stringify({
          product_id: productId,
          platform: 'facebook',
          format: 'image',
          budget: 500,
          template_id: templateId
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        // Refresh campaigns list
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to create campaign from template:', error);
    }
  };

  const getCampaignIcon = (type: Campaign['type']) => {
    const icons = {
      facebook: '📘',
      instagram: '📷',
      google: '🔍',
      tiktok: '🎵',
      twitter: '🐦'
    };
    return icons[type];
  };

  const getStatusColor = (status: Campaign['status']) => {
    const colors = {
      active: 'text-green-400',
      paused: 'text-yellow-400',
      completed: 'text-blue-400',
      draft: 'text-gray-400'
    };
    return colors[status];
  };

  return (
    <div className="bg-black/40 backdrop-blur-md border border-cyan-500/30 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg">
            <PenTool className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Marketing Studio</h2>
            <p className="text-gray-400 text-sm">AI-Powered Content & Campaign Management</p>
          </div>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => generateContent('prod_new', 'facebook', 'image')}
          disabled={isGenerating}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium disabled:opacity-50"
        >
          {isGenerating ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Zap className="w-4 h-4" />
            </motion.div>
          ) : (
            'Generate Campaign'
          )}
        </motion.button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 mb-6 bg-black/20 rounded-lg p-1">
        {(['campaigns', 'content', 'analytics', 'automation'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-lg font-medium transition-all',
              activeTab === tab
                ? 'bg-purple-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'campaigns' && (
            <div className="space-y-4">
              {campaigns.map((campaign) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-black/30 border border-gray-700/50 rounded-lg p-4 hover:border-purple-500/50 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getCampaignIcon(campaign.type)}</span>
                      <div>
                        <h3 className="font-semibold text-white">{campaign.content.headline}</h3>
                        <p className="text-sm text-gray-400">{campaign.productTitle}</p>
                      </div>
                      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getStatusColor(campaign.status))}>
                        {campaign.status.toUpperCase()}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => campaign.status === 'active' ? pauseCampaign(campaign.id) : resumeCampaign(campaign.id)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        {campaign.status === 'active' ? 
                          <Pause className="w-4 h-4 text-yellow-400" /> : 
                          <Play className="w-4 h-4 text-green-400" />
                        }
                      </button>
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <Settings className="w-4 h-4 text-gray-400" />
                      </button>
                      <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <Eye className="w-4 h-4 text-blue-400" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Budget</p>
                      <p className="font-semibold text-white">${campaign.budget}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Reach</p>
                      <p className="font-semibold text-white">{campaign.reach.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Clicks</p>
                      <p className="font-semibold text-white">{campaign.clicks.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Conversions</p>
                      <p className="font-semibold text-white">{campaign.conversions}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">ROAS</p>
                      <p className={cn('font-semibold', campaign.roas >= 3 ? 'text-green-400' : 'text-yellow-400')}>
                        {campaign.roas}x
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contentTemplates.map((template) => (
                  <motion.div
                    key={template.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-black/30 border border-gray-700/50 rounded-lg p-4 hover:border-purple-500/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-white">{template.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">{template.platform}</span>
                        <span className={cn('px-2 py-1 rounded-full text-xs font-medium',
                          template.performance >= 90 ? 'bg-green-500/20 text-green-400' :
                          template.performance >= 80 ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        )}>
                          {template.performance}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-black/40 rounded-lg p-3 mb-3">
                      <p className="text-sm text-gray-300 font-mono">{template.template}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => createCampaignFromTemplate(template.id, 'prod_new')}
                        className="flex-1 px-3 py-2 bg-purple-600/20 text-purple-400 rounded-lg text-sm hover:bg-purple-600/30 transition-colors"
                      >
                        Use Template
                      </button>
                      <button className="px-3 py-2 bg-gray-600/20 text-gray-400 rounded-lg text-sm hover:bg-gray-600/30 transition-colors">
                        Edit
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Marketing Analytics</h3>
              <p className="text-gray-400">Advanced campaign analytics and performance insights coming soon...</p>
            </div>
          )}

          {activeTab === 'automation' && (
            <div className="text-center py-12">
              <Zap className="w-16 h-16 text-purple-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Marketing Automation</h3>
              <p className="text-gray-400">Automated campaign optimization and A/B testing coming soon...</p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}