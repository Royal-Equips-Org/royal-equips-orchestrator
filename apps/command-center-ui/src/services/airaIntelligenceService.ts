/**
 * AIRA Intelligence Service
 * 
 * TypeScript client for the Enhanced AIRA Intelligence System.
 * Provides consciousness, digital twin, and intelligent decision capabilities.
 */

export interface ConsciousnessState {
  awareness_level: string;
  attention_focus: string[];
  active_goals: string[];
  cognitive_load: number;
  confidence_level: number;
  memory_utilization: number;
  decision_queue_depth: number;
}

export interface MemorySystem {
  working_memory_size: number;
  episodic_memory_size: number;
  semantic_memory_size: number;
}

export interface IntelligenceMetrics {
  total_decisions: number;
  autonomous_actions: number;
  learning_progress: number;
  system_intelligence_score: number;
  adaptation_success_rate: number;
}

export interface DigitalTwinStatus {
  twins_registry: Record<string, {
    name: string;
    type: string;
    mode: string;
    accuracy: number;
  }>;
  active_scenarios: Record<string, {
    name: string;
    status: string;
    twin_count: number;
  }>;
  performance_metrics: {
    active_twins: number;
    total_simulations: number;
    average_accuracy: number;
    prediction_success_rate: number;
    computation_efficiency: number;
  };
}

export interface BusinessDecision {
  action: string;
  confidence: number;
  reasoning: string[];
  expected_outcome: Record<string, any>;
  risk_assessment: Record<string, number>;
  alternatives: string[];
  execution_priority: number;
  resource_requirements: Record<string, any>;
}

export interface DecisionRequest {
  situation: Record<string, any>;
  available_actions: string[];
  objectives: string[];
  constraints?: string[];
  confidence_threshold?: number;
}

export interface MarketIntelligence {
  consciousness_insights: {
    awareness_level: string;
    attention_focus: string[];
    confidence_level: number;
    decision_queue_depth: number;
  };
  digital_twin_data: {
    market_overview: Record<string, any>;
    global_metrics: Record<string, any>;
    risk_assessment: Record<string, any>;
    opportunities: Record<string, any>;
  };
  market_predictions: Record<string, any>;
  business_insights: Record<string, any>;
}

export interface BusinessOptimization {
  optimizations: Record<string, {
    recommended_action?: string;
    confidence?: number;
    expected_impact?: Record<string, any>;
    implementation_priority?: number;
  }>;
  implementation_roadmap: Array<{
    optimization_id: string;
    priority: number;
    estimated_duration: string;
    resource_requirements: string;
    expected_roi: string;
  }>;
  roi_projections: {
    total_projected_savings: number;
    implementation_cost: number;
    net_roi: number;
    payback_period: string;
    confidence_level: number;
  };
}

export interface TwinPrediction {
  twin_id: string;
  metric: string;
  current_value: any;
  predicted_value: any;
  confidence: number;
  time_horizon: number;
  prediction_timestamp: string;
}

export interface ScenarioTestRequest {
  scenario_id: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
  twin_ids: string[];
  duration_hours?: number;
}

export interface CreateTwinRequest {
  twin_id: string;
  twin_type: 'business_process' | 'customer_behavior' | 'market_dynamics' | 'financial_model' | 'operational_system' | 'product_lifecycle';
  name: string;
  description: string;
  data_sources: string[];
  key_metrics: string[];
}

export interface LearningRequest {
  action_taken: string;
  expected_outcome: Record<string, any>;
  actual_outcome: Record<string, any>;
  context?: Record<string, any>;
}

