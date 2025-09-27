# AIRA - Main Empire Agent – Operational Endpoints

**AIRA** (Artificial Intelligence Royal Assistant) is the central super-agent that orchestrates all domains with omniscient context, natural language to action planning, verified auto-execution, and real-time knowledge fusion.

## 🚀 Features

- **Omniscient Context**: Maintains Unified Empire Graph (UEG) with complete system understanding
- **NL→Action Planning**: Converts natural language to deterministic execution plans
- **Risk Assessment**: Automatic risk scoring with LOW/MEDIUM/HIGH classification
- **Approval Gates**: MEDIUM/HIGH risk operations require explicit approval
- **Tool Registry**: Integrates with GitHub, GCP, Supabase, Shopify, Stripe, and more
- **Dry-Run Execution**: Safe preview of all operations before execution
- **Production Integration**: Seamlessly integrated with Royal Equips Command Center UI
- **Redis Circuit Breaker**: Persistent failure handling with Redis-backed state
- **Health Monitoring**: Comprehensive dependency checks and system status
- **Prometheus Metrics**: Production-ready monitoring and alerting

## 🏗️ Architecture

```
AIRA Core (Fastify :10000)
├─ Conversational Orchestrator (NLU → Plan → Tools)
├─ Policy Engine (risk, approvals, RBAC)
├─ Planner (LLM + verifier → strict JSON)
├─ Tool Registry (GitHub, GCP, Supabase, etc.)
├─ Data Plane (Unified Empire Graph)
├─ Redis Circuit Breaker (persistent failure handling)
├─ Health & Metrics (monitoring & observability)
└─ Production API (integrated with Command Center UI)
```

## 🛠️ API Endpoints

### Core Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Basic health check |
| GET | `/v1/healthz` | Liveness probe |
| GET | `/v1/readyz` | Readiness probe (Redis, Shopify, circuit breaker) |
| GET | `/v1/system/status` | Complete system status (agents, opportunities, metrics) |
| GET | `/metrics` | Prometheus metrics |

### Circuit Breaker Admin
| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/admin/circuit/state` | Get circuit breaker status |
| POST | `/v1/admin/circuit/reset` | Reset circuit breaker state |

### Empire API (Legacy)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/empire/metrics` | Empire metrics |
| GET | `/api/empire/agents` | Agent status |
| GET | `/api/empire/opportunities` | Opportunities data |
| GET | `/api/empire/campaigns` | Campaign data |
| POST | `/api/empire/chat` | Basic chat endpoint |

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `10000` |
| `HOST` | Server host | `0.0.0.0` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | - |
| `REDIS_DB` | Redis database number | `0` |
| `REDIS_URL` | Full Redis connection string | - |
| `NODE_ENV` | Environment | `development` |

### Redis Circuit Breaker

The circuit breaker uses Redis for persistent state management:

- **Keys**: `aira_cb:*` (state, failures, success_count, etc.)
- **Failure Threshold**: 5 consecutive failures
- **Recovery Timeout**: 60 seconds
- **Minimum Requests**: 10 before considering failure rate
- **Half-Open Max Calls**: 3 test calls during recovery

## 🚀 Quick Start

### Development with Redis

```bash
# Start Redis
docker run -p 6379:6379 redis:7-alpine

# Install dependencies
npm install

# Start development server
npm run dev
```

### Production Deployment

```bash
# Build the application
npm run build

# Set environment variables
export PORT=10000
export REDIS_URL=redis://redis:6379
export NODE_ENV=production

# Start the server
npm start
```

### Health Check Testing

```bash
# Test liveness
curl http://localhost:10000/v1/healthz

# Test readiness (requires Redis)
curl http://localhost:10000/v1/readyz

# Test system status
curl http://localhost:10000/v1/system/status

# View metrics
curl http://localhost:10000/metrics
```

### Circuit Breaker Management

```bash
# Check circuit breaker state
curl http://localhost:10000/v1/admin/circuit/state

# Reset circuit breaker
curl -X POST http://localhost:10000/v1/admin/circuit/reset
```

### `POST /chat`
Convert natural language to structured execution plans and natural language responses.

**Request:**
```json
{
  "message": "Deploy the latest version to production",
  "context": {
    "timestamp": "2024-01-15T10:30:00Z",
    "source": "command_center_ui"
  }
}
```

**Response:**
```json
{
  "content": "✅ **Analyzing your request:** \"Deploy the latest version to production\"\n\nI've generated a **MEDIUM risk** execution plan...",
  "agent_name": "AIRA",
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
  "next_steps": [...]
}
```

### `POST /execute`
Execute approved tool calls.

### `GET /health`
Service health check.

## 🖥️ Command Center Integration

AIRA is fully integrated into the Royal Equips Command Center UI:

- **Real-time Chat Interface**: Natural language communication with AIRA
- **Risk Assessment Visualization**: Visual indicators for operation risk levels
- **Plan Analysis Display**: Structured breakdown of execution plans
- **Approval Workflow**: Clear indication when approvals are required
- **Tool Execution Preview**: Shows which tools will be used

## 🚦 Risk Levels

- **LOW** (0-29%): Auto-execution allowed with audit logging
- **MEDIUM** (30-69%): UI approval required + mandatory dry-run
- **HIGH** (70%+): Multi-person approval + enhanced security checks

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

## 🧪 Testing with Command Center

```bash
# Start AIRA service
cd apps/aira && pnpm dev

# Start Command Center UI (in another terminal)
cd apps/command-center-ui && pnpm dev

# Access integrated interface
open http://localhost:5173

# Health check API
curl http://localhost:10000/health
```

## 🎯 Example Commands

Try these commands in the Command Center chat interface:

- `"Deploy the latest version to production"` - MEDIUM risk deployment
- `"Check health status of all services"` - LOW risk monitoring
- `"Scale the API service to handle 10000 requests"` - HIGH risk scaling
- `"Analyze sales performance for the last 30 days"` - LOW risk analytics
- `"Create a new product in Shopify"` - MEDIUM risk e-commerce

## 🔮 Production Enhancements

- LLM integration (OpenAI, Claude) for advanced reasoning
- Real Supabase/PostgreSQL UEG storage
- Production tool integrations
- Advanced approval workflows
- Telemetry and observability
- Multi-agent orchestration
- Self-healing capabilities

## 📄 License

Part of Royal Equips Orchestrator - see root LICENSE file.