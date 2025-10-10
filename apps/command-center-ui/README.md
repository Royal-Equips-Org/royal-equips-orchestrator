# Royal Equips Command Center UI

A comprehensive React application for managing the Royal Equips Empire with modular architecture, AI-powered interfaces, and real-time business intelligence.

## 🚀 Features

### Core Command Center
- **AIRA AI Empire Agent**: Interactive chat interface with operations dashboard
- **Real-time Dashboard**: Live metrics with KPI tracking and performance monitoring
- **Modular Navigation**: Enhanced module scroller with keyboard and touch support
- **Mobile-First Design**: Responsive layouts optimized for all device sizes

### Business Intelligence Modules
- **Analytics Engine**: Advanced business intelligence with predictive insights
- **Revenue Intelligence**: Real-time revenue tracking with forecasting models
- **Agent Management**: AI agent deployment, monitoring, and health diagnostics
- **Shopify Operations**: Store management with live sync and performance metrics

### System & Infrastructure
- **Observability Layer**: Comprehensive metrics collection and structured logging
- **Error Boundaries**: Graceful error handling with recovery mechanisms  
- **Code Splitting**: Lazy-loaded modules for optimal performance
- **Secret Management**: Multi-fallback secret resolution system

## Environment Setup

### Required Environment Variables

Create a `.env.local` file in the app directory:

```bash
# API Configuration - REQUIRED
VITE_API_BASE_URL=http://localhost:10000

# Alternative API URL (fallback)
VITE_API_URL=http://localhost:10000

# For production deployment (Cloudflare Pages)
VITE_API_BASE_URL=https://your-aira-backend.onrender.com
```

### Production Environment (Cloudflare Pages)

In Cloudflare Pages Environment Variables, set:

```bash
VITE_API_BASE_URL=https://your-backend-domain.com
```

### Authentication (Optional)

The application optionally uses authentication tokens stored in localStorage:

```javascript
localStorage.setItem('empire_token', 'your-auth-token');
```

## Backend API Requirements

The application requires these REST API endpoints with specific response formats:

### Core Data Endpoints

| Purpose | Method | Path | Response Type | Description |
|---------|--------|------|--------------|-------------|
| Metrics | GET | `/api/empire/metrics` | `{ success: boolean, data: EmpireMetrics }` | Empire performance metrics |
| Agents | GET | `/api/empire/agents` | `{ success: boolean, data: Agent[] }` | Active agent network status |
| Opportunities | GET | `/api/empire/opportunities` | `{ success: boolean, data: ProductOpportunity[] }` | Product opportunities |
| Campaigns | GET | `/api/empire/campaigns` | `{ success: boolean, data: MarketingCampaign[] }` | Marketing campaigns |

### Action Endpoints  

| Purpose | Method | Path | Response | Description |
|---------|--------|------|----------|-------------|
| Approve Product | POST | `/api/empire/opportunities/:id/approve` | 204 No Content | Idempotent approval |
| Reject Product | POST | `/api/empire/opportunities/:id/reject` | 204 No Content | Idempotent rejection (body: `{ reason }`) |
| Send Chat | POST | `/api/empire/chat` | `{ success: boolean, data: AIRAResponse }` | Chat with AIRA assistant |

### Error Response Format

All endpoints should return errors in this format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "error_type": "timeout|connection|agent_error|internal",
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### CORS Configuration

Backend must allow:
- Origins: Frontend domains (localhost:5173 for dev, production domains)
- Methods: GET, POST, PUT, DELETE, OPTIONS
- Headers: Content-Type, Authorization, X-Request-ID, X-Client-Version

## Data Types

### Core TypeScript Interfaces

