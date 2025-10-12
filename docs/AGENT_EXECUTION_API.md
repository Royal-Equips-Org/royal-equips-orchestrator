# Agent Execution API

## Overview

The Agent Execution API allows RoyalGPT and other clients to trigger on-demand execution of autonomous agents with custom parameters and track their progress and results.

## Base URL

```
https://command.royalequips.nl/api
```

## Authentication

Currently, the API is accessible without authentication. In production, add appropriate authentication headers.

## Endpoints

### 1. Execute Agent

Trigger on-demand execution of a specific agent with optional parameters.

**Endpoint:** `POST /agents/<agent_id>/execute`

**Parameters:**
- `agent_id` (path): The agent identifier (e.g., `product_research`, `inventory_pricing`)

**Request Body:**
```json
{
  "parameters": {
    "categories": ["electronics", "home"],
    "maxProducts": 20,
    "minMargin": 30
  }
}
```

**Agent-Specific Parameters:**

#### Product Research Agent (`product_research`)
- `categories` (array of strings): Product categories to search (e.g., `["electronics", "home", "car", "general"]`)
- `maxProducts` (integer, default: 20): Maximum number of products to return
- `minMargin` (number, default: 30): Minimum profit margin percentage

**Response:**
```json
{
  "executionId": "fde0a014-9d5b-4715-b1aa-e7ece38d120d",
  "agentId": "product_research",
  "status": "started",
  "startedAt": "2025-02-05T10:30:00.000Z",
  "parameters": {
    "categories": ["electronics", "home"],
    "maxProducts": 20,
    "minMargin": 30
  },
  "message": "Agent product_research execution started in background"
}
```

**Example cURL:**
```bash
curl -X POST https://command.royalequips.nl/api/agents/product_research/execute \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "categories": ["electronics", "home"],
      "maxProducts": 15,
      "minMargin": 35
    }
  }'
```

### 2. Get Execution Status

Retrieve the status and results of a specific agent execution.

**Endpoint:** `GET /agents/executions/<execution_id>`

**Parameters:**
- `execution_id` (path): The execution identifier returned from the execute endpoint

**Response (Running):**
```json
{
  "execution_id": "fde0a014-9d5b-4715-b1aa-e7ece38d120d",
  "agent_id": "product_research",
  "status": "running",
  "started_at": "2025-02-05T10:30:00.000Z",
  "parameters": {
    "categories": ["electronics", "home"],
    "maxProducts": 20,
    "minMargin": 30
  },
  "progress": 50,
  "result": null
}
```

**Response (Completed):**
```json
{
  "execution_id": "fde0a014-9d5b-4715-b1aa-e7ece38d120d",
  "agent_id": "product_research",
  "status": "completed",
  "started_at": "2025-02-05T10:30:00.000Z",
  "completed_at": "2025-02-05T10:30:15.000Z",
  "parameters": {
    "categories": ["electronics", "home"],
    "maxProducts": 20,
    "minMargin": 30
  },
  "progress": 100,
  "result": {
    "success": true,
    "data": {
      "products": [
        {
          "id": "spocket_elec_001",
          "title": "USB C Hub Multi-Port Adapter HDMI 4K",
          "category": "Electronics",
          "price": 42.99,
          "supplier_price": 16.50,
          "margin": 26.49,
          "margin_percent": 61.6,
          "empire_score": 93.75,
          "source": "Spocket",
          "supplier_name": "TechConnect US",
          "shipping_time": "3-5 days",
          "rating": 4.6,
          "trend_score": 90,
          "profit_potential": "EXCELLENT",
          "market_viability": "HIGH"
        }
      ],
      "count": 10,
      "categories": ["electronics", "home"],
      "timestamp": 1707130215.123
    },
    "discoveries_count": 10
  }
}
```

**Example cURL:**
```bash
curl https://command.royalequips.nl/api/agents/executions/fde0a014-9d5b-4715-b1aa-e7ece38d120d
```

### 3. Get Agent Health

Get detailed health status for a specific agent.

**Endpoint:** `GET /agents/<agent_id>/health`

**Parameters:**
- `agent_id` (path): The agent identifier

**Response:**
```json
{
  "agentId": "product_research",
  "name": "product_research",
  "status": "active",
  "timestamp": "2025-02-05T10:35:00.000Z"
}
```

**Example cURL:**
```bash
curl https://command.royalequips.nl/api/agents/product_research/health
```

### 4. Get All Agents Status

Get status of all available agents.

**Endpoint:** `GET /agents/status`

**Response:**
```json
{
  "agents": [
    {
      "id": "product_research",
      "name": "Product Research",
      "status": "active",
      "capabilities": ["trend_analysis", "supplier_search", "margin_calculation"],
      "lastRun": "2025-02-05T10:30:00.000Z"
    },
    {
      "id": "inventory_pricing",
      "name": "Inventory & Pricing",
      "status": "active",
      "capabilities": ["price_optimization", "inventory_forecasting"],
      "lastRun": "2025-02-05T09:00:00.000Z"
    }
  ],
  "totalAgents": 8,
  "activeAgents": 8
}
```

## Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid parameters or agent not available
- `404 Not Found`: Agent or execution not found
- `500 Internal Server Error`: Server error during execution
- `503 Service Unavailable`: Orchestrator unavailable

## Error Response Format

```json
{
  "error": "request_invalid",
  "message": "Agent product_research not available for on-demand execution",
  "timestamp": "2025-02-05T10:30:00.000Z"
}
```

## Workflow Example

### Complete Agent Execution Flow

```bash
# 1. Execute agent with parameters
EXECUTION_ID=$(curl -s -X POST https://command.royalequips.nl/api/agents/product_research/execute \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": {
      "categories": ["electronics", "home"],
      "maxProducts": 20,
      "minMargin": 35
    }
  }' | jq -r '.executionId')

echo "Execution ID: $EXECUTION_ID"

# 2. Wait for execution (typically 2-10 seconds)
sleep 5

# 3. Retrieve results
curl -s https://command.royalequips.nl/api/agents/executions/$EXECUTION_ID | jq '.'

# 4. Check agent health
curl -s https://command.royalequips.nl/api/agents/product_research/health | jq '.'
```

## Available Agents

| Agent ID | Name | Description | Parameters |
|----------|------|-------------|------------|
| `product_research` | Product Research | Discover trending products | `categories`, `maxProducts`, `minMargin` |
| `inventory_pricing` | Inventory & Pricing | Optimize pricing and inventory | TBD |
| `marketing_automation` | Marketing Automation | Automate marketing campaigns | TBD |
| `production-analytics` | Analytics | Generate business intelligence | TBD |

## Product Categories

The `product_research` agent supports the following categories:

- `electronics`: Smart home devices, gadgets, tech accessories
- `home`: Kitchen tools, cleaning supplies, home organization
- `car`: Automotive accessories, car electronics
- `general`: Mixed trending products across all categories

## Product Response Fields

Each product in the results includes:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique product identifier |
| `title` | string | Product name |
| `category` | string | Product category |
| `price` | number | Suggested retail price |
| `supplier_price` | number | Supplier cost |
| `margin` | number | Profit margin in currency |
| `margin_percent` | number | Profit margin percentage |
| `empire_score` | number | Overall product score (0-100) |
| `source` | string | Data source (AutoDS, Spocket, etc.) |
| `supplier_name` | string | Supplier name |
| `shipping_time` | string | Estimated shipping time |
| `rating` | number | Supplier/product rating (0-5) |
| `trend_score` | number | Trending score (0-100) |
| `profit_potential` | string | Rating: LOW, FAIR, GOOD, EXCELLENT |
| `market_viability` | string | Rating: LOW, MEDIUM, HIGH |

## Empire Score Calculation

The Empire Score is a weighted composite score based on:

1. **Profit Margin (30%)**: Higher margins = higher score
2. **Trend Score (25%)**: Trending products score higher
3. **Market Viability (20%)**: Based on category and demand
4. **Supplier Reliability (15%)**: Based on supplier rating
5. **Shipping Speed (10%)**: Faster shipping = higher score

Products with Empire Score > 80 are considered excellent opportunities.

## Best Practices

1. **Polling**: Wait 2-5 seconds before checking execution status
2. **Error Handling**: Always check status code and handle errors gracefully
3. **Parameters**: Start with broader parameters and refine based on results
4. **Margin**: Set `minMargin` to 30-40% for profitable products
5. **Categories**: Specify 2-3 categories for best results

## Integration Examples

### Python
```python
import requests
import time

# Execute agent
response = requests.post(
    'https://command.royalequips.nl/api/agents/product_research/execute',
    json={
        'parameters': {
            'categories': ['electronics', 'home'],
            'maxProducts': 20,
            'minMargin': 35
        }
    }
)
execution_id = response.json()['executionId']

# Wait and check status
time.sleep(5)
result = requests.get(
    f'https://command.royalequips.nl/api/agents/executions/{execution_id}'
)
products = result.json()['result']['data']['products']
```

### JavaScript
```javascript
// Execute agent
const response = await fetch(
  'https://command.royalequips.nl/api/agents/product_research/execute',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      parameters: {
        categories: ['electronics', 'home'],
        maxProducts: 20,
        minMargin: 35
      }
    })
  }
);
const { executionId } = await response.json();

// Wait and check status
await new Promise(resolve => setTimeout(resolve, 5000));
const result = await fetch(
  `https://command.royalequips.nl/api/agents/executions/${executionId}`
);
const { result: { data } } = await result.json();
console.log(`Found ${data.products.length} products`);
```

## Support

For issues or questions, contact the development team or open an issue in the repository.
