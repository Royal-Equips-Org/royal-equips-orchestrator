// packages/shared/websocket/index.ts

export type Channel = "system" | "shopify" | "logs";
export type LogLevel = "debug" | "info" | "warning" | "error";

/** Generieke eventbasis. */
export interface WebSocketEvent<D = unknown> {
  channel: string;
  event: string;
  data: D;
  timestamp: Date;
}

/** System → heartbeat */
export interface SystemHeartbeat
  extends WebSocketEvent<{
    metrics: import("../types").SystemMetrics;
    agents: import("../types").Agent[];
  }> {
  channel: "system";
  event: "heartbeat";
}

/** Shopify → progress/ratelimit/webhook */
export interface ShopifyUpdate
  extends WebSocketEvent<{
    jobId?: string;
    progress?: number;
    rateLimitRemaining?: number;
    webhookData?: unknown;
  }> {
  channel: "shopify";
  event: "sync_progress" | "rate_limit" | "webhook";
}

/** Logs → streaming logregels */
export interface LogStreamEvent
  extends WebSocketEvent<{
    level: LogLevel;
    message: string;
    source: string;
    timestamp: Date;
  }> {
  channel: "logs";
  event: "log";
}

/** Handige union voor alle events. */
export type WebSocketMessage = SystemHeartbeat | ShopifyUpdate | LogStreamEvent;
