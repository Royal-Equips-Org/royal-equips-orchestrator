import { FastifyPluginAsync } from 'fastify';

const opportunitiesRoutes: FastifyPluginAsync = async (app) => {
  app.get("/opportunities", async () => {
    return {
      opportunities: [
        {
          id: "opp_001",
          type: "price_optimization",
          title: "Increase margin on Electronics category",
          description: "Products with 15%+ demand increase could support 8-12% price increase",
          potential_revenue: 15420.50,
          confidence: 0.87,
          status: "pending",
          created_at: new Date(Date.now() - 86400000).toISOString(),
          agent_source: "product_research"
        },
        {
          id: "opp_002", 
          type: "inventory_restock",
          title: "Restock trending summer accessories", 
          description: "15 SKUs showing stockout risk with 25% demand surge expected",
          potential_revenue: 8750.00,
          confidence: 0.92,
          status: "processing",
          created_at: new Date(Date.now() - 43200000).toISOString(),
          agent_source: "inventory_pricing"
        },
        {
          id: "opp_003",
          type: "marketing_optimization", 
          title: "Reallocate Meta ads budget to TikTok",
          description: "TikTok showing 2.3x better ROAS for target demographic",
          potential_revenue: 3200.00,
          confidence: 0.81,
          status: "completed",
          created_at: new Date(Date.now() - 172800000).toISOString(),
          agent_source: "marketing"
        }
      ],
      summary: {
        total: 127,
        pending: 15,
        processing: 8,
        completed: 98,
        failed: 6,
        potential_revenue_total: 127450.75
      },
      categories: {
        "price_optimization": 45,
        "inventory_restock": 32,
        "marketing_optimization": 28,
        "product_research": 22
      }
    };
  });
  
  app.get("/opportunities/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    
    return reply.send({
      id,
      type: "price_optimization",
      title: "Increase margin on Electronics category",
      description: "Products with 15%+ demand increase could support 8-12% price increase",
      potential_revenue: 15420.50,
      confidence: 0.87,
      status: "pending",
      created_at: new Date(Date.now() - 86400000).toISOString(),
      agent_source: "product_research",
      details: {
        affected_products: 23,
        current_margin: "22%",
        suggested_margin: "28%",
        risk_factors: ["seasonal demand", "competitor pricing"],
        implementation_steps: [
          "Update product pricing",
          "Monitor conversion rates",
          "Adjust if performance drops"
        ]
      }
    });
  });
};

export default opportunitiesRoutes;