/**
 * AIRA Chat Route - Natural Language to Action Plan Conversion
 * 
 * Handles /chat endpoint for converting natural language input into
 * structured execution plans with risk assessment and verifications.
 * 
 * Production-ready integration with Royal Equips Command Center UI.
 */

import { FastifyPluginAsync } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { 
  type ExecutionPlan, 
  type Verification,
  type RiskAssessment,
  type ApprovalRequest,
  type ToolCall
} from '../schemas/aira.js';
import { planner } from '../planner/index.js';
import { snapshotUEG } from '../ueg/index.js';
import { policy } from '../policy/index.js';

// Business constants for better maintainability
const BUSINESS_CONSTANTS = {
  MAX_MESSAGE_LENGTH: 2000,
  MIN_MESSAGE_LENGTH: 3,
  MAX_PROCESSING_TIME_MS: 30000, // 30 seconds
  CRITICAL_PROCESSING_TIME_MS: 20000, // 20 seconds warning
} as const;

export const chatRoute: FastifyPluginAsync = async (fastify) => {
  
  // Apply stricter rate limiting for chat endpoint specifically
  await fastify.register(rateLimit, {
    max: 20, // More conservative limit for chat
    timeWindow: '1 minute',
    skipOnError: false,
    keyGenerator: (request) => `chat:${request.ip}:${request.headers['user-agent'] || 'unknown'}`,
    errorResponseBuilder: (request, context) => ({
      error: 'Chat rate limit exceeded',
      message: `Maximum ${context.max} chat requests per minute allowed. Please wait before sending another message.`,
      retryAfter: Math.ceil(context.ttl / 1000),
      timestamp: new Date().toISOString()
    })
  });

  fastify.post<{
    Body: { message: string; context?: Record<string, unknown> };
    Reply: {
      content: string;
      agent_name: string;
      plan?: ExecutionPlan;
      risk?: RiskAssessment;
      verifications?: Verification[];
      approvals?: ApprovalRequest[];
      tool_calls?: ToolCall[];
      next_steps?: string[];
    };
  }>('/chat', {
    schema: {
      body: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { 
            type: 'string',
            minLength: BUSINESS_CONSTANTS.MIN_MESSAGE_LENGTH,
            maxLength: BUSINESS_CONSTANTS.MAX_MESSAGE_LENGTH
          },
          context: { type: 'object' }
        }
      },
      response: {
        200: {
          type: 'object',
          required: ['content', 'agent_name'],
          properties: {
            content: { type: 'string' },
            agent_name: { type: 'string' },
            plan: { type: 'object' },
            risk: { type: 'object' },
            verifications: { type: 'array' },
            approvals: { type: 'array' },
            tool_calls: { type: 'array' },
            next_steps: { type: 'array' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string' }
          }
        },
        429: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            retryAfter: { type: 'number' },
            timestamp: { type: 'string' }
          }
        }
      }
    },
    preHandler: async (request, reply) => {
      // Additional business logic validation
      const validation = validateChatRequest(request.body);
      if (!validation.valid) {
        await reply.status(400).send({
          content: `❌ ${validation.error}`,
          agent_name: 'AIRA'
        });
        return;
      }
    }
  }, async (request, _reply) => {
    const startTime = Date.now();
    const requestContext = {
      requestId: request.id,
      userMessage: request.body.message,
      clientIp: request.ip,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString()
    };
    
    // Set up processing timeout
    const timeoutHandle = setTimeout(() => {
      fastify.log.warn({
        ...requestContext,
        message: 'Chat request processing timeout warning',
        duration: Date.now() - startTime
      });
    }, BUSINESS_CONSTANTS.CRITICAL_PROCESSING_TIME_MS);
    
    try {
      fastify.log.info({
        ...requestContext,
        message: 'Processing natural language input'
      });

      // Business logic flow with proper error boundaries
      const response = await processAIRARequest({
        message: request.body.message,
        context: request.body.context,
        requestId: request.id,
        startTime,
        logger: fastify.log
      });

      const duration = Date.now() - startTime;
      
      fastify.log.info({
        ...requestContext,
        message: 'Chat request completed successfully',
        planGoal: response.plan?.goal,
        riskLevel: response.risk?.level,
        duration
      });

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorContext = {
        ...requestContext,
        error: error instanceof Error ? error.message : String(error),
        duration
      };
      
      fastify.log.error({
        ...errorContext,
        message: 'Chat request processing failed'
      });
      
      // Return user-friendly error response
      return createErrorResponse(error, request.id);
      
    } finally {
      clearTimeout(timeoutHandle);
    }
  });
};

