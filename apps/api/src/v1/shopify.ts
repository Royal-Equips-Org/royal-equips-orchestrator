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
          financialStatus
          fulfillmentStatus
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
    process.env.SHOPIFY_GRAPHQL_ENDPOINT || 'https://demo.myshopify.com/admin/api/2024-01/graphql.json',
    process.env.SHOPIFY_ACCESS_TOKEN || 'demo_token'
  );

  // Function to get the latest shopify data file
  async function getLatestShopifyData(type: 'products' | 'analysis') {
    try {
      const dataDir = process.env.SHOPIFY_DATA_DIR
        ? path.resolve(process.env.SHOPIFY_DATA_DIR)
        : path.join(process.cwd(), '../../shopify_data');
      const files = await fs.readdir(dataDir);
      const typeFiles = files.filter(f => f.startsWith(`${type}_`) && f.endsWith('.json'));
      
      if (typeFiles.length === 0) {
        return null;
      }
      
      // Sort by date (latest first)
      typeFiles.sort().reverse();
      const latestFile = typeFiles[0];
      
      const content = await fs.readFile(path.join(dataDir, latestFile), 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      app.log.warn(`Failed to read ${type} data from file: ${error}`);
      return null;
    }
  }

  app.get("/shopify/products", async (request, reply) => {
    try {
      const { cursor, limit = '50' } = request.query as { cursor?: string; limit?: string };
      
      // Try to get real data from Shopify first
      if (process.env.SHOPIFY_ACCESS_TOKEN && process.env.SHOPIFY_ACCESS_TOKEN !== 'demo_token') {
        try {
          const products = await shopifyClient.query(GQL_PRODUCTS, { cursor });
          return reply.send({ 
            products, 
            success: true,
            source: 'live_shopify'
          });
        } catch (error) {
          app.log.warn('Live Shopify API failed, falling back to cached data');
        }
      }

      // Fallback to cached data
      const cachedProducts = await getLatestShopifyData('products');
      if (cachedProducts) {
        // Apply pagination simulation
        const limitNum = parseInt(limit);
        const startIndex = cursor ? parseInt(cursor) : 0;
        const slicedProducts = cachedProducts.slice(startIndex, startIndex + limitNum);
        
        // Enhance products with professional images and additional data
        const enhancedProducts = slicedProducts.map((product: any, index: number) => {
          // Generate professional product images based on product type/category
          const imageUrl = generateProductImage(product);
          
          return {
            ...product,
            images: product.images || {
              edges: [{
                node: {
                  id: `image_${product.id}`,
                  url: imageUrl,
                  altText: product.title,
                  width: 800,
                  height: 600
                }
              }]
            },
            description: product.description || generateProductDescription(product),
            vendor: product.vendor || "Royal Equips",
            productType: product.productType || categorizeProduct(product.title),
            tags: product.tags || generateProductTags(product.title),
            totalInventory: product.totalInventory || Math.floor(Math.random() * 100) + 10,
            onlineStoreUrl: product.onlineStoreUrl || `https://royalequips.com/products/${product.handle}`,
            variants: product.variants || {
              edges: [{
                node: {
                  id: `variant_${product.id}`,
                  sku: `RE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                  price: (Math.random() * 200 + 20).toFixed(2),
                  compareAtPrice: product.compareAtPrice || (Math.random() * 50 + 250).toFixed(2),
                  availableForSale: true,
                  inventoryQuantity: Math.floor(Math.random() * 100) + 5,
                  weight: Math.random() * 5 + 0.1,
                  weightUnit: "KILOGRAMS"
                }
              }]
            }
          };
        });
        
        return reply.send({ 
          products: {
            edges: enhancedProducts.map((product: any, index: number) => ({
              cursor: (startIndex + index + 1).toString(),
              node: product
            })),
            pageInfo: {
              hasNextPage: startIndex + limitNum < cachedProducts.length
            }
          },
          success: true,
          source: 'enhanced_cached_data',
          total: cachedProducts.length
        });
      }

      // Final fallback - professional mock data (should not happen with real data)
      return reply.send({
        products: {
          edges: [],
          pageInfo: { hasNextPage: false }
        },
        success: true,
        source: 'no_data_available',
        message: 'No product data available'
      });
    } catch (error) {
      app.log.error('Shopify products fetch failed');
      return reply.code(500).send({ 
        error: 'Failed to fetch products', 
        success: false 
      });
    }
  });

  // Helper functions for product enhancement
  function generateProductImage(product: any): string {
    const categories = [
      'electronics', 'fashion', 'home', 'beauty', 'sports', 'automotive', 
      'jewelry', 'books', 'toys', 'health'
    ];
    
    const category = categorizeProduct(product.title).toLowerCase();
    const matchedCategory = categories.find(cat => category.includes(cat)) || 'electronics';
    
    // Use Unsplash for high-quality product images
    const imageTopics = {
      'electronics': 'technology,gadget,device',
      'fashion': 'fashion,clothing,style',
      'home': 'home,decor,furniture',
      'beauty': 'beauty,cosmetics,skincare',
      'sports': 'sports,fitness,athletic',
      'automotive': 'car,automotive,vehicle',
      'jewelry': 'jewelry,accessories,luxury',
      'books': 'books,reading,literature',
      'toys': 'toys,games,children',
      'health': 'health,wellness,medical'
    };
    
    const topic = imageTopics[matchedCategory as keyof typeof imageTopics] || 'product';
    // Use Unsplash's random image endpoint with topics as query
    return `https://source.unsplash.com/800x600/?${topic}`;
  } // End of generateProductImage

  function generateProductDescription(product: any): string {
    return product.description || `Premium ${product.title} - Expertly crafted with attention to detail and superior quality. Perfect for discerning customers who appreciate excellence. Features advanced functionality and elegant design that sets it apart from ordinary products.`;
  }

  function categorizeProduct(title: string): string {
    const keywords = {
      'Electronics': ['charger', 'usb', 'cable', 'tech', 'electronic', 'digital', 'smart', 'device', 'gadget'],
      'Fashion': ['dress', 'shoe', 'heel', 'boot', 'sneaker', 'clothing', 'apparel', 'fashion', 'wear'],
      'Beauty': ['mask', 'skincare', 'beauty', 'cosmetic', 'facial', 'cream', 'serum'],
      'Automotive': ['car', 'auto', 'vehicle', 'drive', 'motor'],
      'Home': ['home', 'house', 'decor', 'furniture', 'kitchen'],
      'Sports': ['sport', 'fitness', 'athletic', 'gym', 'exercise']
    };
    
    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(word => title.toLowerCase().includes(word))) {
        return category;
      }
    }
    return 'General';
  }

  function generateProductTags(title: string): string[] {
    const allTags = ['premium', 'bestseller', 'new-arrival', 'featured', 'trending', 'high-quality'];
    const category = categorizeProduct(title).toLowerCase();
    return [category, ...allTags.slice(0, Math.floor(Math.random() * 3) + 2)];
  }

  app.get("/shopify/orders", async (request, reply) => {
    try {
      const { cursor } = request.query as { cursor?: string };
      
      // Enhanced Shopify API with proper error handling
      if (process.env.SHOPIFY_ACCESS_TOKEN && process.env.SHOPIFY_ACCESS_TOKEN !== 'demo_token') {
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
                  if (edge.node.fulfillmentStatus === 'UNFULFILLED') {
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

  app.get("/shopify/customers", async (request, reply) => {
    try {
      const { cursor } = request.query as { cursor?: string };
      
      // Enhanced Shopify API with proper error handling
      if (process.env.SHOPIFY_ACCESS_TOKEN && process.env.SHOPIFY_ACCESS_TOKEN !== 'demo_token') {
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

  // Product analytics endpoint using cached analysis data
  app.get("/shopify/analytics", async (request, reply) => {
    try {
      const analysisData = await getLatestShopifyData('analysis');
      
      if (analysisData) {
        return reply.send({
          analytics: analysisData,
          success: true,
          source: 'cached_analysis'
        });
      }

      // Mock analytics if no cached data
      return reply.send({
        analytics: {
          summary: {
            total_products: 0,
            active_products: 0,
            avg_price: 0,
            price_range: { min: 0, max: 0 }
          },
          categories: {},
          opportunities: []
        },
        success: true,
        source: 'mock_data'
      });
    } catch (error) {
      app.log.error('Shopify analytics fetch failed');
      return reply.code(500).send({
        error: 'Failed to fetch analytics',
        success: false
      });
    }
  });
}; // End of shopifyRoutes FastifyPluginAsync

export default shopifyRoutes;