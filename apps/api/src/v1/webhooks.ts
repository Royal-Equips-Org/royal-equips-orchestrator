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
      const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET || 'demo_secret';
      
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
      
      // TODO: Store in outbox pattern for processing
      // await db.outbox.insert({ 
      //   topic: topicHeader, 
      //   shopify_event_id: payload.id, 
      //   payload 
      // });
      
      app.log.info(`Received Shopify webhook: ${topicHeader} for ${payload.id}`);
      
      return { ok: true };
    } catch (error) {
      app.log.error('Webhook processing failed');
      throw new Error("Internal server error");
    }
  });
};

export default webhooksRoutes;