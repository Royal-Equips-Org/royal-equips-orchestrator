# Shopify Agent Executors

Production-ready Node.js/TypeScript service implementing three core Shopify automation agents using the Shopify Admin GraphQL API.

## 🤖 Agents

### 1. Product Research Agent
**Purpose:** Discovers and creates products from supplier APIs

**Features:**
- Fetches product candidates from supplier APIs (AutoDS, Spocket)
- Normalizes and validates supplier data
- Scores products using configurable scoring function
- Checks Shopify for duplicates by SKU/title
- Creates or updates products using Shopify GraphQL
- Attaches supplier metadata as product metafields
- Comprehensive error handling and logging

**Endpoint:** `POST /agents/product-research/execute`

**Parameters:**
```json
{
  "category": "electronics",
  "priceRange": {
    "min": 10,
    "max": 100
  },
  "targetMargin": 50,
  "maxProducts": 10
}
```

### 2. Order Management Agent
**Purpose:** Processes orders and handles fulfillment

**Features:**
- Fetches new orders from Shopify GraphQL
- Validates payment and fulfillment status
- Assesses order risk (fraud detection)
- Routes orders to appropriate suppliers (AutoDS, Spocket, Printful)
- Updates Shopify with fulfillment info
- Stores supplier order references as metafields
- Graceful error handling and retries

**Endpoint:** `POST /agents/order-management/execute`

**Parameters:**
```json
{
  "orderStatus": "unfulfilled",
  "maxOrders": 50,
  "autoFulfill": false
}
```

### 3. Inventory Management Agent
**Purpose:** Syncs inventory levels with suppliers

**Features:**
- Fetches inventory levels from supplier APIs
- Matches products by SKU or supplier ID
- Updates Shopify inventory using inventoryAdjustQuantity
- Generates low stock alerts
- Tracks inventory changes
- Comprehensive logging

**Endpoint:** `POST /agents/inventory-management/execute`

**Parameters:**
```json
{
  "syncAll": true,
  "lowStockThreshold": 10,
  "autoReorder": false
}
```

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm
- Shopify store with Admin API access
- Supplier API keys (AutoDS, Spocket, Printful)

### Installation

```bash
# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials
```

### Environment Variables

```bash
# Shopify Configuration
SHOPIFY_STORE=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx
SHOPIFY_LOCATION_ID=12345

# Supplier API Keys
AUTODS_API_KEY=your_autods_key
SPOCKET_API_KEY=your_spocket_key
PRINTFUL_API_KEY=your_printful_key

# Optional
OPENAI_API_KEY=sk-xxxxx
LOG_LEVEL=info
AGENT_EXECUTORS_PORT=3003
```

### Running

```bash
# Development mode with hot reload
pnpm dev

# Production build
pnpm build
pnpm start

# Run tests
pnpm test

# Lint code
pnpm lint
```

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

Returns service health status and Shopify connection status.

### Readiness Check
```bash
GET /readiness
```

Tests actual Shopify API connection.

### Agent Status
```bash
GET /agents/status
```

Lists all available agents and their configuration.

### Execute Product Research
```bash
POST /agents/product-research/execute
Content-Type: application/json

{
  "category": "electronics",
  "priceRange": { "min": 20, "max": 200 },
  "targetMargin": 50,
  "maxProducts": 10
}
```

### Execute Order Management
```bash
POST /agents/order-management/execute
Content-Type: application/json

{
  "orderStatus": "unfulfilled",
  "maxOrders": 50,
  "autoFulfill": false
}
```

### Execute Inventory Management
```bash
POST /agents/inventory-management/execute
Content-Type: application/json

{
  "syncAll": true,
  "lowStockThreshold": 10,
  "autoReorder": false
}
```

## 🏗️ Architecture

### Agent Execution Flow

All agents follow the Plan → DryRun → Apply → Rollback pattern:

1. **Plan Phase:** Generate execution plan without making changes
2. **DryRun Phase:** Simulate execution to validate the plan
3. **Apply Phase:** Execute the plan with real Shopify/supplier API calls
4. **Rollback Phase:** Undo changes if something goes wrong

### Example Response

