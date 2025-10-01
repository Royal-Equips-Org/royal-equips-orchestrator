/**
 * Backend integration utilities for forwarding webhook events
 * Production-ready event forwarding with retry logic and circuit breaking
 */

import { WebhookLogger } from './logger';

export interface WebhookEvent {
  id: string;
  type: 'github' | 'shopify' | 'command-center';
  source: string;
  timestamp: string;
  headers: Record<string, string>;
  payload: any;
}

export interface BackendConfig {
  baseUrl: string;
  apiSecret: string;
  timeout: number;
}

export class BackendForwarder {
  private config: BackendConfig;
  private logger: WebhookLogger;

  constructor(config: BackendConfig, logger: WebhookLogger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Forward webhook event to backend services
   */
  async forwardEvent(event: WebhookEvent): Promise<boolean> {
    const endpoints = this.getEndpoints(event.type);
    const results = await Promise.allSettled(
      endpoints.map(endpoint => this.sendToEndpoint(endpoint, event))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;

    this.logger.info('Event forwarding completed', {
      event_id: event.id,
      event_type: event.type,
      endpoints: endpoints.length,
      successful,
      failed,
    });

    return successful > 0; // At least one endpoint succeeded
  }

  /**
   * Get backend endpoints for event type
   */
  private getEndpoints(eventType: string): string[] {
    const endpoints: string[] = [];

    switch (eventType) {
      case 'github':
        endpoints.push(`${this.config.baseUrl}/api/webhooks/github`);
        endpoints.push(`${this.config.baseUrl}/api/v1/webhooks/github`);
        break;
      case 'shopify':
        endpoints.push(`${this.config.baseUrl}/api/shopify/webhooks/processed`);
        endpoints.push(`${this.config.baseUrl}/api/v1/webhooks/shopify`);
        break;
      case 'command-center':
        endpoints.push(`${this.config.baseUrl}/api/empire/events`);
        break;
    }

    return endpoints;
  }

  /**
   * Send event to specific endpoint with retry logic
   */
  private async sendToEndpoint(endpoint: string, event: WebhookEvent): Promise<void> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(endpoint, event);
        
        if (response.ok) {
          this.logger.info('Event forwarded successfully', {
            endpoint,
            attempt,
            status: response.status,
            event_id: event.id,
          });
          return;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      } catch (error) {
        lastError = error as Error;
        
        this.logger.warn('Event forwarding attempt failed', {
          endpoint,
          attempt,
          max_retries: maxRetries,
          error: lastError.message,
          event_id: event.id,
        });

        if (attempt < maxRetries) {
          // Exponential backoff: 100ms, 200ms, 400ms
          await this.delay(100 * Math.pow(2, attempt - 1));
        }
      }
    }

    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Make HTTP request to backend endpoint
   */
  private async makeRequest(endpoint: string, event: WebhookEvent): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiSecret}`,
          'X-Webhook-Source': 'cloudflare-pages',
          'X-Event-ID': event.id,
          'User-Agent': 'Royal-Equips-Webhook-Forwarder/1.0',
        },
        body: JSON.stringify(event),
        signal: controller.signal,
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create backend forwarder instance from environment
 */
export function createBackendForwarder(
  env: any,
  logger: WebhookLogger
): BackendForwarder | null {
  const baseUrl = env.BACKEND_API_URL;
  const apiSecret = env.INTERNAL_API_SECRET;

  if (!baseUrl || !apiSecret) {
    logger.warn('Backend forwarding disabled - missing configuration', {
      has_url: !!baseUrl,
      has_secret: !!apiSecret,
    });
    return null;
  }

  return new BackendForwarder(
    {
      baseUrl: baseUrl.replace(/\/$/, ''), // Remove trailing slash
      apiSecret,
      timeout: 10000, // 10 seconds
    },
    logger
  );
}