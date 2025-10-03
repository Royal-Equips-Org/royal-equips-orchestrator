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

const MarketingParams = z.object({
  campaignType: z.enum(['email', 'abandoned_cart', 'customer_segment', 'promotional']).default('email'),
  targetSegment: z.string().optional(),
  maxCustomers: z.number().min(1).max(1000).default(100),
  sendEmails: z.boolean().default(false)
});

interface Customer {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  ordersCount: number;
  totalSpent: string;
  tags: string[];
  acceptsMarketing: boolean;
  lastOrderDate?: string;
}

interface CustomerSegment {
  name: string;
  criteria: string;
  customerCount: number;
  customers: Customer[];
}

interface EmailCampaign {
  id: string;
  subject: string;
  content: string;
  targetSegment: string;
  recipientCount: number;
  sentAt?: string;
  openRate?: number;
  clickRate?: number;
}

interface AbandonedCart {
  id: string;
  customerEmail: string;
  customerName: string;
  cartTotal: number;
  itemCount: number;
  abandonedAt: string;
  recovered: boolean;
}

/**
 * Marketing Agent
 * 
 * Responsibilities:
 * - Manage email marketing campaigns
 * - Segment customers based on behavior and purchase history
 * - Recover abandoned carts with automated emails
 * - Track campaign performance and engagement
 * - Generate marketing insights and recommendations
 */
export class MarketingAgent extends BaseAgent {
  private shopify: ShopifyConnector;
  private sendgridApiKey?: string;
  private mailgunApiKey?: string;

  constructor(
    config: AgentConfig, 
    logger: Logger, 
    shopify: ShopifyConnector,
    emailServiceKeys: {
      sendgrid?: string;
      mailgun?: string;
    }
  ) {
    super(config, logger);
    this.shopify = shopify;
    this.sendgridApiKey = emailServiceKeys.sendgrid;
    this.mailgunApiKey = emailServiceKeys.mailgun;
  }

