import { Logger } from 'pino';
import { z } from 'zod';
import {
  AgentExecutionPlan,
  AgentExecutionResult,
  AgentStatus,
  AgentConfig,
  AgentType,
  ExecutionMetrics
} from './types.js';

export abstract class BaseAgent {
  protected logger: Logger;
  protected config: AgentConfig;
  protected status: AgentStatus;
  protected executionCount = 0;
  protected errorCount = 0;
  protected lastExecutionTime = 0;

  constructor(config: AgentConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.status = {
      id: config.id,
      name: config.name,
      type: config.type,
      status: 'inactive',
      health: 'healthy',
      lastExecution: new Date().toISOString(),
      nextExecution: new Date().toISOString(),
      errorCount: 0,
      successRate: 100,
      averageDuration: 0
    };
  }

  /**
   * Plan phase - Generate execution plan without making changes
   */
  abstract plan(parameters: Record<string, unknown>): Promise<AgentExecutionPlan>;

  /**
   * DryRun phase - Simulate execution to validate plan
   */
  abstract dryRun(plan: AgentExecutionPlan): Promise<AgentExecutionResult>;

  /**
   * Apply phase - Execute the plan with real changes
   */
  abstract apply(plan: AgentExecutionPlan): Promise<AgentExecutionResult>;

  /**
   * Rollback phase - Undo changes if something goes wrong
   */
  abstract rollback(plan: AgentExecutionPlan): Promise<AgentExecutionResult>;

  /**
   * Execute the full Plan -> DryRun -> Apply workflow
   */
  async execute(parameters: Record<string, unknown>): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Starting agent execution for ${this.config.name}`);
      this.status.status = 'active';

      // Phase 1: Plan
      const plan = await this.plan(parameters);
      this.logger.info(`Plan generated: ${plan.id}`);

      // Phase 2: DryRun
      const dryRunResult = await this.dryRun(plan);
      if (dryRunResult.status === 'error') {
        this.logger.error(`DryRun failed: ${dryRunResult.errors?.join(', ')}`);
        throw new Error(`DryRun failed: ${dryRunResult.errors?.join(', ')}`);
      }

      // Check if approval is needed for sensitive operations
      if (plan.needsApproval && !this.hasApproval(plan.id)) {
        this.logger.info(`Execution requires approval: ${plan.id}`);
        return {
          planId: plan.id,
          status: 'partial',
          results: { message: 'Awaiting approval', needsApproval: true },
          metrics: this.calculateMetrics(startTime),
          timestamp: new Date().toISOString()
        };
      }

      // Phase 3: Apply
      const result = await this.apply(plan);
      
      this.updateStats(Date.now() - startTime, result.status === 'success');
      this.status.status = 'inactive';
      
      return result;

    } catch (error) {
      this.logger.error(`Agent execution failed: ${error}`);
      this.updateStats(Date.now() - startTime, false);
      this.status.status = 'error';
      
      return {
        planId: crypto.randomUUID(),
        status: 'error',
        results: {},
        metrics: this.calculateMetrics(startTime),
        errors: [error instanceof Error ? error.message : String(error)],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get current agent status
   */
  getStatus(): AgentStatus {
    return { ...this.status };
  }

  /**
   * Update agent configuration
   */
  updateConfig(newConfig: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info(`Agent configuration updated for ${this.config.name}`);
  }

  /**
   * Health check for the agent
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Override in subclasses for specific health checks
      return this.status.health !== 'critical';
    } catch (error) {
      this.logger.error(`Health check failed: ${error}`);
      this.status.health = 'critical';
      return false;
    }
  }

  /**
   * Check if plan has approval (placeholder for approval system)
   */
  private hasApproval(planId: string): boolean {
    // TODO: Implement approval system integration
    return false;
  }

  /**
   * Update execution statistics
   */
  private updateStats(duration: number, success: boolean): void {
    this.executionCount++;
    
    if (success) {
      this.lastExecutionTime = duration;
      this.status.averageDuration = 
        (this.status.averageDuration * (this.executionCount - 1) + duration) / this.executionCount;
    } else {
      this.errorCount++;
    }

    this.status.successRate = ((this.executionCount - this.errorCount) / this.executionCount) * 100;
    this.status.errorCount = this.errorCount;
    this.status.lastExecution = new Date().toISOString();

    // Update health based on success rate
    if (this.status.successRate < 50) {
      this.status.health = 'critical';
    } else if (this.status.successRate < 80) {
      this.status.health = 'warning';
    } else {
      this.status.health = 'healthy';
    }
  }

  /**
   * Calculate execution metrics
   */
  private calculateMetrics(startTime: number): ExecutionMetrics {
    return {
      duration: Date.now() - startTime,
      resourcesUsed: 0, // TODO: Implement resource tracking
      apiCalls: 0, // TODO: Implement API call tracking
      dataProcessed: 0 // TODO: Implement data processing tracking
    };
  }

  /**
   * Validate input parameters using Zod schema
   */
  protected validateParameters<T>(schema: z.ZodSchema<T>, parameters: unknown): T {
    try {
      return schema.parse(parameters);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new Error(`Parameter validation failed: ${message}`);
      }
      throw error;
    }
  }

  /**
   * Generate execution plan ID
   */
  protected generatePlanId(): string {
    return `${this.config.name}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
  }
}