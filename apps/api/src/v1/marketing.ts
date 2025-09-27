import { FastifyPluginAsync } from 'fastify';

// TikTok Ads API connector
export async function tiktokCampaigns(token: string, advertiserId: string) {
  const response = await fetch(`https://business-api.tiktok.com/open_api/v1.3/campaign/get/?advertiser_id=${advertiserId}`, {
    headers: { "Access-Token": token }
  });
  
  if (!response.ok) {
    throw new Error("TikTok API request failed");
  }
  
  return response.json();
}

// Meta Ads API connector
export async function metaCampaigns(token: string, actId: string) {
  const response = await fetch(`https://graph.facebook.com/v19.0/act_${actId}/campaigns?fields=name,status,daily_budget`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!response.ok) {
    throw new Error("Meta API request failed");
  }
  
  return response.json();
}

const marketingRoutes: FastifyPluginAsync = async (app) => {
  app.get("/marketing/campaigns", async (request) => {
    try {
      const { t: platform } = request.query as { t?: 'meta' | 'tiktok' };
      
      if (!platform || !['meta', 'tiktok'].includes(platform)) {
        throw new Error("Invalid platform. Use 'meta' or 'tiktok'");
      }

      let campaigns;
      
      if (platform === 'meta') {
        const token = process.env.META_ACCESS_TOKEN || 'demo_token';
        const actId = process.env.META_ACCOUNT_ID || 'demo_account';
        campaigns = await metaCampaigns(token, actId);
      } else if (platform === 'tiktok') {
        const token = process.env.TIKTOK_ACCESS_TOKEN || 'demo_token';
        const advertiserId = process.env.TIKTOK_ADVERTISER_ID || 'demo_advertiser';
        campaigns = await tiktokCampaigns(token, advertiserId);
      }
      
      return { 
        platform,
        campaigns,
        success: true 
      };
    } catch (error) {
      app.log.error(`Marketing campaigns fetch failed`);
      throw new Error("Failed to fetch campaigns");
    }
  });

  // Mock endpoint for all platforms
  app.get("/marketing/campaigns/all", async () => {
    return {
      meta: {
        total: 12,
        active: 8,
        paused: 4,
        spend_today: "$1,234.56"
      },
      tiktok: {
        total: 6,
        active: 4,
        paused: 2,
        spend_today: "$567.89"
      },
      google: {
        total: 15,
        active: 12,
        paused: 3,
        spend_today: "$2,100.00"
      }
    };
  });
};

export default marketingRoutes;