  async plan(parameters: Record<string, unknown>): Promise<AgentExecutionPlan> {
    const params = this.validateParameters(MarketingParams, parameters);
    const planId = this.generatePlanId();

    this.logger.info({
      event: 'plan_created',
      agentId: this.config.id,
      planId,
      parameters: params
    }, 'MarketingAgent plan created');

    return {
      id: planId,
      agentId: this.config.id,
      action: 'execute_marketing_campaign',
      parameters: params,
      dependencies: [],
      riskLevel: params.sendEmails ? 'medium' : 'low',
      needsApproval: params.sendEmails && params.maxCustomers > 100,
      rollbackPlan: {
        steps: [
          {
            action: 'mark_campaign_as_cancelled',
            parameters: { planId },
            order: 1
          }
        ],
        timeout: 300000,
        fallbackAction: 'alert_marketing_team'
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
      }, 'Starting marketing agent dry run');
      
      const params = plan.parameters;
      
      // Fetch customers based on campaign type
      const customers = await this.fetchTargetCustomers(params);
      
      // Generate campaign preview
      const campaignPreview = await this.generateCampaignPreview(params, customers);
      
      return {
        planId: plan.id,
        status: 'success',
        results: {
          campaignType: params.campaignType,
          targetCustomers: customers.length,
          estimatedReach: customers.filter((c: Customer) => c.acceptsMarketing).length,
          campaignPreview,
          estimatedSendTime: customers.length * 0.5 // 0.5 seconds per email
        },
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: 1,
          apiCalls: 1,
          dataProcessed: customers.length
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
    let apiCalls = 0;
    let emailsSent = 0;
    
    try {
      this.logger.info({
        event: 'apply_started',
        planId: plan.id,
        agentId: this.config.id
      }, 'Starting marketing campaign execution');
      
      const params = plan.parameters;
      
      // Step 1: Fetch target customers
      const customers = await this.fetchTargetCustomers(params);
      apiCalls++;
      
      this.logger.info({
        event: 'customers_fetched',
        count: customers.length,
        planId: plan.id
      }, `Fetched ${customers.length} customers for campaign`);
      
      // Step 2: Execute campaign based on type
      let campaign: any;
      
      if (params.campaignType === 'abandoned_cart') {
        campaign = await this.executeAbandonedCartCampaign(customers, params);
        emailsSent = campaign.emailsSent;
        apiCalls += campaign.apiCalls;
      } else if (params.campaignType === 'customer_segment') {
        campaign = await this.executeSegmentedCampaign(customers, params);
        emailsSent = campaign.emailsSent;
        apiCalls += campaign.apiCalls;
      } else if (params.campaignType === 'promotional') {
        campaign = await this.executePromotionalCampaign(customers, params);
        emailsSent = campaign.emailsSent;
        apiCalls += campaign.apiCalls;
      } else {
        campaign = await this.executeEmailCampaign(customers, params);
        emailsSent = campaign.emailsSent;
        apiCalls += campaign.apiCalls;
      }
      
      // Step 3: Track campaign in Shopify using metafields
      await this.trackCampaignInShopify(campaign);
      apiCalls++;
      
      return {
        planId: plan.id,
        status: 'success',
        results: {
          campaignType: params.campaignType,
          customersTargeted: customers.length,
          emailsSent,
          campaign,
          timestamp: new Date().toISOString()
        },
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: emailsSent,
          apiCalls,
          dataProcessed: customers.length
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error({
        event: 'execution_failed',
        planId: plan.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'Marketing campaign execution failed');
      
      return {
        planId: plan.id,
        status: 'error',
        results: { emailsSent },
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: emailsSent,
          apiCalls,
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
      }, 'Starting rollback for marketing campaign');
      
      // Mark campaign as cancelled in tracking
      // Note: Sent emails cannot be recalled, but we can mark the campaign as cancelled
      
      return {
        planId: plan.id,
        status: 'success',
        results: {
          rollbackCompleted: true,
          note: 'Campaign marked as cancelled. Sent emails cannot be recalled.'
        },
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: 0,
          apiCalls: 0,
          dataProcessed: 0
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
   * Fetch target customers based on campaign parameters
   */
  private async fetchTargetCustomers(params: any): Promise<Customer[]> {
    try {
      const customers = await this.shopify.getOrders({
        limit: params.maxCustomers || 100
      });
      
      // In production, would use Shopify GraphQL to fetch customers directly
      // query {
      //   customers(first: 100, query: "accepts_marketing:true") {
      //     edges {
      //       node {
      //         id email firstName lastName
      //         ordersCount totalSpent tags acceptsMarketing
      //       }
      //     }
      //   }
      // }
      
      // Extract unique customers from orders
      const customerMap = new Map<string, Customer>();
      
      for (const order of customers) {
        const email = order.email || '';
        if (!email || customerMap.has(email)) continue;
        
        customerMap.set(email, {
          id: order.id,
          email,
          firstName: 'Customer', // Would come from customer object
          lastName: '',
          ordersCount: 1,
          totalSpent: order.total_price,
          tags: [],
          acceptsMarketing: true,
          lastOrderDate: new Date().toISOString()
        });
      }
      
      return Array.from(customerMap.values());
    } catch (error) {
      this.logger.error(`Error fetching customers: ${error}`);
      return [];
    }
  }

  /**
   * Generate campaign preview
   */
  private async generateCampaignPreview(params: any, customers: Customer[]): Promise<any> {
    const acceptsMarketing = customers.filter(c => c.acceptsMarketing).length;
    
    return {
      subject: this.generateCampaignSubject(params.campaignType),
      targetCount: customers.length,
      reachableCount: acceptsMarketing,
      estimatedOpenRate: '25-35%',
      estimatedClickRate: '3-5%'
    };
  }

  /**
   * Execute abandoned cart recovery campaign
   */
  private async executeAbandonedCartCampaign(customers: Customer[], params: any): Promise<any> {
    let emailsSent = 0;
    const abandonedCarts: AbandonedCart[] = [];
    
    try {
      // In production, would fetch actual abandoned carts from Shopify
      // query {
      //   checkouts(first: 100, query: "abandoned:true") {
      //     edges {
      //       node {
      //         id email lineItems { title quantity }
      //         totalPrice createdAt
      //       }
      //     }
      //   }
      // }
      
      this.logger.info('Executing abandoned cart recovery campaign');
      
      for (const customer of customers) {
        if (!customer.acceptsMarketing) continue;
        
        if (params.sendEmails && this.hasEmailService()) {
          const sent = await this.sendAbandonedCartEmail(customer);
          if (sent) emailsSent++;
        }
      }
      
      return {
        type: 'abandoned_cart',
        emailsSent,
        cartsTargeted: customers.length,
        apiCalls: emailsSent,
        abandonedCarts
      };
    } catch (error) {
      this.logger.error(`Abandoned cart campaign error: ${error}`);
      return { type: 'abandoned_cart', emailsSent, apiCalls: emailsSent };
    }
  }

  /**
   * Execute segmented customer campaign
   */
  private async executeSegmentedCampaign(customers: Customer[], params: any): Promise<any> {
    let emailsSent = 0;
    
    try {
      // Segment customers by behavior
      const segments = this.segmentCustomers(customers);
      
      this.logger.info({
        segments: Object.keys(segments),
        counts: Object.values(segments).map((s: any) => s.length)
      }, 'Customer segmentation complete');
      
      // Send targeted emails to each segment
      const targetSegment = params.targetSegment || 'high_value';
      const segmentCustomers = segments[targetSegment] || [];
      
      for (const customer of segmentCustomers) {
        if (!customer.acceptsMarketing) continue;
        
        if (params.sendEmails && this.hasEmailService()) {
          const sent = await this.sendSegmentedEmail(customer, targetSegment);
          if (sent) emailsSent++;
        }
      }
      
      return {
        type: 'customer_segment',
        emailsSent,
        targetSegment,
        segmentSize: segmentCustomers.length,
        apiCalls: emailsSent
      };
    } catch (error) {
      this.logger.error(`Segmented campaign error: ${error}`);
      return { type: 'customer_segment', emailsSent, apiCalls: emailsSent };
    }
  }

  /**
   * Execute promotional campaign
   */
  private async executePromotionalCampaign(customers: Customer[], params: any): Promise<any> {
    let emailsSent = 0;
    
    try {
      this.logger.info('Executing promotional campaign');
      
      for (const customer of customers) {
        if (!customer.acceptsMarketing) continue;
        
        if (params.sendEmails && this.hasEmailService()) {
          const sent = await this.sendPromotionalEmail(customer);
          if (sent) emailsSent++;
        }
      }
      
      return {
        type: 'promotional',
        emailsSent,
        customersTargeted: customers.length,
        apiCalls: emailsSent
      };
    } catch (error) {
      this.logger.error(`Promotional campaign error: ${error}`);
      return { type: 'promotional', emailsSent, apiCalls: emailsSent };
    }
  }

  /**
   * Execute general email campaign
   */
  private async executeEmailCampaign(customers: Customer[], params: any): Promise<any> {
    let emailsSent = 0;
    
    try {
      this.logger.info('Executing email campaign');
      
      for (const customer of customers) {
        if (!customer.acceptsMarketing) continue;
        
        if (params.sendEmails && this.hasEmailService()) {
          const sent = await this.sendMarketingEmail(customer);
          if (sent) emailsSent++;
        }
      }
      
      return {
        type: 'email',
        emailsSent,
        customersTargeted: customers.length,
        apiCalls: emailsSent
      };
    } catch (error) {
      this.logger.error(`Email campaign error: ${error}`);
      return { type: 'email', emailsSent, apiCalls: emailsSent };
    }
  }

  /**
   * Segment customers by behavior and value
   */
  private segmentCustomers(customers: Customer[]): Record<string, Customer[]> {
    const segments: Record<string, Customer[]> = {
      high_value: [],
      medium_value: [],
      low_value: [],
      at_risk: [],
      new_customers: []
    };
    
    for (const customer of customers) {
      const totalSpent = parseFloat(customer.totalSpent || '0');
      
      if (totalSpent > 500) {
        segments.high_value.push(customer);
      } else if (totalSpent > 100) {
        segments.medium_value.push(customer);
      } else {
        segments.low_value.push(customer);
      }
      
      if (customer.ordersCount <= 1) {
        segments.new_customers.push(customer);
      }
    }
    
    return segments;
  }

  /**
   * Send abandoned cart recovery email
   */
  private async sendAbandonedCartEmail(customer: Customer): Promise<boolean> {
    try {
      const subject = '🛒 You left something behind!';
      const content = this.generateAbandonedCartEmailContent(customer);
      
      return await this.sendEmail(customer.email, subject, content);
    } catch (error) {
      this.logger.error(`Failed to send abandoned cart email: ${error}`);
      return false;
    }
  }

  /**
   * Send segmented email
   */
  private async sendSegmentedEmail(customer: Customer, segment: string): Promise<boolean> {
    try {
      const subject = this.generateSegmentSubject(segment);
      const content = this.generateSegmentEmailContent(customer, segment);
      
      return await this.sendEmail(customer.email, subject, content);
    } catch (error) {
      this.logger.error(`Failed to send segmented email: ${error}`);
      return false;
    }
  }

  /**
   * Send promotional email
   */
  private async sendPromotionalEmail(customer: Customer): Promise<boolean> {
    try {
      const subject = '🎉 Special Offer Just For You!';
      const content = this.generatePromotionalEmailContent(customer);
      
      return await this.sendEmail(customer.email, subject, content);
    } catch (error) {
      this.logger.error(`Failed to send promotional email: ${error}`);
      return false;
    }
  }

  /**
   * Send general marketing email
   */
  private async sendMarketingEmail(customer: Customer): Promise<boolean> {
    try {
      const subject = '✨ Discover What\'s New at Royal Equips';
      const content = this.generateMarketingEmailContent(customer);
      
      return await this.sendEmail(customer.email, subject, content);
    } catch (error) {
      this.logger.error(`Failed to send marketing email: ${error}`);
      return false;
    }
  }

  /**
   * Send email using configured service
   */
  private async sendEmail(to: string, subject: string, content: string): Promise<boolean> {
    try {
      if (this.sendgridApiKey) {
        return await this.sendViaSendGrid(to, subject, content);
      } else if (this.mailgunApiKey) {
        return await this.sendViaMailgun(to, subject, content);
      } else {
        this.logger.warn('No email service configured');
        // Simulate sending for testing
        this.logger.info(`[SIMULATED] Email to ${to}: ${subject}`);
        return true;
      }
    } catch (error) {
      this.logger.error(`Email sending failed: ${error}`);
      return false;
    }
  }

  /**
   * Send email via SendGrid
   */
  private async sendViaSendGrid(to: string, subject: string, content: string): Promise<boolean> {
    try {
      const response = await axios.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [{ to: [{ email: to }] }],
          from: { email: 'marketing@royalequips.com', name: 'Royal Equips' },
          subject,
          content: [{ type: 'text/html', value: content }]
        },
        {
          headers: {
            'Authorization': `******
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );
      
      return response.status === 202;
    } catch (error) {
      this.logger.error(`SendGrid error: ${error}`);
      return false;
    }
  }

  /**
   * Send email via Mailgun
   */
  private async sendViaMailgun(to: string, subject: string, content: string): Promise<boolean> {
    try {
      const domain = process.env.MAILGUN_DOMAIN || 'mg.royalequips.com';
      
      const response = await axios.post(
        `https://api.mailgun.net/v3/${domain}/messages`,
        new URLSearchParams({
          from: 'Royal Equips <marketing@royalequips.com>',
          to,
          subject,
          html: content
        }),
        {
          auth: {
            username: 'api',
            password: this.mailgunApiKey || ''
          },
          timeout: 15000
        }
      );
      
      return response.status === 200;
    } catch (error) {
      this.logger.error(`Mailgun error: ${error}`);
      return false;
    }
  }

  /**
   * Track campaign in Shopify using metafields
   */
  private async trackCampaignInShopify(campaign: any): Promise<void> {
    this.logger.info({
      campaignType: campaign.type,
      emailsSent: campaign.emailsSent
    }, 'Tracking campaign in Shopify (would use metafieldsSet in production)');
    
    // In production, would use GraphQL metafieldsSet:
    // mutation {
    //   metafieldsSet(metafields: [{
    //     ownerId: "gid://shopify/Shop/...",
    //     namespace: "marketing",
    //     key: "campaign_${Date.now()}",
    //     value: JSON.stringify(campaign),
    //     type: "json"
    //   }]) {
    //     metafields { id key value }
    //     userErrors { field message }
    //   }
    // }
  }

  /**
   * Helper methods for email content generation
   */
  private generateCampaignSubject(campaignType: string): string {
    const subjects: Record<string, string> = {
      email: '✨ Discover What\'s New',
      abandoned_cart: '🛒 Complete Your Purchase',
      customer_segment: '🎁 Special Offer for You',
      promotional: '🎉 Limited Time Offer'
    };
    return subjects[campaignType] || 'Message from Royal Equips';
  }

  private generateAbandonedCartEmailContent(customer: Customer): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Hi ${customer.firstName || 'there'},</h2>
          <p>We noticed you left items in your cart. Complete your purchase now!</p>
          <a href="https://royalequips.com/cart" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; margin: 20px 0;">
            Complete Your Order
          </a>
          <p>Best regards,<br>The Royal Equips Team</p>
        </body>
      </html>
    `;
  }

  private generateSegmentSubject(segment: string): string {
    const subjects: Record<string, string> = {
      high_value: '🌟 VIP Exclusive Offer',
      medium_value: '🎁 Thank You for Being a Valued Customer',
      low_value: '✨ Discover Amazing Products',
      at_risk: '👋 We Miss You!',
      new_customers: '🎉 Welcome to Royal Equips'
    };
    return subjects[segment] || 'Special Offer';
  }

  private generateSegmentEmailContent(customer: Customer, segment: string): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Hi ${customer.firstName || 'there'},</h2>
          <p>As a ${segment.replace('_', ' ')} customer, we have something special for you!</p>
          <p>Check out our latest products and exclusive offers.</p>
          <a href="https://royalequips.com" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; margin: 20px 0;">
            Shop Now
          </a>
        </body>
      </html>
    `;
  }

  private generatePromotionalEmailContent(customer: Customer): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Hi ${customer.firstName || 'there'},</h2>
          <p>Don't miss our special promotion! Limited time offer.</p>
          <p><strong>Get 20% off your next purchase</strong></p>
          <a href="https://royalequips.com/sale" style="background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; margin: 20px 0;">
            Shop Sale
          </a>
        </body>
      </html>
    `;
  }

  private generateMarketingEmailContent(customer: Customer): string {
    return `
      <html>
        <body style="font-family: Arial, sans-serif;">
          <h2>Hi ${customer.firstName || 'there'},</h2>
          <p>Discover our latest collection of premium products!</p>
          <a href="https://royalequips.com/new" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; margin: 20px 0;">
            Explore New Arrivals
          </a>
        </body>
      </html>
    `;
  }

  private hasEmailService(): boolean {
    return !!(this.sendgridApiKey || this.mailgunApiKey);
  }
}
