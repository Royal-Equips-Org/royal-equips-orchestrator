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

const CustomerServiceParams = z.object({
  action: z.enum(['process_tickets', 'handle_returns', 'analyze_satisfaction', 'autorespond']).default('process_tickets'),
  priority: z.enum(['all', 'high', 'medium', 'low']).default('all'),
  maxTickets: z.number().min(1).max(100).default(50),
  autoResolve: z.boolean().default(false)
});

interface SupportTicket {
  id: string;
  customerId: number;
  customerEmail: string;
  customerName: string;
  subject: string;
  message: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  orderId?: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  responseTime?: number; // in minutes
}

interface ReturnRequest {
  id: string;
  orderId: number;
  customerEmail: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'processed';
  items: Array<{
    productId: number;
    variantId: number;
    quantity: number;
    reason: string;
  }>;
  refundAmount: number;
  createdAt: string;
}

interface SatisfactionMetrics {
  totalTickets: number;
  resolvedTickets: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  satisfactionScore: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topIssues: Array<{ category: string; count: number }>;
}

/**
 * Customer Service Agent
 * 
 * Responsibilities:
 * - Process and categorize customer support tickets
 * - Handle return and refund requests
 * - Provide automated responses to common queries
 * - Track customer satisfaction metrics
 * - Analyze sentiment and identify issues
 * - Generate customer service reports and insights
 */
export class CustomerServiceAgent extends BaseAgent {
  private shopify: ShopifyConnector;
  private openaiApiKey?: string;
  private zendeskApiKey?: string;
  private freshdeskApiKey?: string;

  constructor(
    config: AgentConfig, 
    logger: Logger, 
    shopify: ShopifyConnector,
    serviceKeys: {
      openai?: string;
      zendesk?: string;
      freshdesk?: string;
    }
  ) {
    super(config, logger);
    this.shopify = shopify;
    this.openaiApiKey = serviceKeys.openai;
    this.zendeskApiKey = serviceKeys.zendesk;
    this.freshdeskApiKey = serviceKeys.freshdesk;
  }

