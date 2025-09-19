import { Logger } from 'pino';
import { BaseAgent } from './base-agent.js';
import { AgentConfig, AgentStatus, AgentMessage, AgentExecutionResult } from './types.js';

export class AgentOrchestrator {
  private agents = new Map<string, BaseAgent>();
  private messageQueue: AgentMessage[] = [];
  private logger: Logger;
  private isRunning = false;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Register an agent with the orchestrator
   */
  registerAgent(agent: BaseAgent): void {
    const status = agent.getStatus();
    this.agents.set(status.id, agent);
    this.logger.info(`Agent registered: ${status.name} (${status.id})`);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    this.logger.info(`Agent unregistered: ${agentId}`);
  }

  /**
   * Get all registered agents
   */
  getAgents(): AgentStatus[] {
    return Array.from(this.agents.values()).map(agent => agent.getStatus());
  }

  /**
   * Get specific agent by ID
   */
  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Execute an agent with parameters
   */
  async executeAgent(agentId: string, parameters: Record<string, unknown>): Promise<AgentExecutionResult> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    this.logger.info(`Executing agent: ${agentId}`);
    return await agent.execute(parameters);
  }

  /**
   * Send message to an agent
   */
  sendMessage(message: AgentMessage): void {
    this.messageQueue.push(message);
    this.logger.debug(`Message queued: ${message.id} from ${message.from} to ${message.to}`);
  }

  /**
   * Start the orchestrator
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Orchestrator already running');
      return;
    }

    this.isRunning = true;
    this.logger.info('Starting agent orchestrator');

    // Start message processing loop
    this.processMessages();

    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Stop the orchestrator
   */
  async stop(): Promise<void> {
    this.isRunning = false;
    this.logger.info('Stopping agent orchestrator');
  }

  /**
   * Get orchestrator status
   */
  getStatus(): {
    isRunning: boolean;
    agentCount: number;
    queueSize: number;
    healthyAgents: number;
    unhealthyAgents: number;
  } {
    const agents = this.getAgents();
    const healthyAgents = agents.filter(a => a.health === 'healthy').length;
    
    return {
      isRunning: this.isRunning,
      agentCount: this.agents.size,
      queueSize: this.messageQueue.length,
      healthyAgents,
      unhealthyAgents: agents.length - healthyAgents
    };
  }

  /**
   * Execute emergency rollback for all agents
   */
  async emergencyStop(): Promise<void> {
    this.logger.warn('Emergency stop initiated');
    
    const rollbackPromises = Array.from(this.agents.values()).map(async agent => {
      try {
        const status = agent.getStatus();
        if (status.status === 'active') {
          // TODO: Implement emergency rollback
          this.logger.info(`Initiating emergency rollback for agent: ${status.id}`);
        }
      } catch (error) {
        this.logger.error(`Emergency rollback failed for agent: ${agent.getStatus().id} - ${String(error)}`);
      }
    });

    await Promise.allSettled(rollbackPromises);
    await this.stop();
  }

  /**
   * Process message queue
   */
  private async processMessages(): Promise<void> {
    while (this.isRunning) {
      if (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift()!;
        await this.handleMessage(message);
      }
      
      // Wait before next iteration
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Handle individual message
   */
  private async handleMessage(message: AgentMessage): Promise<void> {
    const targetAgent = this.agents.get(message.to);
    
    if (!targetAgent) {
      this.logger.warn(`Message target agent not found: ${message.to} (message: ${message.id})`);
      return;
    }

    try {
      this.logger.debug(`Processing message: ${message.id} from ${message.from} to ${message.to}`);

      switch (message.type) {
        case 'command':
          await targetAgent.execute(message.payload);
          break;
        case 'event':
          // Handle events (notifications, status updates, etc.)
          break;
        default:
          this.logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      this.logger.error(`Message processing failed for ${message.id}: ${String(error)}`);
    }
  }

  /**
   * Start health monitoring for all agents
   */
  private startHealthMonitoring(): void {
    const monitorHealth = async () => {
      if (!this.isRunning) return;

      for (const [agentId, agent] of this.agents) {
        try {
          const isHealthy = await agent.healthCheck();
          if (!isHealthy) {
            this.logger.warn(`Agent health check failed: ${agentId}`);
          }
        } catch (error) {
          this.logger.error(`Health check error for ${agentId}: ${String(error)}`);
        }
      }

      // Schedule next health check
      setTimeout(monitorHealth, 30000); // Every 30 seconds
    };

    monitorHealth();
  }
}