import { FastifyPluginAsync } from 'fastify';
import * as fs from 'fs/promises';
import path from 'node:path';

// Simple Shopify GraphQL client
class ShopifyGraphQL {
  constructor(private endpoint: string, private token: string) {}
  
  async query<T>(query: string, variables?: any): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 
        'X-Shopify-Access-Token': this.token, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ query, variables })
    });
    
    const result = await response.json();
    if (result.errors) {
      throw new Error(JSON.stringify(result.errors));
    }
    
    return result.data as T;
  }
}

const GQL_PRODUCTS = `
  query Products($cursor: String) {
    products(first: 100, after: $cursor) {
      edges { 
        cursor 
        node { 
          id 
          title 
          status 
          handle 
          createdAt 
          updatedAt 
          description
          productType
          vendor
          tags
          onlineStoreUrl
          totalInventory
          images(first: 5) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
          variants(first: 100) { 
            edges { 
              node { 
                id 
                sku 
                price 
                compareAtPrice 
                availableForSale
                inventoryQuantity
                weight
                weightUnit
                inventoryItem { 
                  id 
                } 
              } 
            } 
          } 
        } 
      }
      pageInfo { 
        hasNextPage 
      }
    }
  }`;

const GQL_ORDERS = `
  query Orders($cursor: String) {
    orders(first: 100, after: $cursor) {
      edges {
        cursor
        node {
          id
          name
          email
          totalPrice
          displayFinancialStatus
          displayFulfillmentStatus
          createdAt
          updatedAt
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }`;

const GQL_CUSTOMERS = `
  query Customers($cursor: String) {
    customers(first: 100, after: $cursor) {
      edges {
        cursor
        node {
          id
          email
          firstName
          lastName
          phone
          createdAt
          updatedAt
          ordersCount
          totalSpent
        }
      }
      pageInfo {
        hasNextPage
      }
    }
  }`;

