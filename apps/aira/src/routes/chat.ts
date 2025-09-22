/**
 * AIRA Chat Route - Natural Language to Action Plan Conversion
 * 
 * Handles /chat endpoint for converting natural language input into
 * structured execution plans with risk assessment and verifications.
 */

import { FastifyPluginAsync } from 'fastify';
import { ChatRequestSchema, AIRAResponseSchema, type AIRAResponse, type ToolCall } from '../schemas/aira.js';
import { planner } from '../planner/index.js';
import { snapshotUEG } from '../ueg/index.js';
import { policy } from '../policy/index.js';

export const chatRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{
    Body: { message: string; context?: Record<string, unknown> };
    Reply: AIRAResponse;
  }>('/chat', {
    schema: {
      body: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string' },
          context: { type: 'object' }
        }
      },
      response: {
        200: {
          type: 'object',
          required: ['plan', 'risk', 'verifications'],
          properties: {
            plan: {
              type: 'object',
              properties: {
                goal: { type: 'string' },
                actions: { type: 'array' }
              }
            },
            risk: {
              type: 'object',
              properties: {
                score: { type: 'number' },
                level: { type: 'string' }
              }
            },
            verifications: { type: 'array' },
            approvals: { type: 'array' },
            tool_calls: { type: 'array' },
            next_ui_steps: { type: 'array' },
            thoughts: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const startTime = Date.now();
    
    try {
      fastify.log.info({
        message: 'Processing natural language input',
        userMessage: request.body.message,
        requestId: request.id
      });

      // Step 1: Snapshot current Unified Empire Graph (UEG)
      const ueg = await snapshotUEG();
      
      // Step 2: Generate execution plan from natural language
      const plan = await planner(request.body.message, ueg, request.body.context);
      
      // Step 3: Run policy verifications
      const verifications = await policy.verify(plan);
      
      // Step 4: Assess risk and determine approval requirements
      const riskAssessment = policy.assessRisk(plan, verifications);
      const approvals = riskAssessment.level !== 'LOW' ? 
        policy.getRequiredApprovals(plan, riskAssessment) : [];

      // Step 5: Generate tool calls if plan is executable
      const toolCalls = policy.allows(plan, riskAssessment) ? 
        generateToolCallsFromPlan(plan) : [];

      // Step 6: Suggest next UI steps
      const nextUISteps = generateNextUISteps(plan, riskAssessment, approvals);

      const response: AIRAResponse = {
        plan,
        risk: riskAssessment,
        verifications,
        approvals: approvals.length > 0 ? approvals : undefined,
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        next_ui_steps: nextUISteps,
        thoughts: {
          redacted: 'Internal reasoning redacted for security'
        }
      };

      fastify.log.info({
        message: 'Plan generated successfully',
        planGoal: plan.goal,
        riskLevel: riskAssessment.level,
        actionCount: plan.actions.length,
        duration: Date.now() - startTime,
        requestId: request.id
      });

      return response;

    } catch (error) {
      fastify.log.error({
        message: 'Error processing chat request',
        error: error instanceof Error ? error.message : String(error),
        requestId: request.id,
        duration: Date.now() - startTime
      });
      
      reply.status(500);
      return {
        plan: {
          goal: 'Error processing request',
          actions: []
        },
        risk: {
          score: 1.0,
          level: 'HIGH' as const
        },
        verifications: [{
          type: 'error',
          result: error instanceof Error ? error.message : 'Unknown error',
          pass: false
        }],
        next_ui_steps: ['Review error details', 'Try rephrasing request']
      };
    }
  });
};

/**
 * Generate suggested next UI steps based on plan and risk assessment
 */
function generateNextUISteps(
  plan: any, 
  risk: any, 
  approvals: any[]
): string[] {
  const steps: string[] = [];
  
  if (risk.level === 'HIGH') {
    steps.push('Review high-risk actions carefully');
    steps.push('Obtain required approvals before execution');
  } else if (risk.level === 'MEDIUM') {
    steps.push('Review plan details');
    steps.push('Approve execution when ready');
  } else {
    steps.push('Plan ready for automatic execution');
  }
  
  if (plan.actions.length > 0) {
    steps.push(`Execute ${plan.actions.length} planned action(s)`);
  }
  
  if (approvals.length > 0) {
    steps.push(`Obtain ${approvals.length} required approval(s)`);
  }
  
  return steps;
}

/**
 * Generate tool calls from execution plan (moved from planner)
 */
function generateToolCallsFromPlan(plan: any): ToolCall[] {
  const toolCalls: ToolCall[] = [];
  
  for (const action of plan.actions) {
    // Map actions to appropriate tools
    const toolCall = mapActionToTool(action);
    if (toolCall) {
      toolCalls.push(toolCall);
    }
  }
  
  return toolCalls;
}

/**
 * Map action to appropriate tool
 */
function mapActionToTool(action: any): ToolCall | null {
  // Simple mapping for MVP - in production this would be more sophisticated
  const toolMapping: Record<string, string> = {
    'validate_deployment_target': 'github',
    'run_pre_deployment_checks': 'github',
    'execute_deployment': 'gcp',
    'verify_deployment_health': 'gcp',
    'analyze_creation_request': 'supabase',
    'create_resource': 'gcp',
    'gather_system_metrics': 'monitoring',
    'analyze_health_indicators': 'monitoring'
  };
  
  const tool = toolMapping[action.type];
  if (!tool) {
    return null;
  }
  
  return {
    tool,
    args: action.args || {},
    dry_run: action.dry_run || true,
    expect_diff: `Expected changes from ${action.type}`
  };
}