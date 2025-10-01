import { BaseAgent } from '@royal-equips/agents-core';
import type { 
  AgentExecutionPlan, 
  AgentExecutionResult, 
  AgentConfig 
} from '@royal-equips/agents-core';
import { ShopifyConnector } from '@royal-equips/connectors';
import { Logger } from 'pino';
import { z } from 'zod';
import axios from 'axios';

const ProductResearchParams = z.object({
  category: z.string().optional(),
  priceRange: z.object({
    min: z.number(),
    max: z.number()
  }).optional(),
  targetMargin: z.number().min(0).max(100).default(50),
  maxProducts: z.number().min(1).max(50).default(10)
});

interface TrendingProduct {
  title: string;
  description: string;
  estimatedPrice: number;
  supplierPrice: number;
  margin: number;
  category: string;
  tags: string[];
  images: string[];
  supplierInfo: {
    name: string;
    rating: number;
    reliability: number;
  };
}

export class ProductResearchAgent extends BaseAgent {
  private shopify: ShopifyConnector;
  private openaiApiKey: string;

  constructor(
    config: AgentConfig, 
    logger: Logger, 
    shopify: ShopifyConnector,
    openaiApiKey: string
  ) {
    super(config, logger);
    this.shopify = shopify;
    this.openaiApiKey = openaiApiKey;
  }

  async plan(parameters: Record<string, unknown>): Promise<AgentExecutionPlan> {
    const params = this.validateParameters(ProductResearchParams, parameters);
    const planId = this.generatePlanId();

    this.logger.info({
      event: 'plan_created',
      agentId: this.config.id,
      planId,
      parameters: params
    }, 'ProductResearchAgent plan created');

    return {
      id: planId,
      agentId: this.config.id,
      action: 'research_and_create_products',
      parameters: params,
      dependencies: [],
      riskLevel: 'medium', // Creating draft products is medium risk
      needsApproval: (params.maxProducts || 10) > 20, // Large batches need approval
      rollbackPlan: {
        steps: [
          {
            action: 'delete_created_products',
            parameters: { planId },
            order: 1
          }
        ],
        timeout: 300000,
        fallbackAction: 'mark_products_as_draft'
      },
      timestamp: new Date().toISOString()
    };
  }

  async dryRun(plan: AgentExecutionPlan): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info({
        event: 'dry_run_started',
        planId: plan.id,
        agentId: this.config.id
      }, 'Starting product research dry run');
      
      // Find trending products using real APIs
      const trendingProducts = await this.findTrendingProducts(plan.parameters);
      
      // Validate products meet criteria
      const validProducts = this.validateProductCriteria(trendingProducts, plan.parameters);
      