const shopifyRoutes: FastifyPluginAsync = async (app) => {
  // Initialize Shopify client
  const shopifyClient = new ShopifyGraphQL(
    process.env.SHOPIFY_GRAPHQL_ENDPOINT || '',
    process.env.SHOPIFY_ACCESS_TOKEN || ''
  );



  app.get("/shopify/products", {
    config: {
      rateLimit: {
        max: 15,
        timeWindow: '1 minute'
      }
    }
  }, async (request, reply) => {
    try {
      const { cursor, limit = '50' } = request.query as { cursor?: string; limit?: string };
      
      // Require Shopify configuration
      if (!process.env.SHOPIFY_ACCESS_TOKEN || !process.env.SHOPIFY_GRAPHQL_ENDPOINT) {
        return reply.code(503).send({
          error: 'Shopify integration not configured',
          message: 'Please configure SHOPIFY_ACCESS_TOKEN and SHOPIFY_GRAPHQL_ENDPOINT environment variables. ' +
                   'Visit your Shopify Admin > Apps > Develop Apps to create API credentials. ' +
                   'Required scopes: read_products, read_inventory.',
          success: false,
          source: 'config_error',
          setup_required: true,
          documentation: 'https://shopify.dev/docs/api/admin-graphql'
        });
      }
      
      try {
        const products = await shopifyClient.query(GQL_PRODUCTS, { cursor });
        return reply.send({ 
          products, 
          success: true,
          source: 'live_shopify'
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        app.log.error(`Shopify API failed: ${errorMsg}`);
        
        // Parse specific Shopify API errors
        if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
          return reply.code(401).send({
            error: 'Shopify authentication failed',
            message: 'Your Shopify API credentials are invalid or expired. ' +
                     'Please verify SHOPIFY_ACCESS_TOKEN in your environment configuration. ' +
                     'You may need to regenerate the API token in your Shopify Admin.',
            success: false,
            source: 'auth_error'
          });
        }
        
        if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
          return reply.code(403).send({
            error: 'Shopify API permissions insufficient',
            message: 'Your Shopify API token does not have the required permissions. ' +
                     'Please ensure the API token has "read_products" and "read_inventory" scopes. ' +
                     'Update the API token permissions in Shopify Admin > Apps > Develop Apps.',
            success: false,
            source: 'permission_error'
          });
        }
        
        if (errorMsg.includes('429') || errorMsg.includes('rate limit')) {
          return reply.code(429).send({
            error: 'Shopify API rate limit exceeded',
            message: 'Too many requests to Shopify API. Please wait a moment and try again. ' +
                     'Consider implementing request caching or upgrading your Shopify plan for higher rate limits.',
            success: false,
            source: 'rate_limit_error',
            retry_after: 60
          });
        }
        
        // Generic connection error
        return reply.code(503).send({
          error: 'Shopify API connection failed',
          message: `Unable to connect to Shopify: ${errorMsg}. ` +
                   'Please check your SHOPIFY_GRAPHQL_ENDPOINT URL and network connectivity. ' +
                   'If the issue persists, Shopify may be experiencing service disruptions.',
          success: false,
          source: 'connection_error',
          retry_available: true
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      app.log.error(`Shopify products request failed: ${errorMsg}`);
      return reply.code(500).send({ 
        error: 'Internal server error', 
        message: 'An unexpected error occurred while processing your request. Please try again.',
        success: false 
      });
    }
  });



  app.get("/shopify/orders", {
    config: {
      rateLimit: {
        max: 15,
        timeWindow: '1 minute'
      }
    }
  }, async (request, reply) => {
    try {
      const { cursor } = request.query as { cursor?: string };
      
      // Enhanced Shopify API with proper error handling
      if (process.env.SHOPIFY_ACCESS_TOKEN) {
        try {
          const orders = await shopifyClient.query(GQL_ORDERS, { cursor });
          
          // Process and enhance the real data
          const processedOrders = {
            ...(orders as any),
            success: true,
            source: 'live_shopify',
            analytics: (() => {
              const today = new Date();
              const metrics = ((orders as any).orders?.edges ?? []).reduce(
                (acc: any, edge: any) => {
                  acc.total_orders += 1;
                  const createdAt = new Date(edge.node.createdAt);
                  if (createdAt.toDateString() === today.toDateString()) {
                    acc.today_orders += 1;
                  }
                  acc.total_revenue += parseFloat(edge.node.totalPrice || '0');
                  if (edge.node.displayFulfillmentStatus === 'UNFULFILLED') {
                    acc.pending_orders += 1;
                  }
                  return acc;
                },
                { total_orders: 0, today_orders: 0, total_revenue: 0, pending_orders: 0 }
              );
              return metrics;
            })()
          };

          return reply.send(processedOrders);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          app.log.warn(`Live Shopify orders API failed: ${errorMsg}`);
          // Return structured error instead of mock data
          return reply.code(503).send({
            error: 'Shopify API connection failed',
            message: 'Unable to connect to Shopify. Please check your API credentials.',
            success: false,
            source: 'api_error',
            retry_available: true
          });
        }
      }

      // No valid credentials - return connection error
      return reply.code(401).send({
        error: 'Shopify credentials not configured',
        message: 'Please configure SHOPIFY_ACCESS_TOKEN and SHOPIFY_GRAPHQL_ENDPOINT environment variables.',
        success: false,
        source: 'config_error',
        setup_required: true
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      app.log.error(`Shopify orders fetch failed: ${errorMsg}`);
      return reply.code(500).send({ 
        error: 'Internal server error', 
        success: false 
      });
    }
  });

  app.get("/shopify/customers", {
    config: {
      rateLimit: {
        max: 15,
        timeWindow: '1 minute'
      }
    }
  }, async (request, reply) => {
    try {
      const { cursor } = request.query as { cursor?: string };
      
      // Enhanced Shopify API with proper error handling
      if (process.env.SHOPIFY_ACCESS_TOKEN) {
        try {
          const customers = await shopifyClient.query(GQL_CUSTOMERS, { cursor });
          
          // Process and enhance the real customer data
          const processedCustomers = {
            ...(customers as any),
            success: true,
            source: 'live_shopify',
            analytics: {
              total_customers: (customers as any).customers?.edges?.length || 0,
              new_customers: (customers as any).customers?.edges?.filter((edge: any) => {
                const createdAt = new Date(edge.node.createdAt);
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return createdAt > monthAgo;
              }).length || 0,
              returning_customers: (customers as any).customers?.edges?.filter((edge: any) => 
                edge.node.ordersCount > 1
              ).length || 0,
              total_spent: (customers as any).customers?.edges?.reduce((sum: number, edge: any) => 
                sum + parseFloat(edge.node.totalSpent || '0'), 0
              ) || 0,
              avg_lifetime_value: (customers as any).customers?.edges?.length > 0 
                ? ((customers as any).customers.edges.reduce((sum: number, edge: any) => 
                    sum + parseFloat(edge.node.totalSpent || '0'), 0
                  ) / (customers as any).customers.edges.length) 
                : 0
            }
          };

          return reply.send(processedCustomers);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          app.log.warn(`Live Shopify customers API failed: ${errorMsg}`);
          return reply.code(503).send({
            error: 'Shopify API connection failed',
            message: 'Unable to connect to Shopify customers endpoint. Please check your API credentials.',
            success: false,
            source: 'api_error',
            retry_available: true
          });
        }
      }

      // No valid credentials
      return reply.code(401).send({
        error: 'Shopify credentials not configured',
        message: 'Please configure SHOPIFY_ACCESS_TOKEN and SHOPIFY_GRAPHQL_ENDPOINT environment variables.',
        success: false,
        source: 'config_error',
        setup_required: true
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      app.log.error(`Shopify customers fetch failed: ${errorMsg}`);
      return reply.code(500).send({ 
        error: 'Internal server error', 
        success: false 
      });
    }
  });

  // Product analytics endpoint - requires real-time Shopify data aggregation
  app.get("/shopify/analytics", {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute'
      }  
    }
  }, async (request, reply) => {
    try {
      // Require Shopify configuration for analytics
      if (!process.env.SHOPIFY_ACCESS_TOKEN || !process.env.SHOPIFY_GRAPHQL_ENDPOINT) {
        return reply.code(503).send({
          error: 'Shopify analytics not available',
          message: 'Shopify integration is not configured. Please configure SHOPIFY_ACCESS_TOKEN to enable analytics. ' +
                   'Analytics data is calculated from real-time Shopify product, order, and customer data.',
          success: false,
          source: 'config_error',
          setup_required: true
        });
      }

      // TODO: Implement real-time analytics aggregation from Shopify API
      // This should:
      // 1. Query products with sales data
      // 2. Calculate revenue, conversion rates, top performers
      // 3. Aggregate customer metrics
      // 4. Generate trend analysis
      
      return reply.code(501).send({
        error: 'Analytics aggregation not yet implemented',
        message: 'Real-time Shopify analytics aggregation is under development. ' +
                 'This endpoint will calculate analytics from live Shopify data including: ' +
                 'revenue trends, top products, customer segments, and conversion rates. ' +
                 'Please use individual Shopify API endpoints (/shopify/products, /shopify/orders) for now.',
        success: false,
        source: 'not_implemented',
        available_endpoints: [
          '/shopify/products',
          '/shopify/orders',
          '/shopify/customers'
        ]
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      app.log.error(`Shopify analytics request failed: ${errorMsg}`);
      return reply.code(500).send({
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing analytics request.',
        success: false
      });
    }
  });
}; // End of shopifyRoutes FastifyPluginAsync

export default shopifyRoutes;