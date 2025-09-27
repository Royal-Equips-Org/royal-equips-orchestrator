import { FastifyPluginAsync } from 'fastify';
import { register } from 'prom-client';
import fs from 'fs/promises';
import path from 'path';
import rateLimit from '@fastify/rate-limit';
const metricsRoutes: FastifyPluginAsync = async (app) => {
  // Register rate limit plugin
  await app.register(rateLimit);

  app.get("/metrics", async (_, reply) => {
    reply.type("text/plain");
    return await register.metrics();
  });

  // Function to get latest shopify data for KPIs
  async function getLatestShopifyData(type: 'products' | 'analysis') {
    try {
      const dataDir = getShopifyDataDir();
      const files = await fs.readdir(dataDir);
      const typeFiles = files.filter(f => f.startsWith(`${type}_`) && f.endsWith('.json'));
      
      if (typeFiles.length === 0) {
        return null;
      }
      
      // Sort by date (latest first)
      typeFiles.sort().reverse();
      const latestFile = typeFiles[0];
      
      const content = await fs.readFile(path.join(dataDir, latestFile), 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      app.log.warn(`Failed to read ${type} data: ${error}`);
      return null;
    }
  }

  // KPIs summary endpoint for Command Center
  app.get("/summary/kpis", {
    preHandler: rateLimit({
      max: 100, // max 100 requests per window
      timeWindow: 15 * 60 * 1000 // 15 minutes
    })
  }, async () => {
    try {
      const [productsData, analysisData] = await Promise.all([
        getLatestShopifyData('products'),
        getLatestShopifyData('analysis')
      ]);

      let kpis: any = {
        timestamp: new Date().toISOString(),
        revenue: {
          today: 15420.30,
          mtd: 124500.80,
          ytd: 850000.25
        },
        margin: {
          percentage: 24.5,
          amount: 35000.12
        },
        ltv: {
          average: 350.75,
          segments: {
            premium: 580.40,
            standard: 220.30
          }
        },
        agents: {
          total: 5,
          active: 4,
          healthy: 4,
          up: true
        },
        webhooks: {
          processed_today: 1547,
          avg_lag_ms: 125,
          error_rate: 0.02
        },
        products: {
          total: 0,
          active: 0,
          avg_price: 0,
          categories: 0
        },
        source: 'mock_data'
      };

      // Update KPIs with real Shopify data if available
      if (productsData && Array.isArray(productsData)) {
        const activeProducts = productsData.filter((p: any) => p.status === 'ACTIVE');
        const totalValue = productsData.reduce((sum: number, p: any) => {
          const price = parseFloat(p.variants?.edges?.[0]?.node?.price || '0');
          return sum + price;
        }, 0);

        kpis.products = {
          total: productsData.length,
          active: activeProducts.length,
          avg_price: productsData.length > 0 ? totalValue / productsData.length : 0,
          categories: new Set(productsData.map((p: any) => p.category?.id).filter(Boolean)).size
        };

        // Estimate revenue based on product data
        const estimatedMonthlyRevenue = activeProducts.length * (kpis.products.avg_price * 10); // Assume 10 sales per product per month
        kpis.revenue.mtd = estimatedMonthlyRevenue;
        kpis.revenue.ytd = estimatedMonthlyRevenue * 8; // Estimate 8 months YTD

        kpis.source = 'shopify_data';
      }

      // Add analysis-based insights
      if (analysisData?.summary) {
        const summary = analysisData.summary;
        if (summary.total_products) {
          kpis.products.total = summary.total_products;
          kpis.products.active = summary.active_products || summary.total_products;
          kpis.products.avg_price = summary.avg_price || 0;
        }

        // Calculate opportunities impact
        if (analysisData.opportunities) {
          const totalOpportunityValue = analysisData.opportunities.reduce(
            (sum: number, opp: any) => sum + (opp.potential_revenue || 0), 0
          );
          kpis.revenue.potential_increase = totalOpportunityValue;
        }

        kpis.source = 'shopify_analysis';
      }

      return kpis;
    } catch (error) {
      app.log.error('Failed to fetch KPIs');
      
      // Return fallback data
      return {
        timestamp: new Date().toISOString(),
        revenue: {
          today: 15420.30,
          mtd: 124500.80,
          ytd: 850000.25
        },
        margin: {
          percentage: 24.5,
          amount: 35000.12
        },
        ltv: {
          average: 350.75,
          segments: {
            premium: 580.40,
            standard: 220.30
          }
        },
        agents: {
          total: 5,
          active: 4,
          healthy: 4,
          up: true
        },
        webhooks: {
          processed_today: 1547,
          avg_lag_ms: 125,
          error_rate: 0.02
        },
        products: {
          total: 0,
          active: 0,
          avg_price: 0,
          categories: 0
        },
        source: 'fallback_data',
        error: 'Failed to load real data'
      };
    }
  });
};

export default metricsRoutes;