export class AIRAIntelligenceService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api/aira-intelligence') {
    this.baseUrl = baseUrl;
  }

  /**
   * Get comprehensive AIRA intelligence status
   */
  async getIntelligenceStatus(): Promise<{
    aira_intelligence: {
      status: string;
      current_task: string;
      autonomous_mode: boolean;
      last_execution?: string;
    };
    intelligence_metrics: IntelligenceMetrics;
    consciousness_status: {
      consciousness_state: ConsciousnessState;
      memory_systems: MemorySystem;
      learning_progress: Record<string, any>;
      performance_metrics: Record<string, any>;
    };
    digital_twin_status: DigitalTwinStatus;
  }> {
    const response = await fetch(`${this.baseUrl}/status`);
    if (!response.ok) {
      throw new Error(`Failed to get intelligence status: ${response.statusText}`);
    }
    const result = await response.json();
    return result.data;
  }

  /**
   * Get consciousness engine status
   */
  async getConsciousnessStatus(): Promise<{
    consciousness_state: ConsciousnessState;
    memory_systems: MemorySystem;
    learning_progress: Record<string, any>;
    performance_metrics: Record<string, any>;
    decision_history_size: number;
    engine_status: string;
  }> {
    const response = await fetch(`${this.baseUrl}/consciousness/status`);
    if (!response.ok) {
      throw new Error(`Failed to get consciousness status: ${response.statusText}`);
    }
    const result = await response.json();
    return result.consciousness;
  }

  /**
   * Get digital twin engine status
   */
  async getDigitalTwinStatus(): Promise<DigitalTwinStatus> {
    const response = await fetch(`${this.baseUrl}/digital-twin/status`);
    if (!response.ok) {
      throw new Error(`Failed to get digital twin status: ${response.statusText}`);
    }
    const result = await response.json();
    return result.digital_twin;
  }

  /**
   * Make an intelligent business decision
   */
  async makeBusinessDecision(request: DecisionRequest): Promise<BusinessDecision | null> {
    const response = await fetch(`${this.baseUrl}/decision/make`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to make decision: ${response.statusText}`);
    }

    const result = await response.json();
    return result.status === 'success' ? result.decision : null;
  }

  /**
   * Get comprehensive market intelligence
   */
  async getMarketIntelligence(): Promise<MarketIntelligence> {
    const response = await fetch(`${this.baseUrl}/market-intelligence`);
    if (!response.ok) {
      throw new Error(`Failed to get market intelligence: ${response.statusText}`);
    }
    const result = await response.json();
    return result.market_intelligence;
  }

  /**
   * Optimize business operations
   */
  async optimizeBusinessOperations(focusAreas?: string[]): Promise<BusinessOptimization> {
    const response = await fetch(`${this.baseUrl}/optimize/business`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ focus_areas: focusAreas }),
    });

    if (!response.ok) {
      throw new Error(`Failed to optimize business operations: ${response.statusText}`);
    }

    const result = await response.json();
    return result.optimization;
  }

  /**
   * Learn from business outcomes
   */
  async learnFromOutcome(request: LearningRequest): Promise<void> {
    const response = await fetch(`${this.baseUrl}/learn/outcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to learn from outcome: ${response.statusText}`);
    }
  }

  /**
   * Create a new digital twin
   */
  async createDigitalTwin(request: CreateTwinRequest): Promise<void> {
    const response = await fetch(`${this.baseUrl}/twin/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to create digital twin: ${response.statusText}`);
    }
  }

  /**
   * Get prediction for a twin metric
   */
  async getTwinPrediction(twinId: string, metric: string, hours: number = 24): Promise<TwinPrediction | null> {
    const response = await fetch(`${this.baseUrl}/twin/prediction/${encodeURIComponent(twinId)}/${encodeURIComponent(metric)}?hours=${hours}`);
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to get twin prediction: ${response.statusText}`);
    }

    const result = await response.json();
    return result.prediction;
  }

  /**
   * Run scenario test
   */
  async runScenarioTest(request: ScenarioTestRequest): Promise<any> {
    const response = await fetch(`${this.baseUrl}/scenario/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to run scenario test: ${response.statusText}`);
    }

    const result = await response.json();
    return result.scenario_results;
  }

  /**
   * Configure autonomous decision mode
   */
  async configureAutonomousMode(enabled: boolean, confidenceThreshold: number = 0.8): Promise<void> {
    const response = await fetch(`${this.baseUrl}/config/autonomous`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        enabled,
        confidence_threshold: confidenceThreshold,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to configure autonomous mode: ${response.statusText}`);
    }
  }

  /**
   * Get intelligence metrics
   */
  async getIntelligenceMetrics(): Promise<{
    aira_metrics: IntelligenceMetrics;
    consciousness_metrics: Record<string, any>;
    digital_twin_metrics: Record<string, any>;
  }> {
    const response = await fetch(`${this.baseUrl}/metrics/intelligence`);
    if (!response.ok) {
      throw new Error(`Failed to get intelligence metrics: ${response.statusText}`);
    }
    const result = await response.json();
    return result.metrics;
  }

  /**
   * Health check for AIRA intelligence
   */
  async healthCheck(): Promise<{
    status: string;
    components: {
      aira_intelligence: string;
      consciousness_engine: string;
      digital_twin_engine: string;
      autonomous_mode: boolean;
      last_execution?: string;
    };
  }> {
    const response = await fetch(`${this.baseUrl}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }
    return response.json();
  }
}

// Export singleton instance
export const airaIntelligence = new AIRAIntelligenceService();