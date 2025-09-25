# Royal Equips Command Center UI

A modern React application for managing the Royal Equips Empire with real-time agent monitoring, product opportunity tracking, and AI-powered chat interface.

## Features

- **Agent Network Grid**: Monitor and manage AI agents with real-time status updates
- **Product Opportunity Cards**: Review and approve/reject product opportunities 
- **Revenue Tracker**: Track empire revenue progress and metrics
- **AI Chat Interface**: Communicate with AIRA (AI Royal Assistant)
- **Marketing Studio**: Create and manage marketing campaigns
- **Emergency Controls**: Emergency stop and autopilot controls

## Environment Setup

### Required Environment Variables

Create a `.env` file in the project root with:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8000

# Optional: Separate AIRA API URL
VITE_AIRA_API_URL=http://localhost:10000
```

### Authentication

The application expects an authentication token to be stored in localStorage:

```javascript
localStorage.setItem('empire_token', 'your-auth-token');
```

## Backend API Endpoints

The application expects the following REST API endpoints:

| Purpose | Method | Path | Description |
|---------|--------|------|-------------|
| Metrics | GET | `/api/empire/metrics` | Returns EmpireMetrics object |
| Agents | GET | `/api/empire/agents` | Returns array of Agent objects |
| Product Opportunities | GET | `/api/empire/opportunities` | Returns array of ProductOpportunity objects |
| Marketing Campaigns | GET | `/api/empire/campaigns` | Returns array of MarketingCampaign objects |
| Approve Product | POST | `/api/empire/opportunities/:id/approve` | Approves a product opportunity |
| Reject Product | POST | `/api/empire/opportunities/:id/reject` | Rejects a product opportunity (body: `{ reason }`) |
| Send Chat | POST | `/api/empire/chat` | Sends chat message (body: `{ content }`) |

## Data Flow

1. **Service Layer**: `src/services/empire-service.ts` handles all API communication
2. **State Management**: Zustand store (`src/store/empire-store.ts`) manages application state with loading/error states
3. **Type Safety**: TypeScript types in `src/types/empire.ts` ensure data consistency
4. **Validation**: Runtime type guards in `src/services/validators.ts` validate API responses
5. **Error Handling**: Circuit breaker pattern with retries and timeout handling

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

## Architecture

- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: Zustand for global state
- **Styling**: Tailwind CSS with custom components
- **Animation**: Framer Motion
- **3D Graphics**: Three.js + React Three Fiber
- **Testing**: Vitest + Testing Library
- **HTTP Client**: Custom fetch wrapper with resilience patterns

## Error Handling

The application implements several resilience patterns:

- **Circuit Breaker**: Fails fast when backend is unhealthy
- **Retry Logic**: Exponential backoff for transient failures
- **Timeout Handling**: Configurable request timeouts
- **Loading States**: Proper loading and error UI states
- **Graceful Degradation**: Fallback behavior when services are unavailable

## Empty State Behavior

- **Agents**: Shows "No agents registered yet" when empty
- **Opportunities**: Shows "No pending opportunities" when empty  
- **Metrics**: Shows placeholder blocks with "—" when null
- **Error States**: Retry buttons and descriptive error messages