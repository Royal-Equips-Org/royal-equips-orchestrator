/**
 * AIRA Intelligence Module
 * 
 * Advanced AI consciousness and intelligence dashboard for Royal Equips.
 * Provides real-time insights into consciousness engine, digital twins,
 * and intelligent decision making capabilities.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { airaIntelligence, type ConsciousnessState, type IntelligenceMetrics, type BusinessDecision, type MarketIntelligence, type BusinessOptimization } from '../../services/airaIntelligenceService';

interface AIRAIntelligenceModuleProps {
  isActive: boolean;
}

export function AIRAIntelligenceModule({ isActive }: AIRAIntelligenceModuleProps) {
  const [consciousnessState, setConsciousnessState] = useState<ConsciousnessState | null>(null);
  const [intelligenceMetrics, setIntelligenceMetrics] = useState<IntelligenceMetrics | null>(null);
  const [marketIntelligence, setMarketIntelligence] = useState<MarketIntelligence | null>(null);
  const [recentDecisions, setRecentDecisions] = useState<BusinessDecision[]>([]);
  const [businessOptimization, setBusinessOptimization] = useState<BusinessOptimization | null>(null);
  const [autonomousMode, setAutonomousMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIntelligenceData = useCallback(async () => {
    if (!isActive) return;

    try {
      setLoading(true);
      setError(null);

      const [status, consciousness, market, metrics] = await Promise.all([
        airaIntelligence.getIntelligenceStatus(),
        airaIntelligence.getConsciousnessStatus(),
        airaIntelligence.getMarketIntelligence(),
        airaIntelligence.getIntelligenceMetrics()
      ]);

      setConsciousnessState(consciousness.consciousness_state);
      setIntelligenceMetrics(metrics.aira_metrics);
      setMarketIntelligence(market);
      setAutonomousMode(status.aira_intelligence.autonomous_mode);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch intelligence data');
      console.error('AIRA Intelligence data fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [isActive]);

  const fetchBusinessOptimization = useCallback(async () => {
    try {
      const optimization = await airaIntelligence.optimizeBusinessOperations([
        'revenue', 'efficiency', 'customer_satisfaction', 'cost_reduction'
      ]);
      setBusinessOptimization(optimization);
    } catch (err) {
      console.error('Business optimization error:', err);
    }
  }, []);

  const makeTestDecision = useCallback(async () => {
    try {
      const decision = await airaIntelligence.makeBusinessDecision({
        situation: {
          context: 'monthly_review',
          current_revenue: 50000,
          customer_satisfaction: 0.85,
          market_conditions: 'favorable'
        },
        available_actions: [
          'increase_marketing_spend',
          'expand_product_line',
          'optimize_pricing',
          'improve_customer_service',
          'enhance_website_ux'
        ],
        objectives: ['increase_revenue', 'improve_satisfaction', 'reduce_costs'],
        constraints: ['budget_limit_10000', 'timeline_30_days'],
        confidence_threshold: 0.7
      });

      if (decision) {
        setRecentDecisions(prev => [decision, ...prev.slice(0, 4)]);
      }
    } catch (err) {
      console.error('Test decision error:', err);
    }
  }, []);

  const toggleAutonomousMode = useCallback(async () => {
    try {
      const newMode = !autonomousMode;
      await airaIntelligence.configureAutonomousMode(newMode, 0.8);
      setAutonomousMode(newMode);
    } catch (err) {
      console.error('Autonomous mode toggle error:', err);
    }
  }, [autonomousMode]);

  useEffect(() => {
    fetchIntelligenceData();
    
    if (isActive) {
      const interval = setInterval(fetchIntelligenceData, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isActive, fetchIntelligenceData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-300 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">⚠️ AIRA Intelligence Error</div>
        <p className="text-gray-400 mb-4">{error}</p>
        <Button onClick={fetchIntelligenceData} variant="outline">
          Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            🧠 AIRA Intelligence
            <Badge variant={autonomousMode ? "success" : "secondary"}>
              {autonomousMode ? "Autonomous" : "Manual"}
            </Badge>
          </h2>
          <p className="text-gray-400 mt-1">
            AI-native consciousness and business intelligence system
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={toggleAutonomousMode} variant={autonomousMode ? "destructive" : "success"}>
            {autonomousMode ? "Disable Autonomous Mode" : "Enable Autonomous Mode"}
          </Button>
          <Button onClick={fetchIntelligenceData} variant="outline">
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Consciousness Status Cards */}
      {consciousnessState && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Awareness Level</p>
                <p className="text-lg font-semibold text-white capitalize">
                  {consciousnessState.awareness_level}
                </p>
              </div>
              <div className="text-2xl">👁️</div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Cognitive Load</p>
                <p className="text-lg font-semibold text-white">
                  {(consciousnessState.cognitive_load * 100).toFixed(1)}%
                </p>
              </div>
              <div className="text-2xl">🧠</div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className="bg-cyan-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${consciousnessState.cognitive_load * 100}%` }}
              ></div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Confidence Level</p>
                <p className="text-lg font-semibold text-white">
                  {(consciousnessState.confidence_level * 100).toFixed(1)}%
                </p>
              </div>
              <div className="text-2xl">⚡</div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${consciousnessState.confidence_level * 100}%` }}
              ></div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Decision Queue</p>
                <p className="text-lg font-semibold text-white">
                  {consciousnessState.decision_queue_depth}
                </p>
              </div>
              <div className="text-2xl">📋</div>
            </div>
          </Card>
        </div>
      )}

      {/* Intelligence Metrics */}
      {intelligenceMetrics && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Intelligence Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-cyan-400">{intelligenceMetrics.total_decisions}</p>
              <p className="text-sm text-gray-400">Total Decisions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-400">{intelligenceMetrics.autonomous_actions}</p>
              <p className="text-sm text-gray-400">Autonomous Actions</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-400">
                {(intelligenceMetrics.learning_progress * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-400">Learning Progress</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-400">
                {(intelligenceMetrics.system_intelligence_score * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-400">Intelligence Score</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-400">
                {(intelligenceMetrics.adaptation_success_rate * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-400">Adaptation Rate</p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs for detailed views */}
      <Tabs defaultValue="consciousness" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="consciousness">Consciousness</TabsTrigger>
          <TabsTrigger value="decisions">Decisions</TabsTrigger>
          <TabsTrigger value="market">Market Intel</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="twins">Digital Twins</TabsTrigger>
        </TabsList>

        <TabsContent value="consciousness" className="space-y-4">
          {consciousnessState && (
            <>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Current Focus & Goals</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Attention Focus</h4>
                    <div className="space-y-2">
                      {consciousnessState.attention_focus.map((focus, index) => (
                        <Badge key={index} variant="secondary">{focus}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Active Goals</h4>
                    <div className="space-y-2">
                      {consciousnessState.active_goals.map((goal, index) => (
                        <Badge key={index} variant="outline">{goal}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Memory Utilization</h3>
                <div className="w-full bg-gray-700 rounded-full h-4">
                  <div 
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-4 rounded-full transition-all duration-300" 
                    style={{ width: `${consciousnessState.memory_utilization * 100}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  {(consciousnessState.memory_utilization * 100).toFixed(1)}% of working memory utilized
                </p>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="decisions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Decision Making</h3>
            <Button onClick={makeTestDecision}>Make Test Decision</Button>
          </div>

          {recentDecisions.length > 0 ? (
            <div className="space-y-4">
              {recentDecisions.map((decision, index) => (
                <Card key={index} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-medium text-white">{decision.action}</h4>
                      <Badge variant="success">
                        Confidence: {(decision.confidence * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <Badge variant="outline">Priority: {decision.execution_priority}</Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <h5 className="text-sm font-medium text-gray-400 mb-1">Reasoning</h5>
                      <ul className="text-sm text-gray-300 space-y-1">
                        {decision.reasoning.map((reason, i) => (
                          <li key={i}>• {reason}</li>
                        ))}
                      </ul>
                    </div>
                    
                    {decision.alternatives.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-400 mb-1">Alternatives</h5>
                        <div className="flex flex-wrap gap-2">
                          {decision.alternatives.map((alt, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{alt}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-gray-400 mb-4">No recent decisions available</p>
              <Button onClick={makeTestDecision}>Make Test Decision</Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="market" className="space-y-4">
          {marketIntelligence ? (
            <div className="space-y-4">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Market Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Business Insights</h4>
                    <div className="space-y-1">
                      {Object.entries(marketIntelligence.business_insights).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="text-gray-400">{key}:</span>
                          <span className="text-white ml-2">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Market Predictions</h4>
                    <div className="space-y-1">
                      {Object.entries(marketIntelligence.market_predictions).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="text-gray-400">{key}:</span>
                          <span className="text-white ml-2">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-gray-400">Loading market intelligence...</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Business Optimization</h3>
            <Button onClick={fetchBusinessOptimization}>Generate Optimization</Button>
          </div>

          {businessOptimization ? (
            <div className="space-y-4">
              <Card className="p-6">
                <h4 className="text-lg font-medium text-white mb-4">ROI Projections</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-xl font-bold text-green-400">
                      ${businessOptimization.roi_projections.total_projected_savings.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-400">Projected Savings</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-red-400">
                      ${businessOptimization.roi_projections.implementation_cost.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-400">Implementation Cost</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-400">
                      {businessOptimization.roi_projections.net_roi.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-400">Net ROI</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-yellow-400">
                      {businessOptimization.roi_projections.payback_period}
                    </p>
                    <p className="text-sm text-gray-400">Payback Period</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h4 className="text-lg font-medium text-white mb-4">Implementation Roadmap</h4>
                <div className="space-y-3">
                  {businessOptimization.implementation_roadmap.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-800 rounded">
                      <div>
                        <p className="text-white font-medium">{item.optimization_id}</p>
                        <p className="text-sm text-gray-400">Duration: {item.estimated_duration}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">Priority: {item.priority}</Badge>
                        <p className="text-sm text-gray-400 mt-1">ROI: {item.expected_roi}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-gray-400 mb-4">No optimization data available</p>
              <Button onClick={fetchBusinessOptimization}>Generate Optimization</Button>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="twins" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Digital Twin Management</h3>
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">Digital twin interface coming soon...</p>
              <p className="text-sm text-gray-500">
                This will show active digital twins, their status, and prediction capabilities.
              </p>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AIRAIntelligenceModule;