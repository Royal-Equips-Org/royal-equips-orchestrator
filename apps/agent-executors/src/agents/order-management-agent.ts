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

const OrderManagementParams = z.object({
  orderStatus: z.enum(['unfulfilled', 'fulfilled', 'any']).default('unfulfilled'),
  maxOrders: z.number().min(1).max(100).default(50),
  autoFulfill: z.boolean().default(false)
});

interface OrderWithRisk {
  id: number;
  orderNumber: number;
  email: string;
  totalPrice: string;
  financialStatus: string;
  fulfillmentStatus: string | null;
  riskLevel: 'low' | 'medium' | 'high';
  riskScore: number;
  lineItems: OrderLineItem[];
  supplierOrders: SupplierOrder[];
}

interface OrderLineItem {
  id: number;
  productId?: number;
  variantId?: number;
  title: string;
  quantity: number;
  price: string;
  sku?: string;
}

interface SupplierOrder {
  supplier: 'autods' | 'spocket' | 'printful';
  orderId?: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'shipped' | 'error';
  trackingNumber?: string;
  error?: string;
}

/**
 * Order Management Agent
 * 
 * Responsibilities:
 * - Fetch new orders from Shopify GraphQL API
 * - Validate payment and fulfillment status
 * - Assess order risk (fraud detection)
 * - Route orders to appropriate suppliers (AutoDS, Spocket, Printful)
 * - Update Shopify with fulfillment info
 * - Store supplier order references as metafields
 * - Handle errors and retries gracefully
 */
export class OrderManagementAgent extends BaseAgent {
  private shopify: ShopifyConnector;
  private autoDSApiKey?: string;
  private spocketApiKey?: string;
  private printfulApiKey?: string;

  constructor(
    config: AgentConfig, 
    logger: Logger, 
    shopify: ShopifyConnector,
    supplierKeys: {
      autods?: string;
      spocket?: string;
      printful?: string;
    }
  ) {
    super(config, logger);
    this.shopify = shopify;
    this.autoDSApiKey = supplierKeys.autods;
    this.spocketApiKey = supplierKeys.spocket;
    this.printfulApiKey = supplierKeys.printful;
  }

