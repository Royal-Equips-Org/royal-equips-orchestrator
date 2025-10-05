# Agent Execution Examples

This directory contains example scripts demonstrating how to use the Royal Equips Agent Execution API.

## Available Examples

### 1. Product Research Agent Demo (`agent_execution_demo.py`)

A comprehensive demonstration of the Product Research Agent showing:
- How to execute agents with custom parameters
- Real-time progress tracking
- Result parsing and display
- Business intelligence analysis

**Usage:**
```bash
cd /home/runner/work/royal-equips-orchestrator/royal-equips-orchestrator
python examples/agent_execution_demo.py
```

**Features:**
- ✅ Multi-category product search (electronics, home)
- ✅ Real-time progress bar
- ✅ Detailed product analysis
- ✅ Summary statistics
- ✅ Business recommendations

**Example Output:**
```
======================================================================
🏰 ROYAL EQUIPS - PRODUCT RESEARCH AGENT DEMONSTRATION
======================================================================

📋 Execution Parameters:
   Categories: electronics, home
   Max Products: 15
   Min Margin: 35%

🚀 Initiating agent execution...
✅ Agent execution started
   Execution ID: 1256e635-fb85-4ac6-af15-10a84e6d6ce7

⏳ Waiting for agent to complete...
   Progress: [██████████████████████████████] 100%

✅ Successfully found 10 profitable products!
   Average Margin: 63.8%
   Average Empire Score: 85.72/100
```

## Prerequisites

- Python 3.11+
- Flask application installed and configured
- Virtual environment activated

## Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Run an example
python examples/agent_execution_demo.py
```

## API Reference

For complete API documentation, see [`docs/AGENT_EXECUTION_API.md`](../docs/AGENT_EXECUTION_API.md)

## Creating Custom Scripts

You can create your own agent execution scripts using the pattern:

```python
from app import create_app
import json

# Create Flask test client
app = create_app()
client = app.test_client()

# Execute agent
response = client.post(
    '/api/agents/product_research/execute',
    data=json.dumps({
        'parameters': {
            'categories': ['electronics'],
            'maxProducts': 10,
            'minMargin': 40
        }
    }),
    content_type='application/json'
)

execution_id = response.get_json()['executionId']

# Check status
status_response = client.get(f'/api/agents/executions/{execution_id}')
result = status_response.get_json()
```

## Supported Agents

| Agent ID | Description | Parameters |
|----------|-------------|------------|
| `product_research` | Product discovery and analysis | `categories`, `maxProducts`, `minMargin` |
| `inventory_pricing` | Inventory and pricing optimization | TBD |
| `marketing_automation` | Marketing campaign management | TBD |
| `production-analytics` | Business intelligence | TBD |

## Contributing

To add a new example:

1. Create a new Python file in this directory
2. Follow the existing naming convention
3. Include docstring with description and usage
4. Update this README with the new example

## License

See parent repository LICENSE file.
