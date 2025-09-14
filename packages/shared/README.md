# Shared TypeScript Types for ARIA Command Center

This package contains shared TypeScript interfaces, types, and API contracts used across the frontend and backend.

## Structure

- `types/` - Core domain types
- `api-contracts/` - API request/response types
- `websocket/` - WebSocket event types

## Usage

```typescript
import { Agent, SystemMetrics } from '@royal-equips/shared/types'
import { ShopifySync } from '@royal-equips/shared/api-contracts'
```