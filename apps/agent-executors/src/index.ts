import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { pino } from 'pino';
import { ShopifyConnector } from '@royal-equips/connectors';
import { ProductResearchAgent, OrderManagementAgent, InventoryManagementAgent } from './agents/index.js';

// Load environment variables
config();

const app = express();
const PORT = process.env.AGENT_EXECUTORS_PORT || 3003;
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Shopify connector
const shopifyDomain = process.env.SHOPIFY_STORE || '';
const shopifyAccessToken = process.env.SHOPIFY_ACCESS_TOKEN || '';
const shopifyLocationId = parseInt(process.env.SHOPIFY_LOCATION_ID || '0', 10);

let shopifyConnector: ShopifyConnector | null = null;

if (shopifyDomain && shopifyAccessToken) {
  shopifyConnector = new ShopifyConnector(shopifyDomain, shopifyAccessToken, logger);
  logger.info('Shopify connector initialized');
} else {
  logger.warn('Shopify credentials not configured');
}

// Supplier API keys
const supplierKeys = {
  autods: process.env.AUTODS_API_KEY,
  spocket: process.env.SPOCKET_API_KEY,
  printful: process.env.PRINTFUL_API_KEY
};

// Health endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'agent-executors', 
    timestamp: new Date().toISOString(),
    shopifyConnected: !!shopifyConnector
  });
});

app.get('/readiness', async (req, res) => {
  try {
    const isReady = shopifyConnector ? await shopifyConnector.testConnection() : false;
    res.json({ 
      status: isReady ? 'ready' : 'not_ready', 
      service: 'agent-executors', 
      timestamp: new Date().toISOString(),
      shopifyConnected: isReady
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      service: 'agent-executors',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Agent execution endpoints

/**
 * POST /agents/product-research/execute
 * Execute product research agent
 */
app.post('/agents/product-research/execute', async (req, res) => {
  try {
    if (!shopifyConnector) {
      return res.status(503).json({ error: 'Shopify not configured' });
    }
    
    const parameters = req.body;
    const agentConfig = {
      id: 'product-research',
      name: 'Product Research Agent',
      type: 'product-research' as const,
      schedule: '0 */6 * * *',
      enabled: true,
      retryPolicy: {
        maxRetries: 3,
        backoffStrategy: 'exponential' as const,
        initialDelay: 1000,
        maxDelay: 10000
      },
      alertPolicy: {
        errorThreshold: 3,
        responseTimeThreshold: 60000,
        channels: []
      },
      resources: {
        maxMemory: 512,
        maxCpu: 1,
        timeout: 300000,
        concurrency: 1
      }
    };
    
    const agent = new ProductResearchAgent(
      agentConfig,
      logger,
      shopifyConnector,
      process.env.OPENAI_API_KEY || ''
    );
    
    const result = await agent.execute(parameters);
    
    res.json({
      agentType: 'product-research',
      executionId: result.planId,
      status: result.status,
      results: result.results,
      metrics: result.metrics,
      errors: result.errors,
      timestamp: result.timestamp
    });
  } catch (error) {
    logger.error('Product research execution failed', { error });
    res.status(500).json({
      error: 'Agent execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /agents/order-management/execute
 * Execute order management agent
 */
app.post('/agents/order-management/execute', async (req, res) => {
  try {
    if (!shopifyConnector) {
      return res.status(503).json({ error: 'Shopify not configured' });
    }
    
    const parameters = req.body;
    const agentConfig = {
      id: 'order-management',
      name: 'Order Management Agent',
      type: 'orders' as const,
      schedule: '*/15 * * * *',
      enabled: true,
      retryPolicy: {
        maxRetries: 3,
        backoffStrategy: 'exponential' as const,
        initialDelay: 1000,
        maxDelay: 10000
      },
      alertPolicy: {
        errorThreshold: 5,
        responseTimeThreshold: 120000,
        channels: []
      },
      resources: {
        maxMemory: 512,
        maxCpu: 1,
        timeout: 600000,
        concurrency: 1
      }
    };
    
    const agent = new OrderManagementAgent(
      agentConfig,
      logger,
      shopifyConnector,
      supplierKeys
    );
    
    const result = await agent.execute(parameters);
    
    res.json({
      agentType: 'order-management',
      executionId: result.planId,
      status: result.status,
      results: result.results,
      metrics: result.metrics,
      errors: result.errors,
      timestamp: result.timestamp
    });
  } catch (error) {
    logger.error('Order management execution failed', { error });
    res.status(500).json({
      error: 'Agent execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /agents/inventory-management/execute
 * Execute inventory management agent
 */
app.post('/agents/inventory-management/execute', async (req, res) => {
  try {
    if (!shopifyConnector) {
      return res.status(503).json({ error: 'Shopify not configured' });
    }
    
    const parameters = req.body;
    const agentConfig = {
      id: 'inventory-management',
      name: 'Inventory Management Agent',
      type: 'inventory' as const,
      schedule: '0 */2 * * *',
      enabled: true,
      retryPolicy: {
        maxRetries: 3,
        backoffStrategy: 'exponential' as const,
        initialDelay: 1000,
        maxDelay: 10000
      },
      alertPolicy: {
        errorThreshold: 3,
        responseTimeThreshold: 180000,
        channels: []
      },
      resources: {
        maxMemory: 512,
        maxCpu: 1,
        timeout: 300000,
        concurrency: 1
      }
    };
    
    const agent = new InventoryManagementAgent(
      agentConfig,
      logger,
      shopifyConnector,
      supplierKeys,
      shopifyLocationId
    );
    
    const result = await agent.execute(parameters);
    
    res.json({
      agentType: 'inventory-management',
      executionId: result.planId,
      status: result.status,
      results: result.results,
      metrics: result.metrics,
      errors: result.errors,
      timestamp: result.timestamp
    });
  } catch (error) {
    logger.error('Inventory management execution failed', { error });
    res.status(500).json({
      error: 'Agent execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Agent status endpoints
app.get('/agents/status', (req, res) => {
  res.json({
    agents: [
      { 
        id: 'product-research',
        name: 'Product Research Agent', 
        type: 'product-research',
        status: 'active',
        endpoint: '/agents/product-research/execute'
      },
      { 
        id: 'order-management',
        name: 'Order Management Agent', 
        type: 'orders',
        status: 'active',
        endpoint: '/agents/order-management/execute'
      },
      { 
        id: 'inventory-management',
        name: 'Inventory Management Agent', 
        type: 'inventory',
        status: 'active',
        endpoint: '/agents/inventory-management/execute'
      }
    ],
    total: 3,
    active: 3,
    shopifyConnected: !!shopifyConnector,
    supplierConfigured: {
      autods: !!supplierKeys.autods,
      spocket: !!supplierKeys.spocket,
      printful: !!supplierKeys.printful
    }
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🤖 Agent Executors Service running on port ${PORT}`);
  logger.info(`Shopify: ${shopifyConnector ? 'Connected' : 'Not configured'}`);
  logger.info(`Suppliers: AutoDS=${!!supplierKeys.autods}, Spocket=${!!supplierKeys.spocket}, Printful=${!!supplierKeys.printful}`);
});