      return {
        planId: plan.id,
        status: 'success',
        results: {
          productsFound: validProducts.length,
          products: validProducts.slice(0, 3), // Show first 3 as preview
          estimatedRevenue: validProducts.reduce((sum, p) => sum + p.estimatedPrice, 0),
          averageMargin: validProducts.reduce((sum, p) => sum + p.margin, 0) / validProducts.length
        },
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: 1,
          apiCalls: 2, // Simulated API calls
          dataProcessed: validProducts.length
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error({
        event: 'dry_run_failed',
        planId: plan.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'Dry run execution failed');
      
      return {
        planId: plan.id,
        status: 'error',
        results: {},
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: 0,
          apiCalls: 0,
          dataProcessed: 0
        },
        errors: [error instanceof Error ? error.message : String(error)],
        timestamp: new Date().toISOString()
      };
    }
  }

  async apply(plan: AgentExecutionPlan): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const createdProducts = [];
    
    try {
      this.logger.info({
        event: 'apply_started',
        planId: plan.id,
        agentId: this.config.id
      }, 'Starting product research execution');
      
      // Step 1: Research trending products
      const trendingProducts = await this.findTrendingProducts(plan.parameters);
      this.logger.info({
        event: 'products_found',
        count: trendingProducts.length,
        planId: plan.id
      }, `Found ${trendingProducts.length} trending products`);
      
      // Step 2: Validate and filter products
      const validProducts = this.validateProductCriteria(trendingProducts, plan.parameters);
      this.logger.info({
        event: 'products_validated',
        validCount: validProducts.length,
        totalCount: trendingProducts.length,
        planId: plan.id
      }, `Validated ${validProducts.length} products out of ${trendingProducts.length}`);
      
      // Step 3: Create products in Shopify as drafts
      for (const product of validProducts) {
        try {
          const shopifyProduct = await this.shopify.createProduct({
            title: product.title,
            body_html: product.description,
            product_type: product.category,
            status: 'draft', // Always create as draft for safety
            variants: [{
              price: product.estimatedPrice.toString(),
              inventory_quantity: 0, // Start with 0 inventory
              sku: this.generateSKU(product.title)
            }]
          });
          
          createdProducts.push({
            shopifyId: shopifyProduct.id,
            title: product.title,
            price: product.estimatedPrice,
            margin: product.margin
          });
          
          this.logger.info(`Product created in Shopify: ${product.title} (${shopifyProduct.id})`);
          
          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          this.logger.error(`Failed to create product ${product.title}: ${error}`);
        }
      }
      
      const totalRevenue = createdProducts.reduce((sum, p) => sum + p.price, 0);
      const avgMargin = createdProducts.reduce((sum, p) => sum + p.margin, 0) / createdProducts.length;
      
      return {
        planId: plan.id,
        status: 'success',
        results: {
          productsCreated: createdProducts.length,
          products: createdProducts,
          totalEstimatedRevenue: totalRevenue,
          averageMargin: avgMargin,
          createdAt: new Date().toISOString()
        },
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: createdProducts.length,
          apiCalls: createdProducts.length + 2,
          dataProcessed: validProducts.length
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error({
        event: 'execution_failed',
        planId: plan.id,
        error: error instanceof Error ? error.message : String(error),
        partialResults: createdProducts.length
      }, 'Product research execution failed');
      
      // Attempt to rollback created products
      if (createdProducts.length > 0) {
        this.logger.warn({
          event: 'rollback_needed',
          planId: plan.id,
          productsToRollback: createdProducts.length
        }, 'Attempting to rollback partially created products');
        
        // Delete the created products from Shopify
        for (const product of createdProducts) {
          try {
            await this.shopify.deleteProduct(product.shopifyId);
            this.logger.info(`Rolled back product: ${product.title} (${product.shopifyId})`);
          } catch (rollbackError) {
            this.logger.error(`Failed to rollback product ${product.shopifyId}: ${rollbackError}`);
          }
        }
      }
      
      return {
        planId: plan.id,
        status: 'error',
        results: { 
          partiallyCreated: createdProducts.length,
          products: createdProducts 
        },
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: createdProducts.length,
          apiCalls: createdProducts.length,
          dataProcessed: 0
        },
        errors: [error instanceof Error ? error.message : String(error)],
        timestamp: new Date().toISOString()
      };
    }
  }

  async rollback(plan: AgentExecutionPlan): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info({
        event: 'rollback_started',
        planId: plan.id
      }, 'Starting rollback for product research plan');
      
      // Get list of products created by this plan from metadata/storage
      // In a production system, this would query a database or state store
      const createdProductIds = plan.parameters.createdProductIds as string[] || [];
      
      let removedCount = 0;
      let failedCount = 0;
      
      // Delete each product from Shopify
      for (const productId of createdProductIds) {
        try {
          await this.shopify.deleteProduct(productId);
          removedCount++;
          this.logger.info(`Removed product ${productId} during rollback`);
        } catch (error) {
          failedCount++;
          this.logger.error(`Failed to remove product ${productId}: ${error}`);
        }
      }
      
      this.logger.info({
        event: 'rollback_completed',
        planId: plan.id,
        removedCount,
        failedCount
      }, `Rollback completed: ${removedCount} products removed, ${failedCount} failed`);
      
      return {
        planId: plan.id,
        status: failedCount === 0 ? 'success' : 'partial',
        results: {
          rollbackCompleted: true,
          productsRemoved: removedCount,
          productsFailed: failedCount
        },
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: removedCount,
          apiCalls: createdProductIds.length,
          dataProcessed: createdProductIds.length
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error({
        event: 'rollback_failed',
        planId: plan.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'Rollback failed');
      
      return {
        planId: plan.id,
        status: 'error',
        results: {},
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: 0,
          apiCalls: 0,
          dataProcessed: 0
        },
        errors: [error instanceof Error ? error.message : String(error)],
        timestamp: new Date().toISOString()
      };
    }
  }

  private async findTrendingProducts(params: any): Promise<TrendingProduct[]> {
    this.logger.info({
      event: 'finding_trending_products',
      category: params.category,
      maxProducts: params.maxProducts
    }, 'Searching for trending products');
    
    const products: TrendingProduct[] = [];
    
    try {
      // Use OpenAI to analyze trends and suggest products
      if (this.openaiApiKey) {
        const aiProducts = await this.analyzeProductTrendsWithAI(params);
        products.push(...aiProducts);
      }
      
      // Query AutoDS/AliExpress for trending products (if credentials available)
      // const autoDSProducts = await this.queryAutoDSProducts(params);
      // products.push(...autoDSProducts);
      
      if (products.length === 0) {
        this.logger.warn('No trending products found. Ensure API credentials are configured.');
      }
      
      return products.slice(0, params.maxProducts || 10);
    } catch (error) {
      this.logger.error(`Error finding trending products: ${error}`);
      return [];
    }
  }

  private async analyzeProductTrendsWithAI(params: any): Promise<TrendingProduct[]> {
    if (!this.openaiApiKey) {
      this.logger.warn('OpenAI API key not configured, cannot analyze trends');
      return [];
    }
    
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a product research assistant. Suggest trending e-commerce products with realistic pricing and supplier information.'
            },
            {
              role: 'user',
              content: `Suggest ${params.maxProducts || 5} trending products for category: ${params.category || 'general'} with price range $${params.priceRange?.min || 10}-$${params.priceRange?.max || 100}. Return as JSON array with fields: title, description, estimatedPrice, supplierPrice, category, tags (array).`
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const content = response.data.choices[0].message.content;
      const productsData = JSON.parse(content);
      
      // Transform AI response to TrendingProduct format
      return productsData.map((p: any) => ({
        title: p.title,
        description: p.description,
        estimatedPrice: p.estimatedPrice,
        supplierPrice: p.supplierPrice || p.estimatedPrice * 0.4,
        margin: ((p.estimatedPrice - (p.supplierPrice || p.estimatedPrice * 0.4)) / p.estimatedPrice) * 100,
        category: p.category || params.category || 'General',
        tags: p.tags || [],
        images: p.images || [],
        supplierInfo: {
          name: 'AI Suggested',
          rating: 4.5,
          reliability: 85
        }
      }));
    } catch (error) {
      this.logger.error(`Error analyzing trends with AI: ${error}`);
      return [];
    }
  }



  private validateProductCriteria(products: TrendingProduct[], params: any): TrendingProduct[] {
    return products.filter(product => {
      // Check price range
      if (params.priceRange) {
        if (product.estimatedPrice < params.priceRange.min || 
            product.estimatedPrice > params.priceRange.max) {
          return false;
        }
      }

      // Check margin
      if (product.margin < params.targetMargin) {
        return false;
      }

      // Check supplier reliability
      if (product.supplierInfo.reliability < 80) {
        return false;
      }

      return true;
    }).slice(0, params.maxProducts);
  }

  private generateSKU(title: string): string {
    const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    return `RE-${cleanTitle}-${timestamp}`;
  }
}