```json
{
  "agentType": "product-research",
  "executionId": "product-research-1234567890-abc123",
  "status": "success",
  "results": {
    "productsCreated": 5,
    "products": [
      {
        "shopifyId": 7890123456,
        "title": "Wireless Charger",
        "price": 49.99,
        "margin": 55.5,
        "sku": "RE-WIRELESSCH-123456",
        "supplier": "AutoDS"
      }
    ],
    "totalEstimatedRevenue": 249.95,
    "averageMargin": 52.3
  },
  "metrics": {
    "duration": 15234,
    "resourcesUsed": 5,
    "apiCalls": 8,
    "dataProcessed": 10
  },
  "timestamp": "2025-01-02T10:30:00.000Z"
}
```

## 🔐 Security

### API Authentication
- All Shopify API calls use OAuth access tokens
- Supplier APIs use Bearer token authentication
- No credentials stored in code or logs

### Error Handling
- Comprehensive try/catch blocks at all API boundaries
- Retry logic with exponential backoff
- Graceful degradation when services unavailable
- All errors logged with context

### Rate Limiting
- Automatic rate limit detection and retry
- Configurable delays between API calls
- Respects Shopify API call limits (2 calls/second)

## 📊 Logging

All agents use structured logging with Pino:

```javascript
logger.info({
  event: 'product_created',
  productId: 123,
  sku: 'ABC-123',
  supplier: 'AutoDS'
}, 'Product created successfully');
```

Log levels:
- `info`: Normal operations
- `warn`: Issues that don't prevent execution
- `error`: Errors that affect functionality
- `debug`: Detailed debugging information

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test product-research-agent.test.ts

# Run with coverage
pnpm test --coverage
```

## 🔄 GraphQL Operations

### Product Creation (with metafields)
```graphql
mutation {
  productCreate(input: {
    title: "Wireless Charger"
    bodyHtml: "<p>Fast wireless charging</p>"
    productType: "Electronics"
    status: DRAFT
    variants: [{
      price: "49.99"
      inventoryQuantity: 0
      sku: "RE-WIRELESS-123"
    }]
  }) {
    product {
      id
      title
      handle
    }
    userErrors {
      field
      message
    }
  }
}

mutation {
  metafieldsSet(metafields: [{
    ownerId: "gid://shopify/Product/7890123456"
    namespace: "supplier"
    key: "name"
    value: "AutoDS"
    type: "single_line_text_field"
  }]) {
    metafields { id key value }
    userErrors { field message }
  }
}
```

### Inventory Adjustment
```graphql
mutation {
  inventoryAdjustQuantity(input: {
    inventoryLevelId: "gid://shopify/InventoryLevel/123?inventory_item_id=456"
    availableDelta: 10
  }) {
    inventoryLevel {
      available
    }
    userErrors {
      field
      message
    }
  }
}
```

### Order Query
```graphql
query {
  orders(first: 50, query: "fulfillment_status:unfulfilled") {
    edges {
      node {
        id
        name
        email
        totalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        lineItems(first: 10) {
          edges {
            node {
              title
              quantity
              sku
            }
          }
        }
      }
    }
  }
}
```

## 🛠️ Development

### Project Structure
```
apps/agent-executors/
├── src/
│   ├── agents/
│   │   ├── product-research-agent.ts
│   │   ├── order-management-agent.ts
│   │   ├── inventory-management-agent.ts
│   │   └── index.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

### Adding a New Agent

1. Create agent file in `src/agents/`
2. Extend `BaseAgent` from `@royal-equips/agents-core`
3. Implement required methods: `plan()`, `dryRun()`, `apply()`, `rollback()`
4. Add REST endpoint in `src/index.ts`
5. Export from `src/agents/index.ts`

### Code Style
- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- Conventional commits for git messages

## 📚 Additional Documentation

- [Shopify Admin GraphQL API](https://shopify.dev/docs/api/admin-graphql)
- [AutoDS API Documentation](https://help.autods.com/api)
- [Spocket API Documentation](https://support.spocket.co/api)
- [Printful API Documentation](https://developers.printful.com/docs)

## 🐛 Troubleshooting

### Agent Not Finding Products
- Verify supplier API keys are configured
- Check API rate limits haven't been exceeded
- Review logs for specific error messages

### Inventory Not Updating
- Verify `SHOPIFY_LOCATION_ID` is set correctly
- Check product has inventory tracking enabled
- Ensure API credentials have `write_inventory` scope

### Orders Not Processing
- Verify financial status is "paid"
- Check order fulfillment status
- Review risk assessment thresholds

## 📝 License

Proprietary - Royal Equips Organization

## 🤝 Support

For issues or questions:
- Create an issue in GitHub
- Contact: support@royalequips.com
