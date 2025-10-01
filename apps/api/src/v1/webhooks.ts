import crypto from "node:crypto";
import { FastifyPluginAsync } from 'fastify';

const webhooksRoutes: FastifyPluginAsync = async (app) => {
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
        
        // Create webhook event file
        const eventId = payload.id || crypto.randomUUID();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${timestamp}_${topicHeader.replace(/\//g, '_')}_${eventId}.json`;
        const filepath = path.join(outboxDir, filename);
        
        const webhookEvent = {
          id: eventId,
          topic: topicHeader,
          received_at: new Date().toISOString(),
          payload: payload,
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