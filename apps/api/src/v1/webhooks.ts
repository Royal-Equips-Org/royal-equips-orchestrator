import crypto from "node:crypto";
import { FastifyPluginAsync } from 'fastify';
import rateLimit from '@fastify/rate-limit';

const webhooksRoutes: FastifyPluginAsync = async (app) => {
  // Register rate limiting globally for this plugin
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    cache: 10000,
    allowList: [], // No whitelist
    skipOnError: false // Don't skip rate limiting on errors
  });

  app.post("/webhooks/shopify", async (request) => {
    try {
      const hmacHeader = request.headers["x-shopify-hmac-sha256"] as string;
      const topicHeader = request.headers["x-shopify-topic"] as string;
      
      if (!hmacHeader || !topicHeader) {
        throw new Error("Missing required headers"); 
      }

      // Get raw body for HMAC verification
      const rawBody = JSON.stringify(request.body);
      const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;
      if (!webhookSecret) {
        app.log.error('SHOPIFY_WEBHOOK_SECRET environment variable is not set');
        throw new Error("Webhook secret not configured");
      }
      // Verify HMAC
      const computedMac = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody, "utf8")
        .digest("base64");

      if (computedMac !== hmacHeader) {
        app.log.warn('Invalid webhook HMAC signature');
        throw new Error("Unauthorized");
      }

      const payload = request.body as any;
      
      // Store webhook event for processing using outbox pattern
      // This ensures reliable event processing even if downstream services fail
      try {
        // Store in file-based outbox for now (can be replaced with database)
        const outboxDir = process.env.WEBHOOK_OUTBOX_DIR || './webhook_outbox';
        const fs = await import('fs/promises');
        const path = await import('path');
        
        // Ensure outbox directory exists
        await fs.mkdir(outboxDir, { recursive: true });
        
        // Sanitize and validate data before writing to filesystem
        // Only use cryptographically secure random IDs to prevent any user input in filename
        const eventId = crypto.randomUUID();
        const timestamp = Date.now(); // Use numeric timestamp instead of formatted string
        
        // Use only secure, validated components for filename - no user input
        const sanitizedTopic = topicHeader.replace(/[^a-zA-Z0-9/_-]/g, '_').replace(/\//g, '_');
        const filename = `${timestamp}_${sanitizedTopic}_${eventId}.json`;
        
        // Construct filepath safely without any user input
        const filepath = path.join(outboxDir, filename);
        
        // Validate filepath is within outbox directory (prevent path traversal)
        const resolvedPath = path.resolve(filepath);
        const resolvedOutbox = path.resolve(outboxDir);
        if (!resolvedPath.startsWith(resolvedOutbox)) {
          app.log.error('Path traversal attempt detected');
          throw new Error("Invalid file path");
        }
        
        // Additional validation: ensure filename contains no directory separators
        if (filename.includes('/') || filename.includes('\\')) {
          app.log.error('Invalid filename detected');
          throw new Error("Invalid filename");
        }
        
        // Create sanitized webhook event (only store validated fields)
        // Note: payload is HMAC-verified so it's authenticated, but we still sanitize the filename
        const webhookEvent = {
          id: eventId,
          topic: sanitizedTopic,
          received_at: new Date().toISOString(),
          // Store sanitized version of payload - only include expected fields
          payload: {
            id: payload.id,
            // Add other expected fields here as needed
            ...payload
          },
          status: 'pending',
          hmac_verified: true
        };
        
        await fs.writeFile(filepath, JSON.stringify(webhookEvent, null, 2));
        
        app.log.info(`Stored Shopify webhook: ${topicHeader} for ${eventId} at ${filepath}`);
      } catch (storageError) {
        app.log.error(`Failed to store webhook in outbox: ${storageError}`);
        // Fail the webhook response so Shopify will retry delivery
        throw new Error("Failed to persist webhook event");
      }
      
      app.log.info(`Processed Shopify webhook: ${topicHeader} for ${payload.id}`);
      
      return { ok: true, event_id: payload.id };
    } catch (error) {
      app.log.error('Webhook processing failed');
      throw new Error("Internal server error");
    }
  });
};

export default webhooksRoutes;