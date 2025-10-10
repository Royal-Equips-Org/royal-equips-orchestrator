import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { pino } from 'pino';
import { ShopifyConnector } from '@royal-equips/connectors';
import { 
  ProductResearchAgent, 
  OrderManagementAgent, 
  InventoryManagementAgent,
  MarketingAgent,
  AdvertisingAgent,
  CustomerServiceAgent
} from './agents/index.js';

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

/**
 * POST /agents/marketing/execute
 * Execute marketing agent
 */
app.post('/agents/marketing/execute', async (req, res) => {
  try {
    if (!shopifyConnector) {
      return res.status(503).json({ error: 'Shopify not configured' });
    }
    
    const parameters = req.body;
    const agentConfig = {
      id: 'marketing',
      name: 'Marketing Agent',
      type: 'marketing' as const,
      schedule: '0 9 * * *',
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
    
    const agent = new MarketingAgent(
      agentConfig,
      logger,
      shopifyConnector,
      {
        sendgrid: process.env.SENDGRID_API_KEY,
        mailgun: process.env.MAILGUN_API_KEY
      }
    );
    
    const result = await agent.execute(parameters);
    
    res.json({
      agentType: 'marketing',
      executionId: result.planId,
      status: result.status,
      results: result.results,
      metrics: result.metrics,
      errors: result.errors,
      timestamp: result.timestamp
    });
  } catch (error) {
    logger.error('Marketing execution failed', { error });
    res.status(500).json({
      error: 'Agent execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /agents/advertising/execute
 * Execute advertising agent
 */
app.post('/agents/advertising/execute', async (req, res) => {
  try {
    if (!shopifyConnector) {
      return res.status(503).json({ error: 'Shopify not configured' });
    }
    
    const parameters = req.body;
    const agentConfig = {
      id: 'advertising',
      name: 'Advertising Agent',
      type: 'marketing' as const,
      schedule: '0 */4 * * *',
      enabled: true,
      retryPolicy: {
        maxRetries: 3,
        backoffStrategy: 'exponential' as const,
        initialDelay: 1000,
        maxDelay: 10000
      },
      alertPolicy: {
        errorThreshold: 3,
        responseTimeThreshold: 240000,
        channels: []
      },
      resources: {
        maxMemory: 512,
        maxCpu: 1,
        timeout: 400000,
        concurrency: 1
      }
    };
    
    const agent = new AdvertisingAgent(
      agentConfig,
      logger,
      shopifyConnector,
      {
        googleAds: process.env.GOOGLE_ADS_API_KEY,
        facebook: process.env.FACEBOOK_API_KEY,
        tiktok: process.env.TIKTOK_API_KEY
      }
    );
    
    const result = await agent.execute(parameters);
    
    res.json({
      agentType: 'advertising',
      executionId: result.planId,
      status: result.status,
      results: result.results,
      metrics: result.metrics,
      errors: result.errors,
      timestamp: result.timestamp
    });
  } catch (error) {
    logger.error('Advertising execution failed', { error });
    res.status(500).json({
      error: 'Agent execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /agents/customer-service/execute
 * Execute customer service agent
 */
app.post('/agents/customer-service/execute', async (req, res) => {
  try {
    if (!shopifyConnector) {
      return res.status(503).json({ error: 'Shopify not configured' });
    }
    
    const parameters = req.body;
    const agentConfig = {
      id: 'customer-service',
      name: 'Customer Service Agent',
      type: 'cx' as const,
      schedule: '*/30 * * * *',
      enabled: true,
      retryPolicy: {
        maxRetries: 3,
        backoffStrategy: 'exponential' as const,
        initialDelay: 1000,
        maxDelay: 10000
      },
      alertPolicy: {
        errorThreshold: 5,
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
    
    const agent = new CustomerServiceAgent(
      agentConfig,
      logger,
      shopifyConnector,
      {
        openai: process.env.OPENAI_API_KEY,
        zendesk: process.env.ZENDESK_API_KEY,
        freshdesk: process.env.FRESHDESK_API_KEY
      }
    );
    
    const result = await agent.execute(parameters);
    
    res.json({
      agentType: 'customer-service',
      executionId: result.planId,
      status: result.status,
      results: result.results,
      metrics: result.metrics,
      errors: result.errors,
      timestamp: result.timestamp
    });
  } catch (error) {
    logger.error('Customer service execution failed', { error });
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
      },
      { 
        id: 'marketing',
        name: 'Marketing Agent', 
        type: 'marketing',
        status: 'active',
        endpoint: '/agents/marketing/execute'
      },
      { 
        id: 'advertising',
        name: 'Advertising Agent', 
        type: 'marketing',
        status: 'active',
        endpoint: '/agents/advertising/execute'
      },
      { 
        id: 'customer-service',
        name: 'Customer Service Agent', 
        type: 'cx',
        status: 'active',
        endpoint: '/agents/customer-service/execute'
      }
    ],
    total: 6,
    active: 6,
    shopifyConnected: !!shopifyConnector,
    supplierConfigured: {
      autods: !!supplierKeys.autods,
      spocket: !!supplierKeys.spocket,
      printful: !!supplierKeys.printful
    },
    servicesConfigured: {
      sendgrid: !!process.env.SENDGRID_API_KEY,
      mailgun: !!process.env.MAILGUN_API_KEY,
      googleAds: !!process.env.GOOGLE_ADS_API_KEY,
      facebook: !!process.env.FACEBOOK_API_KEY,
      tiktok: !!process.env.TIKTOK_API_KEY,
      zendesk: !!process.env.ZENDESK_API_KEY,
      freshdesk: !!process.env.FRESHDESK_API_KEY
    }
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`🤖 Agent Executors Service running on port ${PORT}`);
  logger.info(`Shopify: ${shopifyConnector ? 'Connected' : 'Not configured'}`);
  logger.info(`Agents Available: 6 (Product Research, Order Management, Inventory, Marketing, Advertising, Customer Service)`);
  logger.info(`Suppliers: AutoDS=${!!supplierKeys.autods}, Spocket=${!!supplierKeys.spocket}, Printful=${!!supplierKeys.printful}`);
  logger.info(`Services: SendGrid=${!!process.env.SENDGRID_API_KEY}, GoogleAds=${!!process.env.GOOGLE_ADS_API_KEY}, Zendesk=${!!process.env.ZENDESK_API_KEY}`);
});