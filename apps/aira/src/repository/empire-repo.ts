// HYBRID STORE - Uses real Flask backend when available, falls back to in-memory data
import { randomUUID } from 'crypto';

export interface Agent {
  id: string;
  name: string;
  type: 'research' | 'supplier' | 'marketing' | 'analytics' | 'automation' | 'monitoring';
  status: 'active' | 'inactive' | 'deploying' | 'error';
  performance_score: number;
  discoveries_count: number;
  success_rate: number;
  last_execution?: Date;
  health: 'good' | 'warning' | 'critical';
  emoji: string;
}

export interface EmpireMetrics {
  total_agents: number;
  active_agents: number;
  total_opportunities: number;
  approved_products: number;
  revenue_progress: number;
  target_revenue: number;
  automation_level: number;
  system_uptime: number;
  daily_discoveries: number;
  profit_margin_avg: number;
  timestamp: string;
}

export interface ProductOpportunity {
  id: string;
  title: string;
  description: string;
  price_range: string;
  trend_score: number;
  profit_potential: 'High' | 'Medium' | 'Low';
  platform: string;
  supplier_leads: string[];
  market_insights: string;
  search_volume?: number;
  competition_level: string;
  seasonal_factor?: string;
  confidence_score: number;
  profit_margin: number;
  monthly_searches: number;
}

export interface MarketingCampaign {
  id: string;
  product_id: string;
  product_title: string;
  platform: 'facebook' | 'instagram' | 'google' | 'tiktok' | 'twitter';
  format: 'image' | 'video' | 'carousel' | 'story';
  status: 'active' | 'paused' | 'completed' | 'draft' | 'error';
  budget: number;
  spent: number;
  reach: number;
  clicks: number;
  conversions: number;
  roas: number;
  created_at: Date;
  content: {
    headline: string;
    description: string;
    call_to_action: string;
    image_url?: string;
    video_url?: string;
  };
}

// In-memory storage
class EmpireRepository {
  private agents: Agent[] = [];
  private metrics: EmpireMetrics;
  private opportunities: ProductOpportunity[] = [];
  private campaigns: MarketingCampaign[] = [];

  constructor() {
    // Initialize with default metrics
    this.metrics = {
      total_agents: 0,
      active_agents: 0,
      total_opportunities: 0,
      approved_products: 234,
      revenue_progress: 2400000,
      target_revenue: 100000000,
      automation_level: 65,
      system_uptime: 99.2,
      daily_discoveries: 47,
      profit_margin_avg: 35.5,
      timestamp: new Date().toISOString()
    };
  }