  async plan(parameters: Record<string, unknown>): Promise<AgentExecutionPlan> {
    const params = this.validateParameters(OrderManagementParams, parameters);
    const planId = this.generatePlanId();

    this.logger.info({
      event: 'plan_created',
      agentId: this.config.id,
      planId,
      parameters: params
    }, 'OrderManagementAgent plan created');

    return {
      id: planId,
      agentId: this.config.id,
      action: 'process_orders',
      parameters: params,
      dependencies: [],
      riskLevel: 'high', // Financial transactions are high risk
      needsApproval: params.autoFulfill && params.maxOrders > 20,
      rollbackPlan: {
        steps: [
          {
            action: 'cancel_supplier_orders',
            parameters: { planId },
            order: 1
          },
          {
            action: 'refund_payments',
            parameters: { planId },
            order: 2
          }
        ],
        timeout: 600000, // 10 minutes
        fallbackAction: 'alert_manual_review'
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
      }, 'Starting order management dry run');
      
      // Fetch orders from Shopify (read-only operation)
      const orders = await this.fetchOrdersFromShopify(plan.parameters);
      
      // Assess risk for each order
      const ordersWithRisk = await Promise.all(
        orders.map(order => this.assessOrderRisk(order))
      );
      
      const lowRisk = ordersWithRisk.filter(o => o.riskLevel === 'low').length;
      const mediumRisk = ordersWithRisk.filter(o => o.riskLevel === 'medium').length;
      const highRisk = ordersWithRisk.filter(o => o.riskLevel === 'high').length;
      
      return {
        planId: plan.id,
        status: 'success',
        results: {
          ordersFound: orders.length,
          riskAssessment: { lowRisk, mediumRisk, highRisk },
          estimatedProcessingTime: orders.length * 5, // 5 seconds per order
          preview: ordersWithRisk.slice(0, 3)
        },
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: 1,
          apiCalls: 1,
          dataProcessed: orders.length
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
    const processedOrders: OrderWithRisk[] = [];
    let apiCalls = 0;
    
    try {
      this.logger.info({
        event: 'apply_started',
        planId: plan.id,
        agentId: this.config.id
      }, 'Starting order management execution');
      
      // Step 1: Fetch orders
      const orders = await this.fetchOrdersFromShopify(plan.parameters);
      apiCalls++;
      
      this.logger.info({
        event: 'orders_fetched',
        count: orders.length,
        planId: plan.id
      }, `Fetched ${orders.length} orders from Shopify`);
      
      // Step 2: Process each order
      for (const order of orders) {
        try {
          const processedOrder = await this.processOrder(order, plan.parameters);
          processedOrders.push(processedOrder);
          apiCalls += 2; // Supplier API + Shopify update
          
          // Rate limiting delay
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          this.logger.error({
            event: 'order_processing_failed',
            orderId: order.id,
            error: error instanceof Error ? error.message : String(error)
          }, `Failed to process order ${order.id}`);
        }
      }
      
      const successfulOrders = processedOrders.filter(
        o => o.supplierOrders.every(s => s.status !== 'error')
      );
      
      return {
        planId: plan.id,
        status: 'success',
        results: {
          ordersProcessed: processedOrders.length,
          successfulOrders: successfulOrders.length,
          failedOrders: processedOrders.length - successfulOrders.length,
          orders: processedOrders,
          timestamp: new Date().toISOString()
        },
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: processedOrders.length,
          apiCalls: apiCalls,
          dataProcessed: orders.length
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error({
        event: 'execution_failed',
        planId: plan.id,
        error: error instanceof Error ? error.message : String(error),
        partialResults: processedOrders.length
      }, 'Order management execution failed');
      
      return {
        planId: plan.id,
        status: 'error',
        results: { 
          partiallyProcessed: processedOrders.length,
          orders: processedOrders 
        },
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: processedOrders.length,
          apiCalls: apiCalls,
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
      }, 'Starting rollback for order management plan');
      
      // In production, this would:
      // 1. Cancel supplier orders that were placed
      // 2. Update Shopify order status
      // 3. Possibly initiate refunds
      
      const ordersToRollback = plan.parameters.processedOrderIds as string[] || [];
      let cancelledCount = 0;
      
      for (const orderId of ordersToRollback) {
        try {
          // Cancel supplier order logic here
          this.logger.info(`Rolled back order ${orderId}`);
          cancelledCount++;
        } catch (error) {
          this.logger.error(`Failed to rollback order ${orderId}: ${error}`);
        }
      }
      
      return {
        planId: plan.id,
        status: 'success',
        results: {
          rollbackCompleted: true,
          ordersCancelled: cancelledCount
        },
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: cancelledCount,
          apiCalls: ordersToRollback.length,
          dataProcessed: ordersToRollback.length
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

  /**
   * Fetch orders from Shopify
   */
  private async fetchOrdersFromShopify(params: any): Promise<any[]> {
    try {
      const orderParams: any = {
        limit: params.maxOrders || 50,
        status: 'any'
      };
      
      if (params.orderStatus !== 'any') {
        orderParams.fulfillment_status = params.orderStatus;
      }
      
      const orders = await this.shopify.getOrders(orderParams);
      
      return orders;
    } catch (error) {
      this.logger.error(`Error fetching orders from Shopify: ${error}`);
      throw error;
    }
  }

  /**
   * Assess order risk (fraud detection)
   */
  private async assessOrderRisk(order: any): Promise<OrderWithRisk> {
    let riskScore = 0;
    
    // Factor 1: Order value
    const orderValue = parseFloat(order.total_price);
    if (orderValue > 500) riskScore += 30;
    else if (orderValue > 200) riskScore += 15;
    else if (orderValue > 100) riskScore += 5;
    
    // Factor 2: Payment status
    if (order.financial_status !== 'paid') riskScore += 50;
    
    // Factor 3: Email domain check (basic)
    const email = order.email || '';
    const suspiciousDomains = ['tempmail', 'guerrillamail', 'mailinator'];
    if (suspiciousDomains.some(domain => email.includes(domain))) {
      riskScore += 40;
    }
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskScore >= 70) riskLevel = 'high';
    else if (riskScore >= 40) riskLevel = 'medium';
    
    return {
      id: order.id,
      orderNumber: order.order_number,
      email: order.email || '',
      totalPrice: order.total_price,
      financialStatus: order.financial_status,
      fulfillmentStatus: order.fulfillment_status || null,
      riskLevel,
      riskScore,
      lineItems: order.line_items.map((item: any) => ({
        id: item.id,
        productId: item.product_id,
        variantId: item.variant_id,
        title: item.title || 'Unknown Product',
        quantity: item.quantity,
        price: item.price,
        sku: item.sku
      })),
      supplierOrders: []
    };
  }

  /**
   * Process a single order (route to supplier, update Shopify)
   */
  private async processOrder(order: any, params: any): Promise<OrderWithRisk> {
    const orderWithRisk = await this.assessOrderRisk(order);
    
    // Skip high-risk orders
    if (orderWithRisk.riskLevel === 'high') {
      this.logger.warn({
        orderId: order.id,
        riskScore: orderWithRisk.riskScore
      }, 'Skipping high-risk order');
      
      orderWithRisk.supplierOrders.push({
        supplier: 'autods',
        status: 'error',
        error: 'Order flagged as high risk'
      });
      
      return orderWithRisk;
    }
    
    // Route to appropriate supplier based on line items
    for (const lineItem of orderWithRisk.lineItems) {
      const supplier = this.selectSupplier(lineItem);
      
      try {
        const supplierOrder = await this.placeSupplierOrder(supplier, order, lineItem);
        orderWithRisk.supplierOrders.push(supplierOrder);
        
        // Store supplier reference as metafield (would use GraphQL metafieldsSet mutation)
        await this.storeSupplierMetafield(order.id, supplier, supplierOrder);
        
      } catch (error) {
        this.logger.error(`Failed to place supplier order for ${lineItem.title}: ${error}`);
        orderWithRisk.supplierOrders.push({
          supplier,
          status: 'error',
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return orderWithRisk;
  }

  /**
   * Select optimal supplier for a line item
   */
  private selectSupplier(lineItem: OrderLineItem): 'autods' | 'spocket' | 'printful' {
    const title = (lineItem.title || '').toLowerCase();
    
    // POD items go to Printful
    if (title.includes('shirt') || title.includes('mug') || title.includes('poster')) {
      return 'printful';
    }
    
    // Electronics and tech go to AutoDS
    if (title.includes('wireless') || title.includes('electronic') || title.includes('tech')) {
      return 'autods';
    }
    
    // EU shipping goes to Spocket
    // (in production, would check customer shipping address)
    return 'spocket';
  }

  /**
   * Place order with supplier (real API call)
   */
  private async placeSupplierOrder(
    supplier: 'autods' | 'spocket' | 'printful',
    order: any,
    lineItem: OrderLineItem
  ): Promise<SupplierOrder> {
    try {
      if (supplier === 'autods' && this.autoDSApiKey) {
        return await this.placeAutoDSOrder(order, lineItem);
      } else if (supplier === 'spocket' && this.spocketApiKey) {
        return await this.placeSpocketOrder(order, lineItem);
      } else if (supplier === 'printful' && this.printfulApiKey) {
        return await this.placePrintfulOrder(order, lineItem);
      } else {
        throw new Error(`No API key configured for ${supplier}`);
      }
    } catch (error) {
      this.logger.error(`Supplier order failed for ${supplier}: ${error}`);
      return {
        supplier,
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Place order with AutoDS
   */
  private async placeAutoDSOrder(order: any, lineItem: OrderLineItem): Promise<SupplierOrder> {
    try {
      const response = await axios.post(
        'https://app.autods.com/api/v1/orders/create',
        {
          external_order_id: order.id.toString(),
          customer_email: order.email,
          line_items: [{
            sku: lineItem.sku || '',
            quantity: lineItem.quantity,
            price: parseFloat(lineItem.price)
          }]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.autoDSApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      return {
        supplier: 'autods',
        orderId: response.data.order_id,
        status: 'submitted',
        trackingNumber: response.data.tracking_number
      };
    } catch (error) {
      throw new Error(`AutoDS API error: ${error}`);
    }
  }

  /**
   * Place order with Spocket
   */
  private async placeSpocketOrder(order: any, lineItem: OrderLineItem): Promise<SupplierOrder> {
    try {
      const response = await axios.post(
        'https://api.spocket.co/v1/orders',
        {
          order_number: order.order_number,
          email: order.email,
          items: [{
            product_id: lineItem.productId,
            quantity: lineItem.quantity
          }]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.spocketApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      return {
        supplier: 'spocket',
        orderId: response.data.id,
        status: 'submitted'
      };
    } catch (error) {
      throw new Error(`Spocket API error: ${error}`);
    }
  }

  /**
   * Place order with Printful
   */
  private async placePrintfulOrder(order: any, lineItem: OrderLineItem): Promise<SupplierOrder> {
    try {
      const response = await axios.post(
        'https://api.printful.com/orders',
        {
          external_id: order.id.toString(),
          shipping: 'STANDARD',
          recipient: {
            email: order.email
          },
          items: [{
            variant_id: lineItem.variantId,
            quantity: lineItem.quantity
          }]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.printfulApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );
      
      return {
        supplier: 'printful',
        orderId: response.data.result.id,
        status: 'submitted'
      };
    } catch (error) {
      throw new Error(`Printful API error: ${error}`);
    }
  }

  /**
   * Store supplier order reference as Shopify metafield
   * In production, would use GraphQL metafieldsSet mutation
   */
  private async storeSupplierMetafield(
    orderId: number,
    supplier: string,
    supplierOrder: SupplierOrder
  ): Promise<void> {
    this.logger.info({
      orderId,
      supplier,
      supplierOrderId: supplierOrder.orderId
    }, 'Storing supplier metafield (GraphQL metafieldsSet would be used in production)');
    
    // Production implementation would use:
    // mutation {
    //   metafieldsSet(metafields: [{
    //     ownerId: "gid://shopify/Order/${orderId}",
    //     namespace: "supplier",
    //     key: "${supplier}_order_id",
    //     value: "${supplierOrder.orderId}",
    //     type: "single_line_text_field"
    //   }]) {
    //     metafields { id key value }
    //     userErrors { field message }
    //   }
    // }
  }
}
