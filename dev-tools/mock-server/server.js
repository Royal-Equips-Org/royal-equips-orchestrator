const express = require('express');
const cors = require('cors');
const app = express();
const port = 10000;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Health endpoints
app.get('/healthz', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send('ok');
});

app.get('/readyz', (req, res) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    dependencies: {
      redis: 'healthy',
      database: 'healthy'
    }
  });
});

// Agents endpoints
app.get('/agents', (req, res) => {
  res.json([
    {
      id: 'aira-core',
      name: 'AIRA Intelligence Core',
      status: 'active',
      type: 'ai-orchestrator',
      health: 'good',
      last_active: new Date().toISOString(),
      capabilities: ['empire-analysis', 'real-time-intelligence', 'system-optimization']
    },
    {
      id: 'product-research',
      name: 'Product Research Agent',
      status: 'active',
      type: 'research',
      health: 'good',
      last_active: new Date().toISOString(),
      capabilities: ['trend-analysis', 'competitor-research', 'market-intelligence']
    },
    {
      id: 'inventory-forecast',
      name: 'Inventory Forecasting Agent',
      status: 'active',
      type: 'forecasting',
      health: 'good',
      last_active: new Date().toISOString(),
      capabilities: ['demand-prediction', 'stock-optimization', 'supplier-management']
    }
  ]);
});

app.get('/agents/status', (req, res) => {
  res.json({
    total_agents: 8,
    active_agents: 6,
    healthy_agents: 6,
    success_rate: 94.8,
    total_operations: 1247,
    operations_today: 89,
    last_updated: new Date().toISOString()
  });
});

// Product opportunities endpoint
app.get('/product-opportunities', (req, res) => {
  res.json([
    {
      id: 'opp-001',
      title: 'Smart Home Security Systems',
      category: 'Electronics',
      potential_revenue: 45000,
      confidence_score: 0.89,
      trend_score: 0.92,
      competition_level: 'medium',
      source: 'trend-analysis',
      created_at: new Date().toISOString()
    },
    {
      id: 'opp-002', 
      title: 'Sustainable Fashion Accessories',
      category: 'Fashion',
      potential_revenue: 28000,
      confidence_score: 0.76,
      trend_score: 0.88,
      competition_level: 'low',
      source: 'market-research',
      created_at: new Date().toISOString()
    }
  ]);
});

// Empire metrics endpoint
app.get('/empire/metrics', (req, res) => {
  res.json({
    revenue_progress: 127543,
    orders_today: 336,
    active_products: 1916,
    active_customers: 5388,
    conversion_rate: 3.2,
    system_health: 98.5,
    automation_level: 67.8,
    last_updated: new Date().toISOString()
  });
});

// AIRA endpoints
app.get('/aira/status', (req, res) => {
  res.json({
    connection: 'online',
    health: 'GOOD',
    active_agents: 3,
    total_operations: 1247,
    success_rate: 94.8,
    capabilities: [
      'Empire Analysis',
      'Real-time Intelligence', 
      'System Optimization',
      'Security Monitoring',
      'Performance Analytics',
      'Autonomous Decision Making'
    ],
    last_updated: new Date().toISOString()
  });
});

app.get('/aira/operations', (req, res) => {
  res.json([
    {
      id: 'op-001',
      name: 'Empire Health Monitoring',
      status: 'completed',
      progress: 100,
      type: 'scan',
      started_at: new Date(Date.now() - 300000).toISOString(),
      completed_at: new Date().toISOString()
    }
  ]);
});

// Revenue endpoints
app.get('/revenue/metrics', (req, res) => {
  res.json({
    monthly_revenue: 284573,
    quarterly_revenue: 847291,
    annual_revenue: 3200000,
    profit_margin: 34.2,
    growth_monthly: 18.5,
    growth_quarterly: 12.3,
    growth_annual: 15.7,
    forecasts: {
      next_month: { value: 312000, confidence: 87 },
      next_quarter: { value: 945000, confidence: 82 },
      next_year: { value: 4200000, confidence: 75 }
    },
    top_drivers: [
      { name: 'Premium Products', percentage: 45, growth: 12.3 },
      { name: 'Subscription Services', percentage: 32, growth: 18.7 },
      { name: 'Enterprise Solutions', percentage: 23, growth: 8.9 }
    ],
    last_updated: new Date().toISOString()
  });
});

// Analytics endpoints  
app.get('/analytics/overview', (req, res) => {
  res.json({
    total_revenue: 2847291,
    total_orders: 15847,
    total_customers: 8934,
    avg_order_value: 179.45,
    conversion_rate: 3.2,
    customer_lifetime_value: 847.23,
    monthly_growth: 18.5,
    last_updated: new Date().toISOString()
  });
});

// Marketing endpoints
app.get('/marketing/campaigns', (req, res) => {
  res.json([
    {
      id: 'camp-001',
      name: 'Q4 Holiday Campaign',
      status: 'active',
      budget: 15000,
      spent: 8750,
      roi: 3.2,
      impressions: 847291,
      clicks: 23847,
      conversions: 892,
      started_at: new Date(Date.now() - 86400000 * 30).toISOString()
    }
  ]);
});

// Security endpoints
app.get('/security/threats', (req, res) => {
  res.json({
    total_threats_blocked: 1247,
    threats_today: 23,
    risk_score: 'low',
    last_scan: new Date().toISOString(),
    active_protections: [
      'DDoS Protection',
      'Fraud Detection', 
      'Payment Security',
      'Data Encryption'
    ]
  });
});

// Finance endpoints
app.get('/finance/overview', (req, res) => {
  res.json({
    total_revenue: 2847291,
    total_expenses: 1872847,
    net_profit: 974444,
    profit_margin: 34.2,
    cash_flow: 234567,
    accounts_receivable: 156789,
    accounts_payable: 89234,
    last_updated: new Date().toISOString()
  });
});

// Inventory endpoints
app.get('/inventory/overview', (req, res) => {
  res.json({
    total_products: 1916,
    low_stock_items: 23,
    out_of_stock_items: 5,
    total_value: 1247856,
    turnover_rate: 4.2,
    reorder_alerts: 18,
    last_updated: new Date().toISOString()
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Royal Equips Mock API Server running on http://localhost:${port}`);
  console.log(`Available endpoints:
  - Health: /healthz, /readyz  
  - Agents: /agents, /agents/status
  - Empire: /empire/metrics
  - AIRA: /aira/status, /aira/operations
  - Revenue: /revenue/metrics
  - Analytics: /analytics/overview
  - Marketing: /marketing/campaigns
  - Security: /security/threats
  - Finance: /finance/overview
  - Inventory: /inventory/overview
  `);
  
  // Keep the server running
  process.on('SIGTERM', () => {
    console.log('Mock server shutting down...');
    process.exit(0);
  });
});