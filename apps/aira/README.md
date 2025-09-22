# AIRA - Main Empire Agent

**AIRA** (Artificial Intelligence Royal Assistant) is the central super-agent that orchestrates all domains with omniscient context, natural language to action planning, verified auto-execution, and real-time knowledge fusion.

## 🚀 Features

- **Omniscient Context**: Maintains Unified Empire Graph (UEG) with complete system understanding
- **NL→Action Planning**: Converts natural language to deterministic execution plans
- **Risk Assessment**: Automatic risk scoring with LOW/MEDIUM/HIGH classification
- **Approval Gates**: MEDIUM/HIGH risk operations require explicit approval
- **Tool Registry**: Integrates with GitHub, GCP, Supabase, Shopify, Stripe, and more
- **Dry-Run Execution**: Safe preview of all operations before execution
- **Real-time UI**: Command Center interface for interactive planning

## 🏗️ Architecture

```
AIRA Core (Fastify :10000)
├─ Conversational Orchestrator (NLU → Plan → Tools)
├─ Policy Engine (risk, approvals, RBAC)
├─ Planner (LLM + verifier → strict JSON)
├─ Tool Registry (GitHub, GCP, Supabase, etc.)
├─ Data Plane (Unified Empire Graph)
└─ Command Center UI (Static served demo)
```

## 🛠️ API Endpoints

### `POST /chat`
Convert natural language to structured execution plans.

**Request:**
```json
{
  "message": "Deploy the latest version to production",
  "context": {}
}
```

**Response:**
```json
{
  "plan": {
    "goal": "Deploy application based on: deploy the latest version to production",
    "actions": [...]
  },
  "risk": {
    "score": 0.6,
    "level": "MEDIUM"
  },
  "verifications": [...],
  "approvals": [...],
  "tool_calls": [...],
  "next_ui_steps": [...]
}
```

### `POST /execute`
Execute approved tool calls.

**Request:**
```json
{
  "tool_calls": [...],
  "approval_token": "optional_approval_token"
}
```

### `GET /health`
Service health check.

## 🎯 Usage Examples

### Low Risk - Auto Execution
```bash
curl -X POST http://localhost:10000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Check health status of all services"}'
```

### Medium Risk - Requires Approval
```bash
curl -X POST http://localhost:10000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Deploy the latest version to production"}'
```

## 🖥️ Command Center UI

Visit `http://localhost:10000` for the interactive Command Center interface featuring:

- Natural language input with examples
- Real-time plan generation and analysis
- Risk assessment visualization
- Approval workflow display
- Tool execution preview

## 🚦 Risk Levels

- **LOW** (0-29%): Auto-execution allowed
- **MEDIUM** (30-69%): UI approval required + mandatory dry-run
- **HIGH** (70%+): 2-person approval + canary deployment

## 🔧 Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## 🧪 Testing

```bash
# Health check
curl http://localhost:10000/health

# Interactive Command Center
open http://localhost:10000

# API testing
curl -X POST http://localhost:10000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Your natural language command here"}'
```

## 🔮 Future Enhancements

- LLM integration (OpenAI, Claude) for advanced reasoning
- Real Supabase/PostgreSQL UEG storage
- Production tool integrations
- Advanced approval workflows
- Telemetry and observability
- Multi-agent orchestration
- Self-healing capabilities

## 📄 License

Part of Royal Equips Orchestrator - see root LICENSE file.