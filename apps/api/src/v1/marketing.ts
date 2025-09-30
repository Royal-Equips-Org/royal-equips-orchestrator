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
        const token = process.env.META_ACCESS_TOKEN;
        const actId = process.env.META_ACCOUNT_ID;
        if (!token || !actId) {
          return { success: false, error: 'Meta credentials not configured' };
        }
        campaigns = await metaCampaigns(token, actId);
      } else if (platform === 'tiktok') {
        const token = process.env.TIKTOK_ACCESS_TOKEN;
        const advertiserId = process.env.TIKTOK_ADVERTISER_ID;
        if (!token || !advertiserId) {
          return { success: false, error: 'TikTok credentials not configured' };
        }
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
};

export default marketingRoutes;