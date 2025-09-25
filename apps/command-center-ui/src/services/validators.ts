// Runtime type guards and validators
import { 
  Agent, 
  EmpireMetrics, 
  ProductOpportunity, 
  MarketingCampaign, 
  AIRAResponse,
  AgentStatus,
  AgentType,
  HealthStatus,
  ProfitPotential
} from '../types/empire';

// Helper functions
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

function isValidAgentStatus(value: unknown): value is AgentStatus {
  return isString(value) && ['active', 'inactive', 'deploying', 'error'].includes(value);
}

function isValidAgentType(value: unknown): value is AgentType {
  return isString(value) && ['research', 'supplier', 'marketing', 'analytics', 'automation', 'monitoring'].includes(value);
}

function isValidHealthStatus(value: unknown): value is HealthStatus {
  return isString(value) && ['good', 'warning', 'critical'].includes(value);
}

function isValidProfitPotential(value: unknown): value is ProfitPotential {
  return isString(value) && ['High', 'Medium', 'Low'].includes(value);
}

// Type guards
export function isEmpireMetrics(obj: unknown): obj is EmpireMetrics {
  if (!obj || typeof obj !== 'object') return false;
  
  const metrics = obj as Record<string, unknown>;
  
  return (
    isNumber(metrics.total_agents) &&
    isNumber(metrics.active_agents) &&
    isNumber(metrics.total_opportunities) &&
    isNumber(metrics.approved_products) &&
    isNumber(metrics.revenue_progress) &&
    isNumber(metrics.target_revenue) &&
    isNumber(metrics.automation_level) &&
    isNumber(metrics.system_uptime) &&
    isNumber(metrics.daily_discoveries) &&
    isNumber(metrics.profit_margin_avg)
  );
}

export function isAgent(obj: unknown): obj is Agent {
  if (!obj || typeof obj !== 'object') return false;
  
  const agent = obj as Record<string, unknown>;
  
  return (
    isString(agent.id) &&
    isString(agent.name) &&
    isValidAgentType(agent.type) &&
    isValidAgentStatus(agent.status) &&
    isNumber(agent.performance_score) &&
    isNumber(agent.discoveries_count) &&
    isNumber(agent.success_rate) &&
    isValidHealthStatus(agent.health) &&
    isString(agent.emoji) &&
    (agent.last_execution === undefined || isValidDate(agent.last_execution))
  );
}

export function isProductOpportunity(obj: unknown): obj is ProductOpportunity {
  if (!obj || typeof obj !== 'object') return false;
  
  const opp = obj as Record<string, unknown>;
  
  return (
    isString(opp.id) &&
    isString(opp.title) &&
    isString(opp.description) &&
    isString(opp.price_range) &&
    isNumber(opp.trend_score) &&
    isValidProfitPotential(opp.profit_potential) &&
    isString(opp.platform) &&
    Array.isArray(opp.supplier_leads) &&
    opp.supplier_leads.every(isString) &&
    isString(opp.market_insights) &&
    isString(opp.competition_level) &&
    isNumber(opp.confidence_score) &&
    isNumber(opp.profit_margin) &&
    isNumber(opp.monthly_searches) &&
    (opp.search_volume === undefined || isNumber(opp.search_volume)) &&
    (opp.seasonal_factor === undefined || isString(opp.seasonal_factor))
  );
}

export function isMarketingCampaign(obj: unknown): obj is MarketingCampaign {
  if (!obj || typeof obj !== 'object') return false;
  
  const campaign = obj as Record<string, unknown>;
  
  return (
    isString(campaign.id) &&
    isString(campaign.product_id) &&
    isString(campaign.product_title) &&
    isString(campaign.platform) &&
    ['facebook', 'instagram', 'google', 'tiktok', 'twitter'].includes(campaign.platform as string) &&
    isString(campaign.format) &&
    ['image', 'video', 'carousel', 'story'].includes(campaign.format as string) &&
    isString(campaign.status) &&
    ['active', 'paused', 'completed', 'draft', 'error'].includes(campaign.status as string) &&
    isNumber(campaign.budget) &&
    isNumber(campaign.spent) &&
    isNumber(campaign.reach) &&
    isNumber(campaign.clicks) &&
    isNumber(campaign.conversions) &&
    isNumber(campaign.roas) &&
    isValidDate(campaign.created_at) &&
    campaign.content &&
    typeof campaign.content === 'object'
  );
}

export function isAIRAResponse(obj: unknown): obj is AIRAResponse {
  if (!obj || typeof obj !== 'object') return false;
  
  const response = obj as Record<string, unknown>;
  
  return (
    isString(response.content) &&
    isString(response.agent_name)
  );
}

// Array validators
export function isAgentArray(arr: unknown): arr is Agent[] {
  return Array.isArray(arr) && arr.every(isAgent);
}

export function isProductOpportunityArray(arr: unknown): arr is ProductOpportunity[] {
  return Array.isArray(arr) && arr.every(isProductOpportunity);
}

export function isMarketingCampaignArray(arr: unknown): arr is MarketingCampaign[] {
  return Array.isArray(arr) && arr.every(isMarketingCampaign);
}

// Validation wrapper that throws descriptive errors
export function validateAndTransform<T>(
  data: unknown,
  validator: (obj: unknown) => obj is T,
  context: string
): T {
  if (!validator(data)) {
    throw new Error(`Invalid data structure for ${context}: ${JSON.stringify(data, null, 2)}`);
  }
  return data;
}