  // Flask backend integration methods
  private async fetchFromFlask<T>(endpoint: string): Promise<T | null> {
    try {
      const flaskBaseUrl = process.env.FLASK_API_URL || 'http://localhost:10000';
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${flaskBaseUrl}${endpoint}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`Flask API ${endpoint} returned ${response.status}: ${response.statusText}`);
        return null;
      }
      
      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`Flask API ${endpoint} request timed out`);
      } else {
        console.warn(`Failed to fetch from Flask ${endpoint}:`, error);
      }
      return null;
    }
  }

  private transformFlaskAgentToAgent(flaskAgent: any): Agent {
    return {
      id: flaskAgent.id || randomUUID(),
      name: flaskAgent.name || 'Unknown Agent',
      type: flaskAgent.type || 'monitoring',
      status: flaskAgent.status || 'inactive',
      performance_score: flaskAgent.performance_score || 0,
      discoveries_count: flaskAgent.discoveries_count || 0,
      success_rate: flaskAgent.success_rate || 0,
      last_execution: flaskAgent.last_execution ? new Date(flaskAgent.last_execution) : undefined,
      health: flaskAgent.health || 'warning',
      emoji: flaskAgent.emoji || '🤖'
    };
  }

  private transformFlaskOpportunityToOpportunity(flaskOpp: any): ProductOpportunity {
    return {
      id: flaskOpp.id || randomUUID(),
      title: flaskOpp.product_name || flaskOpp.title || 'Unknown Product',
      description: flaskOpp.description || 'No description available',
      price_range: flaskOpp.price_range || '$0-0',
      trend_score: flaskOpp.trend_score || 0,
      profit_potential: flaskOpp.profit_potential || 'Low',
      platform: flaskOpp.platform || 'Unknown',
      supplier_leads: flaskOpp.supplier_leads || [],
      market_insights: flaskOpp.market_insights || flaskOpp.market_demand || 'No insights available',
      search_volume: flaskOpp.search_volume,
      competition_level: flaskOpp.competition_level || `Score: ${flaskOpp.competition_score || 'N/A'}`,
      seasonal_factor: flaskOpp.seasonal_factor,
      confidence_score: flaskOpp.confidence_score || Math.round(flaskOpp.trend_score || 0),
      profit_margin: flaskOpp.profit_margin || flaskOpp.profit_potential_value || 0,
      monthly_searches: flaskOpp.monthly_searches || flaskOpp.search_volume || 0
    };
  }

  async getAgents(): Promise<Agent[]> {
    // Try to fetch real data from Flask backend first
    const flaskAgents = await this.fetchFromFlask<any>('/api/empire/agents');
    
    if (flaskAgents?.agents && Array.isArray(flaskAgents.agents)) {
      console.log('✅ Using real agents data from Flask backend');
      return flaskAgents.agents.map((agent: any) => this.transformFlaskAgentToAgent(agent));
    }
    
    // Fallback to in-memory data
    console.log('⚠️ Using fallback agents data (Flask backend unavailable)');
    if (this.agents.length === 0) {
      this.seed();
    }
    return this.agents;
  }

  async getMetrics(): Promise<EmpireMetrics> {
    // Try to fetch real data from Flask backend first
    const flaskMetrics = await this.fetchFromFlask<any>('/api/empire/metrics');
    
    if (flaskMetrics && typeof flaskMetrics === 'object') {
      console.log('✅ Using real metrics data from Flask backend');
      
      // Transform Flask metrics to match our interface
      return {
        total_agents: flaskMetrics.total_agents || 0,
        active_agents: flaskMetrics.active_agents || 0,
        total_opportunities: flaskMetrics.total_opportunities || 0,
        approved_products: flaskMetrics.approved_products || 0,
        revenue_progress: flaskMetrics.revenue_progress || 0,
        target_revenue: flaskMetrics.target_revenue || 100000000,
        automation_level: flaskMetrics.automation_level || 0,
        system_uptime: flaskMetrics.system_uptime || 0,
        daily_discoveries: flaskMetrics.daily_discoveries || 0,
        profit_margin_avg: flaskMetrics.profit_margin_avg || 0,
        timestamp: new Date().toISOString()
      };
    }
    
    // Fallback to in-memory data
    console.log('⚠️ Using fallback metrics data (Flask backend unavailable)');
    this.metrics.timestamp = new Date().toISOString();
    return this.metrics;
  }

  async getOpportunities(): Promise<ProductOpportunity[]> {
    // Try to fetch real data from Flask backend first
    const flaskOpportunities = await this.fetchFromFlask<any>('/api/empire/opportunities');
    
    if (flaskOpportunities?.opportunities && Array.isArray(flaskOpportunities.opportunities)) {
      console.log('✅ Using real opportunities data from Flask backend');
      return flaskOpportunities.opportunities.map((opp: any) => this.transformFlaskOpportunityToOpportunity(opp));
    }
    
    // Fallback to in-memory data
    console.log('⚠️ Using fallback opportunities data (Flask backend unavailable)');
    if (this.opportunities.length === 0) {
      this.seed();
    }
    return this.opportunities;
  }

  async getCampaigns(): Promise<MarketingCampaign[]> {
    // Try to fetch real data from Flask backend first
    const flaskCampaigns = await this.fetchFromFlask<any>('/api/empire/campaigns');
    
    if (flaskCampaigns?.campaigns && Array.isArray(flaskCampaigns.campaigns)) {
      console.log('✅ Using real campaigns data from Flask backend');
      // Transform Flask campaigns to match our interface (simplified mapping)
      return flaskCampaigns.campaigns.map((campaign: any) => ({
        id: campaign.id || randomUUID(),
        name: campaign.name || campaign.campaign_name || 'Unknown Campaign',
        platform: campaign.platform || 'Unknown',
        status: campaign.status || 'paused',
        budget: campaign.budget || campaign.daily_spend || 0,
        spent: campaign.spent || campaign.total_spent || 0,
        impressions: campaign.impressions || 0,
        clicks: campaign.clicks || 0,
        conversions: campaign.conversions || 0,
        roas: campaign.roas || 0,
        created_at: campaign.created_at ? new Date(campaign.created_at) : new Date(),
        content: {
          headline: campaign.headline || 'No headline',
          description: campaign.description || 'No description',
          call_to_action: campaign.call_to_action || 'Learn More',
          image_url: campaign.image_url,
          video_url: campaign.video_url
        }
      }));
    }
    
    // Fallback to in-memory data
    console.log('⚠️ Using fallback campaigns data (Flask backend unavailable)');
    if (this.campaigns.length === 0) {
      this.seed();
    }
    return this.campaigns;
  }

  // TODO: Migrate in-memory store to Postgres/Supabase.
  // Migration plan: Implement a Postgres/Supabase adapter for all CRUD operations.
  // Strategy: Phase 1 - implement read/write for agents; Phase 2 - migrate metrics, opportunities, campaigns.
  // Timeline: Target completion by end of Q2 2024. See issue #123 for details.
  seed() {
    console.log('🌱 Seeding Empire Repository with sample data...');
    
    // Seed agents
    this.agents = [
      {
        id: randomUUID(),
        name: 'ProductResearchAgent',
        type: 'research',
        status: 'active',
        performance_score: 94,
        discoveries_count: 127,
        success_rate: 89,
        last_execution: new Date(Date.now() - 2 * 60 * 1000), // 2 min ago
        health: 'good',
        emoji: '🔍'
      },
      {
        id: randomUUID(),
        name: 'PricingAgent',
        type: 'analytics',
        status: 'inactive',
        performance_score: 87,
        discoveries_count: 95,
        success_rate: 92,
        last_execution: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
        health: 'good',
        emoji: '💰'
      },
      {
        id: randomUUID(),
        name: 'InventoryAgent',
        type: 'monitoring',
        status: 'active',
        performance_score: 78,
        discoveries_count: 203,
        success_rate: 85,
        last_execution: new Date(Date.now() - 1 * 60 * 1000), // 1 min ago
        health: 'warning',
        emoji: '📦'
      },
      {
        id: randomUUID(),
        name: 'OrdersAgent',
        type: 'automation',
        status: 'active',
        performance_score: 96,
        discoveries_count: 89,
        success_rate: 94,
        last_execution: new Date(Date.now() - 30 * 1000), // 30 sec ago
        health: 'good',
        emoji: '📋'
      },
      {
        id: randomUUID(),
        name: 'MarketingAgent',
        type: 'marketing',
        status: 'active',
        performance_score: 91,
        discoveries_count: 156,
        success_rate: 88,
        last_execution: new Date(Date.now() - 5 * 1000), // 5 sec ago
        health: 'good',
        emoji: '📈'
      },
      {
        id: randomUUID(),
        name: 'SupplierAgent',
        type: 'supplier',
        status: 'active',
        performance_score: 85,
        discoveries_count: 142,
        success_rate: 91,
        last_execution: new Date(Date.now() - 10 * 1000), // 10 sec ago
        health: 'good',
        emoji: '🏭'
      }
    ];

    // Seed opportunities
    this.opportunities = [
      {
        id: randomUUID(),
        title: 'Wireless Phone Charger Stand',
        description: 'Fast-charging wireless stand with LED indicator and cooling fan. Growing demand in remote work accessories market.',
        price_range: '$25-35',
        trend_score: 89,
        profit_potential: 'High',
        platform: 'Amazon',
        supplier_leads: ['Shenzhen Tech Co.', 'Guangzhou Electronics Ltd.', 'Alibaba Group'],
        market_insights: 'Strong upward trend, low competition',
        search_volume: 45000,
        competition_level: 'Medium',
        seasonal_factor: 'Q4 Peak',
        confidence_score: 92,
        profit_margin: 45,
        monthly_searches: 45000
      },
      {
        id: randomUUID(),
        title: 'Smart Home Security Camera',
        description: '1080p HD wireless camera with night vision, motion detection, and cloud storage integration.',
        price_range: '$45-65',
        trend_score: 95,
        profit_potential: 'High',
        platform: 'eBay',
        supplier_leads: ['HIKVISION', 'Dahua Technology', 'TP-Link'],
        market_insights: 'Rapidly growing market, high customer satisfaction',
        search_volume: 78000,
        competition_level: 'High',
        seasonal_factor: 'Year-round',
        confidence_score: 88,
        profit_margin: 38,
        monthly_searches: 78000
      },
      {
        id: randomUUID(),
        title: 'Portable Solar Power Bank',
        description: '20,000mAh solar power bank with dual USB ports and flashlight functionality.',
        price_range: '$35-50',
        trend_score: 76,
        profit_potential: 'Medium',
        platform: 'Shopify',
        supplier_leads: ['Solar Power Inc.', 'Green Energy Co.', 'EcoTech Solutions'],
        market_insights: 'Seasonal demand, eco-conscious audience',
        search_volume: 32000,
        competition_level: 'Low',
        seasonal_factor: 'Summer Peak',
        confidence_score: 75,
        profit_margin: 42,
        monthly_searches: 32000
      }
    ];

    // Seed campaigns
    this.campaigns = [
      {
        id: randomUUID(),
        product_id: this.opportunities[0].id,
        product_title: 'Wireless Phone Charger Stand',
        platform: 'facebook',
        format: 'image',
        status: 'active',
        budget: 500,
        spent: 327,
        reach: 15420,
        clicks: 823,
        conversions: 47,
        roas: 3.2,
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        content: {
          headline: 'Charge Wirelessly, Work Efficiently',
          description: 'Transform your workspace with our premium wireless charging stand. Fast, safe, and stylish.',
          call_to_action: 'Shop Now',
          image_url: 'https://images.unsplash.com/photo-1609081219090-a6d81d3085bf?w=500'
        }
      },
      {
        id: randomUUID(),
        product_id: this.opportunities[1].id,
        product_title: 'Smart Home Security Camera',
        platform: 'google',
        format: 'video',
        status: 'active',
        budget: 800,
        spent: 445,
        reach: 28500,
        clicks: 1204,
        conversions: 89,
        roas: 4.1,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        content: {
          headline: 'Secure Your Home 24/7',
          description: 'Crystal clear HD monitoring with smart alerts. Peace of mind, wherever you are.',
          call_to_action: 'Get Protected',
          video_url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4'
        }
      }
    ];

    // Update metrics
    this.updateMetrics();
    
    console.log(`✅ Seeded ${this.agents.length} agents, ${this.opportunities.length} opportunities, ${this.campaigns.length} campaigns`);
  }

  private updateMetrics() {
    this.metrics = {
      ...this.metrics,
      total_agents: this.agents.length,
      active_agents: this.agents.filter(a => a.status === 'active').length,
      total_opportunities: this.opportunities.length,
      timestamp: new Date().toISOString()
    };
  }

  // Simulate transaction abstraction for future database implementation
  private runInTransaction<T>(fn: () => T): T {
    // In-memory: just run the function. Replace with DB transaction logic later.
    return fn();
  }

  approveOpportunity(id: string): boolean {
    return this.runInTransaction(() => {
      const opportunity = this.opportunities.find(o => o.id === id);
      if (opportunity) {
        // Remove from opportunities (simulate approval flow)
        this.opportunities = this.opportunities.filter(o => o.id !== id);
        this.metrics.approved_products += 1;
        this.updateMetrics();
        return true;
      }
      return false;
    });
  }

  rejectOpportunity(id: string, reason?: string): boolean {
    return this.runInTransaction(() => {
      const opportunity = this.opportunities.find(o => o.id === id);
      if (opportunity) {
        // Remove from opportunities (simulate rejection flow)
        this.opportunities = this.opportunities.filter(o => o.id !== id);
        this.updateMetrics();
        const sanitizedId = String(id).replace(/[\n\r]/g, '');
        const sanitizedReason = reason ? String(reason).replace(/[\n\r]/g, '') : 'No reason provided';
        console.log({
          event: 'opportunity_rejected',
          opportunityId: sanitizedId,
          reason: sanitizedReason
        });
        return true;
      }
      return false;
    });
  }
}

// Singleton instance
export const empireRepo = new EmpireRepository();