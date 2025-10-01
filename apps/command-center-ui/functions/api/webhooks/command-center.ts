/**
 * Command Center Internal Webhook Handler
 * For internal system events and cross-service communication
 */

import { generateRequestId } from '../../utils/crypto';
import { WebhookLogger, createErrorResponse, createSuccessResponse } from '../../utils/logger';
import { createBackendForwarder, WebhookEvent } from '../../utils/backend';

interface Env {
  INTERNAL_API_SECRET: string;
  BACKEND_API_URL?: string;
}

interface InternalWebhookPayload {
  event: string;
  source: string;
  timestamp: string;
  data: any;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const requestId = generateRequestId();
  const logger = new WebhookLogger(requestId, 'command-center');

  try {
    // Validate internal API secret is configured
    if (!env.INTERNAL_API_SECRET) {
      logger.error('Internal API secret not configured');
      return createErrorResponse(500, 'Internal API secret not configured', requestId);
    }

    // Verify authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.error('Missing or invalid authorization header');
      return createErrorResponse(401, 'Missing or invalid authorization', requestId);
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix
    if (token !== env.INTERNAL_API_SECRET) {
      logger.error('Invalid API token');
      return createErrorResponse(401, 'Invalid API token', requestId);
    }

    // Get event source from headers
    const eventSource = request.headers.get('X-Event-Source') || 'unknown';
    const eventId = request.headers.get('X-Event-ID') || requestId;

    // Get request body
    const body = await request.text();
    if (!body) {
      logger.error('Empty request body');
      return createErrorResponse(400, 'Empty request body', requestId);
    }

    // Parse JSON payload
    let payload: InternalWebhookPayload;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      logger.error('Invalid JSON payload', error as Error);
      return createErrorResponse(400, 'Invalid JSON payload', requestId);
    }

    // Validate payload structure
    if (!payload.event || !payload.source || !payload.timestamp) {
      logger.error('Invalid payload structure', {
        hasEvent: !!payload.event,
        hasSource: !!payload.source,
        hasTimestamp: !!payload.timestamp,
      } as any);
      return createErrorResponse(400, 'Invalid payload structure', requestId);
    }

    // Add context to logger
    logger.addContext('event', payload.event);
    logger.addContext('source', payload.source);
    logger.addContext('eventId', eventId);

    logger.info('Command center webhook received', {
      event: payload.event,
      source: payload.source,
      eventSource,
      eventId,
    });

    // Create webhook event for backend forwarding
    const webhookEvent: WebhookEvent = {
      id: eventId,
      type: 'command-center',
      source: 'cloudflare-pages',
      timestamp: new Date().toISOString(),
      headers: {
        'X-Event-Source': eventSource,
        'X-Event-ID': eventId,
      },
      payload,
    };

    // Forward to backend services if configured
    const forwarder = createBackendForwarder(env, logger);
    if (forwarder) {
      try {
        await forwarder.forwardEvent(webhookEvent);
        logger.info('Event forwarded to backend services');
      } catch (error) {
        logger.error('Failed to forward event to backend', error as Error);
        // Don't fail the webhook - return success anyway
      }
    }

    // Process specific command center events
    await processCommandCenterEvent(payload, logger);

    return createSuccessResponse(
      {
        event: payload.event,
        source: payload.source,
        eventId,
        processed: true,
      },
      requestId,
      200
    );

  } catch (error) {
    logger.error('Unexpected error processing command center webhook', error as Error);
    return createErrorResponse(500, 'Internal server error', requestId);
  }
};

/**
 * Process specific command center events
 */
async function processCommandCenterEvent(
  payload: InternalWebhookPayload,
  logger: WebhookLogger
): Promise<void> {
  switch (payload.event) {
    case 'agent.status_changed':
      logger.info('Processing agent status change', {
        agentId: payload.data?.agentId,
        status: payload.data?.status,
        previousStatus: payload.data?.previousStatus,
      });
      break;

    case 'empire.metrics_updated':
      logger.info('Processing empire metrics update', {
        metricType: payload.data?.type,
        value: payload.data?.value,
        timestamp: payload.data?.timestamp,
      });
      break;

    case 'deployment.completed':
      logger.info('Processing deployment completion', {
        environment: payload.data?.environment,
        version: payload.data?.version,
        status: payload.data?.status,
      });
      break;

    case 'health.check_failed':
      logger.info('Processing health check failure', {
        service: payload.data?.service,
        endpoint: payload.data?.endpoint,
        error: payload.data?.error,
      });
      break;

    case 'revenue.threshold_reached':
      logger.info('Processing revenue threshold event', {
        threshold: payload.data?.threshold,
        currentValue: payload.data?.currentValue,
        period: payload.data?.period,
      });
      break;

    case 'campaign.status_changed':
      logger.info('Processing campaign status change', {
        campaignId: payload.data?.campaignId,
        status: payload.data?.status,
        previousStatus: payload.data?.previousStatus,
      });
      break;

    default:
      logger.info('Processing generic command center event', {
        event: payload.event,
        dataKeys: Object.keys(payload.data || {}),
      });
      break;
  }
}