```typescript
interface EmpireMetrics {
  total_agents: number;
  active_agents: number;
  total_opportunities: number;
  approved_products: number;
  revenue_progress: number;
  target_revenue: number;
  automation_level: number;
  system_uptime: number;
  daily_discoveries: number;
  profit_margin_avg: number;
}

interface Agent {
  id: string;
  name: string;
  type: 'research' | 'supplier' | 'marketing' | 'analytics' | 'automation' | 'monitoring';
  status: 'active' | 'inactive' | 'deploying' | 'error';
  performance_score: number;
  discoveries_count: number;
  success_rate: number;
  last_execution?: Date;
  health: 'good' | 'warning' | 'critical';
  emoji: string;
}

interface ProductOpportunity {
  id: string;
  title: string;
  description: string;
  price_range: string;
  trend_score: number;
  profit_potential: 'High' | 'Medium' | 'Low';
  platform: string;
  supplier_leads: string[];
  market_insights: string;
  search_volume?: number;
  competition_level: string;
  confidence_score: number;
  profit_margin: number;
  monthly_searches: number;
}
```

## Architecture

### Frontend Stack
- **Framework**: React 18 + TypeScript + Vite
- **State Management**: Zustand for global state
- **Styling**: Tailwind CSS with custom components
- **Animation**: Framer Motion
- **3D Graphics**: Three.js + React Three Fiber
- **Testing**: Vitest + Testing Library
- **Build**: Vite with TypeScript compilation

### HTTP Client Features
- **Circuit Breaker**: Auto-failover when backend is unhealthy
- **Retry Policies**: Exponential backoff with jitter
- **Correlation IDs**: Request tracking across services
- **Timeout Handling**: Configurable per-request timeouts
- **Error Classification**: Detailed error type discrimination

### State Management Architecture
1. **Services Layer**: `src/services/empire-service.ts` - API communication with retry policies
2. **Store Layer**: `src/store/empire-store.ts` - Zustand global state with loading/error states
3. **Validation Layer**: `src/services/validators.ts` - Runtime type guards for API responses
4. **Component Layer**: React components with optimistic updates

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build

# Run tests
pnpm run test

# Run tests in watch mode
pnpm run test:watch

# Run tests with UI
pnpm run test:ui

# Lint code
pnpm run lint
```

## Error Handling & Resilience

### Circuit Breaker Pattern
- Fails fast after 5 consecutive failures
- Auto-recovery after 30 seconds
- Half-open state for gradual recovery

### Retry Policies
- **Metrics**: Linear backoff (500ms base, 1.5x multiplier, max 2 retries)
- **Agents**: Exponential backoff (300ms base, 2x multiplier, max 3 retries)  
- **Opportunities**: Exponential backoff (400ms base, 2x multiplier, max 3 retries)
- **Non-retryable**: 4xx HTTP errors, validation errors

### Error Classification
- **Timeout**: Request exceeded configured timeout
- **Network**: Network connectivity issues
- **HTTP**: Server returned error status (with status code)
- **Circuit Open**: Circuit breaker is open
- **Validation**: Data format validation failed

### User Experience
- **Loading States**: Skeleton loaders and spinners
- **Error States**: Retry buttons with descriptive messages
- **Empty States**: Call-to-action messaging when no data
- **Toast Notifications**: Success/error feedback for user actions
- **Network Status Bar**: Real-time service health monitoring

## Production Deployment

### Render (Flask Integrated) Setup
For deployment where Flask serves the React UI:
1. Build and copy to Flask static folder:
   ```bash
   pnpm run build:render
   ```
   This builds the React app and copies all files to `/static/` at the repository root.
2. Flask will serve the UI from the static folder on port 10000
3. Ensure environment variables are set in Render:
   ```bash
   VITE_API_BASE_URL=https://your-backend.com
   ```

### Cloudflare Pages Setup
1. Connect GitHub repository
2. Set build command: `pnpm run build`  
3. Set build output directory: `dist`
4. Configure environment variables:
   ```bash
   VITE_API_BASE_URL=https://your-backend.com
   ```

### Performance Considerations
- Bundle size: ~1.3MB (compressed ~384KB)
- Code splitting recommended for routes
- Tree shaking enabled for unused code elimination
- Vite optimizations for fast HMR in development

## Testing

- **Unit Tests**: Services, utilities, and pure functions
- **Component Tests**: React component rendering and interactions  
- **Integration Tests**: Store actions and API communication
- **E2E Tests**: Critical user flows (manual testing recommended)

Current test coverage: 20/20 tests passing