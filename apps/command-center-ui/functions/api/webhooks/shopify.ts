/**
 * Shopify Webhook Handler
 * Production-ready webhook processing for Shopify store events
 */

import { verifyShopifySignature, generateRequestId } from '../../utils/crypto';
import { WebhookLogger, createErrorResponse, createSuccessResponse } from '../../utils/logger';
import { createBackendForwarder, WebhookEvent } from '../../utils/backend';

interface Env {
  SHOPIFY_WEBHOOK_SECRET: string;
  BACKEND_API_URL?: string;  
  INTERNAL_API_SECRET?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const requestId = generateRequestId();
  const logger = new WebhookLogger(requestId, 'shopify');

  try {
    // Validate Shopify webhook secret is configured
    if (!env.SHOPIFY_WEBHOOK_SECRET) {
      logger.error('Shopify webhook secret not configured');
      return createErrorResponse(500, 'Webhook secret not configured', requestId);
    }

    // Get required headers
    const hmacSignature = request.headers.get('X-Shopify-Hmac-Sha256');
    const topic = request.headers.get('X-Shopify-Topic');
    const shopDomain = request.headers.get('X-Shopify-Shop-Domain');
    const webhookId = request.headers.get('X-Shopify-Webhook-Id');

    if (!hmacSignature) {
      logger.error('Missing Shopify HMAC signature header');
      return createErrorResponse(400, 'Missing X-Shopify-Hmac-Sha256 header', requestId);
    }

    if (!topic) {
      logger.error('Missing Shopify topic header');
      return createErrorResponse(400, 'Missing X-Shopify-Topic header', requestId);
    }

    if (!shopDomain) {
      logger.error('Missing Shopify shop domain header');
      return createErrorResponse(400, 'Missing X-Shopify-Shop-Domain header', requestId);
    }

    // Get raw body for HMAC verification
    const body = await request.text();
    
    if (!body) {
      logger.error('Empty request body');
      return createErrorResponse(400, 'Empty request body', requestId);
    }

    // Verify Shopify HMAC signature
    const isValidSignature = await verifyShopifySignature(
      hmacSignature,
      body,
      env.SHOPIFY_WEBHOOK_SECRET
    );

    if (!isValidSignature) {
      logger.error('Invalid Shopify HMAC signature', {
        topic,
        shopDomain,
        webhookId,
        signaturePrefix: hmacSignature.substring(0, 10) + '...',
      } as any);
      return createErrorResponse(401, 'Invalid HMAC signature', requestId);
    }

    // Parse JSON payload
    let payload: any;
    try {
      payload = JSON.parse(body);
    } catch (error) {
      logger.error('Invalid JSON payload', error as Error);
      return createErrorResponse(400, 'Invalid JSON payload', requestId);
    }

    // Add context to logger
    logger.addContext('topic', topic);
    logger.addContext('shopDomain', shopDomain);
    logger.addContext('webhookId', webhookId);
    logger.addContext('resourceId', payload.id);

    logger.info('Shopify webhook received and verified', {
      topic,
      shopDomain,
      webhookId,
      resourceId: payload.id,
      resourceType: topic.split('/')[0],
    });

    // Shopify expects responses within 5 seconds
    const startTime = Date.now();

    // Create webhook event for backend forwarding
    const webhookEvent: WebhookEvent = {
      id: webhookId || requestId,
      type: 'shopify',
      source: 'cloudflare-pages',
      timestamp: new Date().toISOString(),
      headers: {
        'X-Shopify-Topic': topic,
        'X-Shopify-Shop-Domain': shopDomain,
        'X-Shopify-Webhook-Id': webhookId || '',
        'X-Shopify-Hmac-Sha256': hmacSignature,
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
        // Don't fail the webhook - Shopify expects 2xx response
      }
    }

    // Process specific Shopify events
    await processShopifyEvent(topic, payload, shopDomain, logger);

    const processingTime = Date.now() - startTime;
    logger.info('Shopify webhook processed successfully', {
      processingTimeMs: processingTime,
    });

    // Return success response (Shopify expects 200)
    return createSuccessResponse(
      {
        topic,
        shopDomain,
        webhookId,
        resourceId: payload.id,
        processed: true,
        processingTimeMs: processingTime,
      },
      requestId,
      200
    );

  } catch (error) {
    logger.error('Unexpected error processing Shopify webhook', error as Error);
    return createErrorResponse(500, 'Internal server error', requestId);
  }
};

/**
 * Process specific Shopify events
 */
async function processShopifyEvent(
  topic: string,
  payload: any,
  shopDomain: string,
  logger: WebhookLogger
): Promise<void> {
  const [resource, action] = topic.split('/');

  switch (resource) {
    case 'orders':
      await processOrderEvent(action, payload, logger);
      break;

    case 'products':
      await processProductEvent(action, payload, logger);
      break;

    case 'customers':
      await processCustomerEvent(action, payload, logger);
      break;

    case 'inventory_levels':
      await processInventoryEvent(action, payload, logger);
      break;

    case 'app':
      await processAppEvent(action, payload, logger);
      break;

    default:
      logger.info('Processing generic Shopify event', {
        resource,
        action,
        resourceId: payload.id,
      });
      break;
  }
}

async function processOrderEvent(action: string, payload: any, logger: WebhookLogger): Promise<void> {
  logger.info('Processing order event', {
    action,
    orderId: payload.id,
    orderNumber: payload.order_number,
    totalPrice: payload.total_price,
    currency: payload.currency,
    financialStatus: payload.financial_status,
    fulfillmentStatus: payload.fulfillment_status,
    customerEmail: payload.customer?.email,
    lineItemsCount: payload.line_items?.length || 0,
  });
}

async function processProductEvent(action: string, payload: any, logger: WebhookLogger): Promise<void> {
  logger.info('Processing product event', {
    action,
    productId: payload.id,
    productTitle: payload.title,
    productType: payload.product_type,
    vendor: payload.vendor,
    status: payload.status,
    variantsCount: payload.variants?.length || 0,
  });
}

async function processCustomerEvent(action: string, payload: any, logger: WebhookLogger): Promise<void> {
  logger.info('Processing customer event', {
    action,
    customerId: payload.id,
    customerEmail: payload.email,
    firstName: payload.first_name,
    lastName: payload.last_name,
    ordersCount: payload.orders_count,
    totalSpent: payload.total_spent,
  });
}

async function processInventoryEvent(action: string, payload: any, logger: WebhookLogger): Promise<void> {
  logger.info('Processing inventory event', {
    action,
    inventoryItemId: payload.inventory_item_id,
    locationId: payload.location_id,
    available: payload.available,
  });
}

async function processAppEvent(action: string, payload: any, logger: WebhookLogger): Promise<void> {
  logger.info('Processing app event', {
    action,
    resourceId: payload.id || 'unknown',
  });
}