/**
 * Business logic for request validation
 */
function validateChatRequest(body: { message?: unknown }): { valid: boolean; error?: string } {
  if (!body.message || typeof body.message !== 'string') {
    return { valid: false, error: 'Message is required and must be a string' };
  }

  const message = body.message.trim();
  
  if (message.length < BUSINESS_CONSTANTS.MIN_MESSAGE_LENGTH) {
    return { valid: false, error: `Message must be at least ${BUSINESS_CONSTANTS.MIN_MESSAGE_LENGTH} characters long` };
  }

  if (message.length > BUSINESS_CONSTANTS.MAX_MESSAGE_LENGTH) {
    return { valid: false, error: `Message must not exceed ${BUSINESS_CONSTANTS.MAX_MESSAGE_LENGTH} characters` };
  }

  // Business rule: Check for suspicious patterns
  const suspiciousPatterns = [
    /(<script|<iframe|javascript:|data:)/i,
    /(\bexec\b|\beval\b|\bshell\b)/i
  ];
  
  if (suspiciousPatterns.some(pattern => pattern.test(message))) {
    return { valid: false, error: 'Message contains potentially harmful content' };
  }

  return { valid: true };
}

/**
 * Main business logic for processing AIRA requests
 */
async function processAIRARequest(params: {
  message: string;
  context?: Record<string, unknown>;
  requestId: string;
  startTime: number;
  logger: { debug: (obj: object) => void };
}): Promise<{
  content: string;
  agent_name: string;
  plan: ExecutionPlan;
  risk: RiskAssessment;
  verifications: Verification[];
  approvals: ApprovalRequest[];
  tool_calls: ToolCall[];
  next_steps: string[];
}> {
  const { message, context, requestId, logger } = params;

  // Step 1: Snapshot current Unified Empire Graph (UEG) with timeout
  logger.debug({ requestId, step: 'ueg_snapshot' });
  const ueg = await Promise.race([
    snapshotUEG(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('UEG snapshot timeout')), 5000)
    )
  ]);
  
  // Step 2: Generate execution plan from natural language
  logger.debug({ requestId, step: 'plan_generation' });
  const plan: ExecutionPlan = await Promise.race([
    planner(message, ueg, context),
    new Promise<ExecutionPlan>((_, reject) => 
      setTimeout(() => reject(new Error('Planning timeout')), 10000)
    )
  ]);
  
  // Step 3: Run policy verifications with timeout
  logger.debug({ requestId, step: 'policy_verification' });
  const verifications: Verification[] = await Promise.race([
    policy.verify(plan),
    new Promise<Verification[]>((_, reject) => 
      setTimeout(() => reject(new Error('Policy verification timeout')), 5000)
    )
  ]);
  
  // Step 4: Assess risk and determine approval requirements
  logger.debug({ requestId, step: 'risk_assessment' });
  const riskAssessment = policy.assessRisk(plan, verifications);
  const approvals = riskAssessment.level !== 'LOW' ? 
    policy.getRequiredApprovals(plan, riskAssessment) : [];

  // Step 5: Generate tool calls if plan is executable
  logger.debug({ requestId, step: 'tool_generation' });
  const toolCalls = policy.allows(plan, riskAssessment) ? 
    generateToolCallsFromPlan(plan) : [];

  // Step 6: Generate natural language response
  logger.debug({ requestId, step: 'response_generation' });
  const response = generateNaturalLanguageResponse(
    message, 
    plan, 
    riskAssessment, 
    verifications, 
    approvals,
    toolCalls
  );

  return response;
}

/**
 * Create standardized error response
 */