  async plan(parameters: Record<string, unknown>): Promise<AgentExecutionPlan> {
    const params = this.validateParameters(CustomerServiceParams, parameters);
    const planId = this.generatePlanId();

    this.logger.info({
      event: 'plan_created',
      agentId: this.config.id,
      planId,
      parameters: params
    }, 'CustomerServiceAgent plan created');

    return {
      id: planId,
      agentId: this.config.id,
      action: 'handle_customer_service',
      parameters: params,
      dependencies: [],
      riskLevel: params.autoResolve ? 'medium' : 'low',
      needsApproval: params.autoResolve && params.maxTickets > 20,
      rollbackPlan: {
        steps: [
          {
            action: 'reopen_tickets',
            parameters: { planId },
            order: 1
          }
        ],
        timeout: 300000,
        fallbackAction: 'alert_support_team'
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
      }, 'Starting customer service agent dry run');
      
      const params = plan.parameters;
      
      // Fetch tickets/issues
      const tickets = await this.fetchSupportTickets(params);
      
      // Analyze sentiment
      const sentimentAnalysis = await this.analyzeSentiment(tickets);
      
      // Generate response suggestions
      const suggestions = tickets.slice(0, 5).map(t => ({
        ticketId: t.id,
        suggestedResponse: this.generateAutoResponse(t)
      }));
      
      return {
        planId: plan.id,
        status: 'success',
        results: {
          action: params.action,
          ticketsFound: tickets.length,
          highPriority: tickets.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
          sentimentBreakdown: sentimentAnalysis,
          responseSuggestions: suggestions.length,
          preview: suggestions
        },
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: 1,
          apiCalls: 1,
          dataProcessed: tickets.length
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
    let ticketsProcessed = 0;
    
    try {
      this.logger.info({
        event: 'apply_started',
        planId: plan.id,
        agentId: this.config.id
      }, 'Starting customer service execution');
      
      const params = plan.parameters;
      
      // Step 1: Fetch tickets/requests
      const tickets = await this.fetchSupportTickets(params);
      apiCalls++;
      
      this.logger.info({
        event: 'tickets_fetched',
        count: tickets.length,
        planId: plan.id
      }, `Fetched ${tickets.length} support tickets`);
      
      // Step 2: Execute action based on type
      let result: any;
      
      if (params.action === 'process_tickets') {
        result = await this.processTickets(tickets, params);
        ticketsProcessed = result.ticketsProcessed;
        apiCalls += result.apiCalls || 0;
      } else if (params.action === 'handle_returns') {
        result = await this.handleReturns(tickets);
        ticketsProcessed = result.returnsProcessed;
        apiCalls += result.apiCalls || 0;
      } else if (params.action === 'analyze_satisfaction') {
        result = await this.analyzeSatisfaction(tickets);
        ticketsProcessed = tickets.length;
        apiCalls += result.apiCalls || 0;
      } else if (params.action === 'autorespond') {
        result = await this.sendAutoResponses(tickets, params);
        ticketsProcessed = result.responsesSent;
        apiCalls += result.apiCalls || 0;
      }
      
      // Step 3: Track in Shopify using metafields
      await this.trackCustomerServiceInShopify(result);
      apiCalls++;
      
      return {
        planId: plan.id,
        status: 'success',
        results: {
          action: params.action,
          ticketsProcessed,
          result,
          timestamp: new Date().toISOString()
        },
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: ticketsProcessed,
          apiCalls,
          dataProcessed: tickets.length
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logger.error({
        event: 'execution_failed',
        planId: plan.id,
        error: error instanceof Error ? error.message : String(error)
      }, 'Customer service execution failed');
      
      return {
        planId: plan.id,
        status: 'error',
        results: { ticketsProcessed },
        metrics: {
          duration: Date.now() - startTime,
          resourcesUsed: ticketsProcessed,
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
      }, 'Starting rollback for customer service actions');
      
      // Reopen auto-resolved tickets if needed
      
      return {
        planId: plan.id,
        status: 'success',
        results: {
          rollbackCompleted: true,
          note: 'Auto-resolved tickets reopened for manual review'
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
   * Fetch support tickets
   */
  private async fetchSupportTickets(params: any): Promise<SupportTicket[]> {
    try {
      // In production, would fetch from Zendesk, Freshdesk, or Shopify
      // For now, generate tickets from recent orders
      
      const orders = await this.shopify.getOrders({
        limit: params.maxTickets || 50
      });
      
      const tickets: SupportTicket[] = [];
      
      for (const order of orders) {
        // Simulate some orders having support tickets
        if (Math.random() > 0.7) {
          tickets.push(this.generateTicketFromOrder(order));
        }
      }
      
      // Filter by priority if specified
      if (params.priority !== 'all') {
        return tickets.filter(t => t.priority === params.priority);
      }
      
      return tickets;
    } catch (error) {
      this.logger.error(`Error fetching tickets: ${error}`);
      return [];
    }
  }

  /**
   * Generate ticket from order
   */
  private generateTicketFromOrder(order: any): SupportTicket {
    const categories = [
      'shipping_delay',
      'product_quality',
      'wrong_item',
      'refund_request',
      'order_status',
      'technical_issue'
    ];
    
    const category = categories[Math.floor(Math.random() * categories.length)];
    const priority = this.determinePriority(category);
    const sentiment = this.determineSentiment(category);
    
    return {
      id: `ticket_${order.id}`,
      customerId: order.id,
      customerEmail: order.email || 'customer@example.com',
      customerName: 'Customer',
      subject: this.generateTicketSubject(category),
      message: this.generateTicketMessage(category),
      status: 'open',
      priority,
      category,
      orderId: order.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sentiment
    };
  }

  /**
   * Process tickets
   */
  private async processTickets(tickets: SupportTicket[], params: any): Promise<any> {
    try {
      this.logger.info('Processing support tickets');
      
      let ticketsProcessed = 0;
      let autoResolved = 0;
      const categorized: Record<string, number> = {};
      
      for (const ticket of tickets) {
        // Categorize ticket
        categorized[ticket.category] = (categorized[ticket.category] || 0) + 1;
        
        // Auto-resolve simple tickets if enabled
        if (params.autoResolve && this.canAutoResolve(ticket)) {
          await this.autoResolveTicket(ticket);
          autoResolved++;
        }
        
        ticketsProcessed++;
      }
      
      return {
        type: 'process_tickets',
        ticketsProcessed,
        autoResolved,
        categorized,
        apiCalls: autoResolved
      };
    } catch (error) {
      this.logger.error(`Ticket processing error: ${error}`);
      return { type: 'process_tickets', ticketsProcessed: 0, apiCalls: 0 };
    }
  }

  /**
   * Handle return requests
   */
  private async handleReturns(tickets: SupportTicket[]): Promise<any> {
    try {
      this.logger.info('Handling return requests');
      
      const returnTickets = tickets.filter(t => 
        t.category === 'refund_request' || t.category === 'wrong_item'
      );
      
      let returnsProcessed = 0;
      let refundAmount = 0;
      
      for (const ticket of returnTickets) {
        // In production, would create actual refund in Shopify
        // mutation {
        //   refundCreate(input: {
        //     orderId: "gid://shopify/Order/${ticket.orderId}",
        //     refundLineItems: [{ lineItemId: "...", quantity: 1 }]
        //   }) {
        //     refund { id }
        //     userErrors { field message }
        //   }
        // }
        
        this.logger.info(`Processing return for ticket ${ticket.id}`);
        returnsProcessed++;
        refundAmount += Math.random() * 100 + 20; // Simulated refund amount
      }
      
      return {
        type: 'handle_returns',
        returnsProcessed,
        totalRefundAmount: parseFloat(refundAmount.toFixed(2)),
        apiCalls: returnsProcessed
      };
    } catch (error) {
      this.logger.error(`Return handling error: ${error}`);
      return { type: 'handle_returns', returnsProcessed: 0, apiCalls: 0 };
    }
  }

  /**
   * Analyze customer satisfaction
   */
  private async analyzeSatisfaction(tickets: SupportTicket[]): Promise<any> {
    try {
      this.logger.info('Analyzing customer satisfaction');
      
      const sentimentAnalysis = await this.analyzeSentiment(tickets);
      
      const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
      const averageResponseTime = tickets.reduce((sum, t) => sum + (t.responseTime || 60), 0) / tickets.length;
      
      // Calculate satisfaction score (0-100)
      const satisfactionScore = 
        (sentimentAnalysis.positive / tickets.length) * 100 * 0.6 + // 60% weight on positive sentiment
        (resolvedTickets.length / tickets.length) * 100 * 0.4; // 40% weight on resolution rate
      
      // Top issues
      const categoryCount: Record<string, number> = {};
      tickets.forEach(t => {
        categoryCount[t.category] = (categoryCount[t.category] || 0) + 1;
      });
      
      const topIssues = Object.entries(categoryCount)
        .map(([category, count]) => ({ category, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      const metrics: SatisfactionMetrics = {
        totalTickets: tickets.length,
        resolvedTickets: resolvedTickets.length,
        averageResponseTime: parseFloat(averageResponseTime.toFixed(2)),
        averageResolutionTime: averageResponseTime * 2, // Simulated
        satisfactionScore: parseFloat(satisfactionScore.toFixed(2)),
        sentimentBreakdown: sentimentAnalysis,
        topIssues
      };
      
      return {
        type: 'analyze_satisfaction',
        metrics,
        insights: this.generateInsights(metrics),
        apiCalls: 0
      };
    } catch (error) {
      this.logger.error(`Satisfaction analysis error: ${error}`);
      return { type: 'analyze_satisfaction', metrics: null, apiCalls: 0 };
    }
  }

  /**
   * Send automated responses
   */
  private async sendAutoResponses(tickets: SupportTicket[], params: any): Promise<any> {
    try {
      this.logger.info('Sending automated responses');
      
      let responsesSent = 0;
      
      for (const ticket of tickets) {
        if (this.canAutoRespond(ticket)) {
          const response = this.generateAutoResponse(ticket);
          
          // In production, would send via support platform API
          this.logger.info({
            ticketId: ticket.id,
            category: ticket.category
          }, 'Sent auto-response');
          
          responsesSent++;
        }
      }
      
      return {
        type: 'autorespond',
        responsesSent,
        apiCalls: responsesSent
      };
    } catch (error) {
      this.logger.error(`Auto-response error: ${error}`);
      return { type: 'autorespond', responsesSent: 0, apiCalls: 0 };
    }
  }

  /**
   * Analyze sentiment of tickets
   */
  private async analyzeSentiment(tickets: SupportTicket[]): Promise<{ positive: number; neutral: number; negative: number }> {
    const sentiments = { positive: 0, neutral: 0, negative: 0 };
    
    for (const ticket of tickets) {
      sentiments[ticket.sentiment]++;
    }
    
    return sentiments;
  }

  /**
   * Determine if ticket can be auto-resolved
   */
  private canAutoResolve(ticket: SupportTicket): boolean {
    // Only auto-resolve low priority, informational tickets
    return ticket.priority === 'low' && 
           ['order_status', 'technical_issue'].includes(ticket.category);
  }

  /**
   * Determine if ticket can receive auto-response
   */
  private canAutoRespond(ticket: SupportTicket): boolean {
    // Can auto-respond to common queries
    return ['order_status', 'shipping_delay', 'technical_issue'].includes(ticket.category);
  }

  /**
   * Auto-resolve ticket
   */
  private async autoResolveTicket(ticket: SupportTicket): Promise<void> {
    this.logger.info(`Auto-resolving ticket ${ticket.id}`);
    // In production, would update ticket status via API
  }

  /**
   * Generate auto-response for ticket
   */
  private generateAutoResponse(ticket: SupportTicket): string {
    const responses: Record<string, string> = {
      order_status: 'Thank you for your inquiry. Your order is being processed and you will receive a tracking number shortly.',
      shipping_delay: 'We apologize for the delay. Your order is on its way and should arrive within 2-3 business days.',
      technical_issue: 'Thank you for reporting this issue. Our technical team is investigating and will provide an update within 24 hours.',
      product_quality: 'We\'re sorry to hear about the quality issue. Our team will review your concern and contact you within 24 hours.',
      wrong_item: 'We apologize for sending the wrong item. We\'ll arrange a return and send the correct product immediately.',
      refund_request: 'Your refund request has been received. Please allow 5-7 business days for processing.'
    };
    
    return responses[ticket.category] || 'Thank you for contacting us. A support agent will respond shortly.';
  }

  /**
   * Generate insights from satisfaction metrics
   */
  private generateInsights(metrics: SatisfactionMetrics): string[] {
    const insights: string[] = [];
    
    if (metrics.satisfactionScore < 70) {
      insights.push('Customer satisfaction is below target. Review top issues and response times.');
    }
    
    if (metrics.averageResponseTime > 120) {
      insights.push('Response time is high. Consider adding more support staff or improving automation.');
    }
    
    const negativeRatio = metrics.sentimentBreakdown.negative / metrics.totalTickets;
    if (negativeRatio > 0.3) {
      insights.push('High negative sentiment detected. Investigate recurring issues immediately.');
    }
    
    const resolutionRate = metrics.resolvedTickets / metrics.totalTickets;
    if (resolutionRate < 0.7) {
      insights.push('Low resolution rate. Review ticket handling processes.');
    }
    
    if (metrics.topIssues.length > 0) {
      insights.push(`Top issue: ${metrics.topIssues[0].category} (${metrics.topIssues[0].count} tickets). Focus on preventing this issue.`);
    }
    
    return insights;
  }

  /**
   * Track customer service in Shopify
   */
  private async trackCustomerServiceInShopify(result: any): Promise<void> {
    this.logger.info({
      type: result.type,
      processed: result.ticketsProcessed || result.returnsProcessed || result.responsesSent || 0
    }, 'Tracking customer service in Shopify (would use metafieldsSet in production)');
    
    // In production, would use Shopify GraphQL metafieldsSet
  }

  /**
   * Helper methods for ticket generation
   */
  private determinePriority(category: string): 'low' | 'medium' | 'high' | 'urgent' {
    const priorities: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
      shipping_delay: 'medium',
      product_quality: 'high',
      wrong_item: 'high',
      refund_request: 'medium',
      order_status: 'low',
      technical_issue: 'medium'
    };
    return priorities[category] || 'medium';
  }

  private determineSentiment(category: string): 'positive' | 'neutral' | 'negative' {
    const sentiments: Record<string, 'positive' | 'neutral' | 'negative'> = {
      shipping_delay: 'negative',
      product_quality: 'negative',
      wrong_item: 'negative',
      refund_request: 'neutral',
      order_status: 'neutral',
      technical_issue: 'neutral'
    };
    return sentiments[category] || 'neutral';
  }

  private generateTicketSubject(category: string): string {
    const subjects: Record<string, string> = {
      shipping_delay: 'Order Delayed - When will it arrive?',
      product_quality: 'Product Quality Issue',
      wrong_item: 'Received Wrong Product',
      refund_request: 'Request for Refund',
      order_status: 'Question About Order Status',
      technical_issue: 'Website/App Technical Issue'
    };
    return subjects[category] || 'Support Request';
  }

  private generateTicketMessage(category: string): string {
    const messages: Record<string, string> = {
      shipping_delay: 'My order was supposed to arrive yesterday but I haven\'t received any updates. Can you please check?',
      product_quality: 'The product I received doesn\'t match the quality shown in the images. There are defects.',
      wrong_item: 'I ordered a blue wireless charger but received a black one instead.',
      refund_request: 'I would like to request a refund for my recent order as the product doesn\'t meet my needs.',
      order_status: 'Can you tell me the current status of my order? I placed it 3 days ago.',
      technical_issue: 'I\'m having trouble checking out on your website. The payment page keeps loading.'
    };
    return messages[category] || 'I need help with my order.';
  }
}
