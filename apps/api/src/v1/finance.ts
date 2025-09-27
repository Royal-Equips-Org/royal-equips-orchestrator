import { FastifyPluginAsync } from 'fastify';
import Stripe from "stripe";

const financeRoutes: FastifyPluginAsync = async (app) => {
  // Initialize Stripe client
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_demo');

  app.get("/finance/stripe/balance", async () => {
    try {
      const balance = await stripe.balance.retrieve();
      
      return { 
        balance,
        success: true 
      };
    } catch (error) {
      app.log.error('Stripe balance fetch failed');
      
      // Return mock data if Stripe is not configured
      return {
        balance: {
          available: [
            {
              amount: 125000,
              currency: 'usd',
              source_types: {
                card: 125000
              }
            }
          ],
          pending: [
            {
              amount: 25000,
              currency: 'usd',
              source_types: {
                card: 25000
              }
            }
          ]
        },
        success: true,
        mock: true
      };
    }
  });

  app.get("/finance/stripe/transactions", async () => {
    // Mock transaction data
    return {
      transactions: [
        {
          id: "txn_1234567890",
          amount: 2500,
          currency: "usd",
          created: Date.now() / 1000,
          description: "Payment for Order #1001",
          status: "succeeded"
        },
        {
          id: "txn_0987654321",
          amount: 1750,
          currency: "usd", 
          created: (Date.now() - 86400000) / 1000,
          description: "Payment for Order #1000",
          status: "succeeded"
        }
      ],
      total: 2,
      success: true
    };
  });
};

export default financeRoutes;