function createErrorResponse(error: unknown, _requestId: string) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
  
  // Business logic for error classification
  let userFriendlyMessage = 'I encountered an error processing your request. Please try again or rephrase your command.';
  
  if (errorMessage.includes('timeout')) {
    userFriendlyMessage = 'Your request is taking longer than expected to process. Please try a simpler command or try again later.';
  } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    userFriendlyMessage = 'Your request contains invalid information. Please check your input and try again.';
  } else if (errorMessage.includes('rate limit')) {
    userFriendlyMessage = 'You are sending requests too quickly. Please wait a moment before trying again.';
  }

  return {
    content: `❌ ${userFriendlyMessage}`,
    agent_name: 'AIRA',
    plan: null,
    risk: { level: 'HIGH', score: 1.0 },
    verifications: [{
      type: 'error_check',
      result: errorMessage,
      pass: false
    }],
    approvals: [],
    tool_calls: [],
    next_steps: [
      'Review your request for any issues',
      'Try rephrasing your command',
      'Contact support if the problem persists'
    ]
  };
}

/**
 * Generate natural language response based on AIRA analysis (Enhanced)
 */
function generateNaturalLanguageResponse(
  userMessage: string,
  plan: ExecutionPlan,
  risk: RiskAssessment,
  verifications: Verification[],
  approvals: ApprovalRequest[],
  toolCalls: ToolCall[]
): {
  content: string;
  agent_name: string;
  plan: ExecutionPlan;
  risk: RiskAssessment;
  verifications: Verification[];
  approvals: ApprovalRequest[];
  tool_calls: ToolCall[];
  next_steps: string[];
} {
  let content = '';
  
  // Enhanced response generation with better business context
  const riskEmoji = risk.level === 'LOW' ? '✅' : risk.level === 'MEDIUM' ? '⚠️' : '🚨';
  const confidenceScore = calculateConfidenceScore(verifications);
  
  if (risk.level === 'LOW') {
    content = `${riskEmoji} **Analysis Complete:** "${userMessage}"\n\n`;
    content += `I've generated a **${risk.level} risk** execution plan with ${plan.actions.length} actions (${confidenceScore}% confidence):\n\n`;
    content += `**Goal:** ${plan.goal}\n\n`;
    content += `**Actions:**\n`;
    plan.actions.forEach((action, i: number) => {
      content += `${i + 1}. ${formatActionName(action.type)}\n`;
    });
    content += `\n✅ All verifications passed. This plan is ready for automatic execution.`;
    
    if (toolCalls.length > 0) {
      const uniqueTools = [...new Set(toolCalls.map(tc => tc.tool))];
      content += `\n\n🔧 **Tool Operations:** ${toolCalls.length} operations across ${uniqueTools.join(', ')} systems.`;
    }
  } else if (risk.level === 'MEDIUM') {
    content = `${riskEmoji} **Risk Assessment:** "${userMessage}"\n\n`;
    content += `I've generated a **${risk.level} risk** execution plan (${(risk.score * 100).toFixed(1)}% risk score, ${confidenceScore}% confidence):\n\n`;
    content += `**Goal:** ${plan.goal}\n\n`;
    content += `**Actions Required:**\n`;
    plan.actions.forEach((action, i: number) => {
      content += `${i + 1}. ${formatActionName(action.type)}\n`;
    });
    
    const failedVerifications = verifications.filter(v => !v.pass);
    if (failedVerifications.length > 0) {
      content += `\n⚠️ **Verification Concerns (${failedVerifications.length}):**\n`;
      failedVerifications.forEach(v => {
        content += `- ${v.type}: ${v.result}\n`;
      });
    } else {
      content += `\n✅ All technical verifications passed.`;
    }
    
    if (approvals.length > 0) {
      content += `\n\n🔐 **Approval Required:** ${approvals[0].reason.toLowerCase()}`;
    }
  } else {
    content = `${riskEmoji} **High Risk Operation:** "${userMessage}"\n\n`;
    content += `**Critical Risk Assessment:** ${risk.level} risk operation (${(risk.score * 100).toFixed(1)}% risk score, ${confidenceScore}% confidence)\n\n`;
    content += `**Goal:** ${plan.goal}\n\n`;
    content += `**⚠️ Critical Actions Required:**\n`;
    plan.actions.forEach((action, i: number) => {
      content += `${i + 1}. ${formatActionName(action.type)} ⚠️\n`;
    });
    
    if (approvals.length > 0) {
      content += `\n🔐 **Multiple Approvals Required (${approvals.length}):**\n`;
      approvals.forEach((approval, i: number) => {
        content += `${i + 1}. ${approval.reason}\n`;
      });
    }
    
    content += `\n🛡️ This operation requires explicit approval before execution.`;
  }

  // Enhanced next steps with business context
  const nextSteps = generateNextSteps(risk.level, toolCalls.length, approvals.length, verifications);

  return {
    content,
    agent_name: 'AIRA',
    plan,
    risk,
    verifications,
    approvals,
    tool_calls: toolCalls,
    next_steps: nextSteps
  };
}

