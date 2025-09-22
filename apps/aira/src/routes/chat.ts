/**
 * AIRA Chat Route - Natural Language to Action Plan Conversion
 * 
 * Handles /chat endpoint for converting natural language input into
 * structured execution plans with risk assessment and verifications.
 * 
 * Production-ready integration with Royal Equips Command Center UI.
 */

import { FastifyPluginAsync } from 'fastify';
import { ChatRequestSchema, AIRAResponseSchema, type AIRAResponse } from '../schemas/aira.js';
import { planner } from '../planner/index.js';
import { snapshotUEG } from '../ueg/index.js';
import { policy } from '../policy/index.js';

export const chatRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{
    Body: { message: string; context?: Record<string, unknown> };
    Reply: {
      content: string;
      agent_name: string;
      plan?: any;
      risk?: any;
      verifications?: any[];
      approvals?: any[];
      tool_calls?: any[];
      next_steps?: string[];
    };
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

      // Step 6: Generate natural language response
      const response = generateNaturalLanguageResponse(
        request.body.message, 
        plan, 
        riskAssessment, 
        verifications, 
        approvals,
        toolCalls
      );

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
        content: `I encountered an error processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or rephrase your command.`,
        agent_name: 'AIRA',
        plan: null,
        risk: { level: 'HIGH', score: 1.0 },
        verifications: [],
        approvals: [],
        tool_calls: [],
        next_steps: ['Try rephrasing your request', 'Check system status', 'Contact support if issue persists']
      };
    }
  });
};

/**
 * Generate natural language response based on AIRA analysis
 */
function generateNaturalLanguageResponse(
  userMessage: string,
  plan: any,
  risk: any,
  verifications: any[],
  approvals: any[],
  toolCalls: any[]
): {
  content: string;
  agent_name: string;
  plan: any;
  risk: any;
  verifications: any[];
  approvals: any[];
  tool_calls: any[];
  next_steps: string[];
} {
  let content = '';
  
  // Generate contextual response based on plan and risk
  if (risk.level === 'LOW') {
    content = `✅ **Analyzing your request:** "${userMessage}"\n\n`;
    content += `I've generated a **${risk.level} risk** execution plan with ${plan.actions.length} actions:\n\n`;
    content += `**Goal:** ${plan.goal}\n\n`;
    content += `**Actions:**\n`;
    plan.actions.forEach((action: any, i: number) => {
      content += `${i + 1}. ${action.type.replace(/_/g, ' ')}\n`;
    });
    content += `\n✅ All verifications passed. This plan is ready for automatic execution.`;
    
    if (toolCalls.length > 0) {
      content += `\n\n🔧 **Tool Calls:** ${toolCalls.length} operations will be executed across ${[...new Set(toolCalls.map(tc => tc.tool))].join(', ')}.`;
    }
  } else if (risk.level === 'MEDIUM') {
    content = `⚠️ **Analyzing your request:** "${userMessage}"\n\n`;
    content += `I've generated a **${risk.level} risk** execution plan (${(risk.score * 100).toFixed(1)}% risk score):\n\n`;
    content += `**Goal:** ${plan.goal}\n\n`;
    content += `**Actions:**\n`;
    plan.actions.forEach((action: any, i: number) => {
      content += `${i + 1}. ${action.type.replace(/_/g, ' ')}\n`;
    });
    
    const failedVerifications = verifications.filter(v => !v.pass);
    if (failedVerifications.length > 0) {
      content += `\n⚠️ **Verification Issues:**\n`;
      failedVerifications.forEach(v => {
        content += `- ${v.type}: ${v.result}\n`;
      });
    }
    
    if (approvals.length > 0) {
      content += `\n🔐 **Approval Required:** This operation requires approval due to ${approvals[0].reason.toLowerCase()}.`;
    }
  } else {
    content = `🚨 **High Risk Operation Detected:** "${userMessage}"\n\n`;
    content += `I've analyzed your request and identified a **${risk.level} risk** operation (${(risk.score * 100).toFixed(1)}% risk score).\n\n`;
    content += `**Goal:** ${plan.goal}\n\n`;
    content += `**⚠️ Critical Actions:**\n`;
    plan.actions.forEach((action: any, i: number) => {
      content += `${i + 1}. ${action.type.replace(/_/g, ' ')}\n`;
    });
    
    if (approvals.length > 0) {
      content += `\n🔐 **Multiple Approvals Required:**\n`;
      approvals.forEach((approval: any) => {
        content += `- ${approval.reason}\n`;
      });
    }
    
    content += `\n🛡️ This operation will NOT proceed without explicit approval.`;
  }

  // Generate next steps
  const nextSteps: string[] = [];
  if (risk.level === 'LOW') {
    nextSteps.push('Plan ready for execution');
    if (toolCalls.length > 0) {
      nextSteps.push(`Execute ${toolCalls.length} tool operations`);
    }
  } else if (risk.level === 'MEDIUM') {
    nextSteps.push('Review plan details carefully');
    nextSteps.push('Approve execution when ready');
    if (approvals.length > 0) {
      nextSteps.push(`Obtain ${approvals.length} required approval(s)`);
    }
  } else {
    nextSteps.push('Review high-risk actions');
    nextSteps.push('Obtain security approval');
    nextSteps.push('Consider alternative approaches');
  }

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
 * Generate tool calls from execution plan
 */
function generateToolCallsFromPlan(plan: any): any[] {
  const toolCalls: any[] = [];
  
  for (const action of plan.actions) {
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
function mapActionToTool(action: any): any | null {
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