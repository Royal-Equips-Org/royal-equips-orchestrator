import { FastifyPluginAsync } from 'fastify';
import Stripe from "stripe";

const financeRoutes: FastifyPluginAsync = async (app) => {
  // Initialize Stripe client only if secret key is available
  let stripe: any = null;
  const useStripeMock = process.env.STRIPE_USE_MOCK === 'true';
  if (process.env.STRIPE_SECRET_KEY && !useStripeMock) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  app.get("/finance/stripe/balance", async () => {
    try {
      if (stripe) {
        const balance = await stripe.balance.retrieve();
        return { 
          balance,
          success: true 
        };
      } else {
        return {
          error: 'Stripe not configured',
          message: 'Provide STRIPE_SECRET_KEY to enable finance endpoints.',
          success: false
        };
      }
    } catch (error) {
      app.log.error('Stripe balance fetch failed');
      return {
        error: 'Finance service error',
        message: 'Failed to retrieve Stripe balance.',
        success: false
      };
    }
  });

  app.get("/finance/stripe/transactions", async () => {
    if (!stripe) {
      return {
        error: 'Stripe not configured',
        message: 'Provide STRIPE_SECRET_KEY to enable finance endpoints.',
        success: false
      };
    }
    const charges = await stripe.charges.list({ limit: 50 });
    return {
      transactions: charges.data.map((c: any) => ({
        id: c.id,
        amount: c.amount,
        currency: c.currency,
        created: c.created,
        description: c.description,
        status: c.status
      })),
      total: charges.data.length,
      success: true
    };
  });
};

export default financeRoutes;