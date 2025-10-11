import { FastifyPluginAsync } from 'fastify';
import Stripe from "stripe";

const financeRoutes: FastifyPluginAsync = async (app) => {
  // Initialize Stripe client only if secret key is available
  let stripe: Stripe | null = null;
  
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-11-20.acacia',
      });
    } catch (error) {
      app.log.error('Failed to initialize Stripe client', error);
    }
  }

  app.get("/finance/stripe/balance", async (request, reply) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return reply.code(503).send({
          error: 'Stripe integration not configured',
          message: 'Please configure STRIPE_SECRET_KEY environment variable to enable financial data. ' +
                   'Visit https://dashboard.stripe.com/apikeys to create an API key. ' +
                   'Use the Secret Key (starts with "sk_") not the Publishable Key.',
          success: false,
          setup_required: true,
          documentation: 'https://stripe.com/docs/keys'
        });
      }

      if (!stripe) {
        return reply.code(500).send({
          error: 'Stripe client initialization failed',
          message: 'The Stripe API key is configured but the client failed to initialize. ' +
                   'Please verify your STRIPE_SECRET_KEY format is correct (should start with sk_test_ or sk_live_).',
          success: false
        });
      }

      const balance = await stripe.balance.retrieve();
      return reply.send({ 
        balance,
        success: true,
        source: 'live_stripe'
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      app.log.error(`Stripe balance fetch failed: ${errorMsg}`);
      
      // Parse Stripe-specific errors
      if (errorMsg.includes('Invalid API Key') || errorMsg.includes('401')) {
        return reply.code(401).send({
          error: 'Stripe authentication failed',
          message: 'Your Stripe API key is invalid or has been revoked. ' +
                   'Please verify STRIPE_SECRET_KEY in your environment configuration. ' +
                   'Generate a new API key at https://dashboard.stripe.com/apikeys if needed.',
          success: false,
          source: 'auth_error'
        });
      }
      
      if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
        return reply.code(429).send({
          error: 'Stripe API rate limit exceeded',
          message: 'Too many requests to Stripe API. Please wait a moment before trying again. ' +
                   'Consider implementing request caching to reduce API calls.',
          success: false,
          retry_after: 60
        });
      }
      
      return reply.code(503).send({
        error: 'Stripe API connection failed',
        message: `Unable to retrieve balance from Stripe: ${errorMsg}. ` +
                 'Please check your internet connection and Stripe service status at https://status.stripe.com.',
        success: false,
        retry_available: true
      });
    }
  });

  app.get("/finance/stripe/transactions", async (request, reply) => {
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        return reply.code(503).send({
          error: 'Stripe integration not configured',
          message: 'Please configure STRIPE_SECRET_KEY environment variable to access transaction data. ' +
                   'Visit https://dashboard.stripe.com/apikeys to create an API key.',
          success: false,
          setup_required: true
        });
      }

      if (!stripe) {
        return reply.code(500).send({
          error: 'Stripe client initialization failed',
          message: 'The Stripe API key is configured but the client failed to initialize. ' +
                   'Please verify your STRIPE_SECRET_KEY format.',
          success: false
        });
      }

      const charges = await stripe.charges.list({ limit: 50 });
      return reply.send({
        transactions: charges.data.map((c) => ({
          id: c.id,
          amount: c.amount,
          currency: c.currency,
          created: c.created,
          description: c.description,
          status: c.status
        })),
        total: charges.data.length,
        success: true,
        source: 'live_stripe'
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      app.log.error(`Stripe transactions fetch failed: ${errorMsg}`);
      
      if (errorMsg.includes('Invalid API Key') || errorMsg.includes('401')) {
        return reply.code(401).send({
          error: 'Stripe authentication failed',
          message: 'Your Stripe API key is invalid. Please verify STRIPE_SECRET_KEY configuration.',
          success: false
        });
      }
      
      return reply.code(503).send({
        error: 'Stripe API connection failed',
        message: `Unable to retrieve transactions: ${errorMsg}. Check Stripe service status.`,
        success: false,
        retry_available: true
      });
    }
  });
};

export default financeRoutes;