/**
 * Business logic for calculating confidence score
 */
function calculateConfidenceScore(verifications: Verification[]): number {
  if (verifications.length === 0) return 50;
  
  const passedCount = verifications.filter(v => v.pass).length;
  const score = Math.round((passedCount / verifications.length) * 100);
  
  return Math.max(score, 50); // Minimum 50% confidence
}

/**
 * Format action names for better readability
 */
function formatActionName(actionType: string): string {
  return actionType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Generate contextual next steps
 */
function generateNextSteps(riskLevel: string, toolCallCount: number, approvalCount: number, verifications: Verification[]): string[] {
  const steps: string[] = [];
  
  if (riskLevel === 'LOW') {
    steps.push('✅ Plan validated and ready for execution');
    if (toolCallCount > 0) {
      steps.push(`🔧 Execute ${toolCallCount} automated tool operations`);
    }
    steps.push('📊 Monitor execution progress and results');
  } else if (riskLevel === 'MEDIUM') {
    steps.push('📋 Review execution plan details carefully');
    steps.push('🔍 Verify all action parameters are correct');
    if (approvalCount > 0) {
      steps.push(`🔐 Obtain ${approvalCount} required approval(s)`);
    }
    steps.push('▶️ Proceed with execution when approved');
  } else {
    steps.push('🚨 Review high-risk actions and potential impact');
    steps.push('👥 Consult with team leads before proceeding');
    steps.push('🔐 Obtain all required security approvals');
    steps.push('🧪 Consider running in staging environment first');
  }
  
  const failedVerifications = verifications.filter(v => !v.pass);
  if (failedVerifications.length > 0) {
    steps.push(`⚠️ Address ${failedVerifications.length} verification concern(s)`);
  }
  
  return steps;
}

/**
 * Generate tool calls from execution plan (Enhanced)
 */
function generateToolCallsFromPlan(plan: ExecutionPlan): ToolCall[] {
  const toolCalls: ToolCall[] = [];
  
  for (const action of plan.actions) {
    const toolCall = mapActionToTool(action);
    if (toolCall) {
      toolCalls.push(toolCall);
    }
  }
  
  return toolCalls;
}

/**
 * Map action to appropriate tool (Enhanced with better patterns)
 */
function mapActionToTool(action: { type: string; args?: Record<string, unknown>; dry_run?: boolean }): ToolCall | null {
  const toolMapping: Record<string, string> = {
    // Deployment operations
    'validate_deployment_target': 'github',
    'run_pre_deployment_checks': 'github',
    'execute_deployment': 'gcp',
    'verify_deployment_health': 'gcp',
    
    // Resource management
    'analyze_creation_request': 'supabase',
    'create_resource': 'gcp',
    'validate_resource_requirements': 'gcp',
    'verify_resource_creation': 'gcp',
    
    // Monitoring and analysis
    'gather_system_metrics': 'monitoring',
    'analyze_health_indicators': 'monitoring',
    'generate_status_report': 'monitoring',
    
    // Data operations
    'backup_current_state': 'supabase',
    'execute_data_operation': 'supabase',
    'verify_data_integrity': 'supabase',
    
    // Business operations
    'analyze_request': 'monitoring',
    'gather_relevant_information': 'monitoring',
    'generate_insights': 'monitoring'
  };
  
  const tool = toolMapping[action.type];
  if (!tool) {
    return null;
  }
  
  return {
    tool,
    args: action.args || {},
    dry_run: action.dry_run !== false, // Default to dry-run for safety
    expect_diff: `Expected changes from ${formatActionName(action.type)}`
  };
}