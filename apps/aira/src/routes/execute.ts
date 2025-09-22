/**
 * AIRA Execute Route - Approval-Gated Tool Execution
 * 
 * Handles /execute endpoint for running approved tool calls with
 * proper validation, logging, rollback capabilities, and business logic patterns.
 */

import { FastifyPluginAsync } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { ExecuteRequestSchema, type ToolCall } from '../schemas/aira.js';
import { tools } from '../tools/index.js';
import { validateApproval } from '../policy/approvals.js';

// Business constants for execution logic
const EXECUTION_CONSTANTS = {
  MAX_CONCURRENT_TOOLS: 5,
  TOOL_TIMEOUT_MS: 60000, // 1 minute per tool
  MAX_RETRY_ATTEMPTS: 3,
  ROLLBACK_TIMEOUT_MS: 30000,
} as const;

export const executeRoute: FastifyPluginAsync = async (fastify) => {

  // Apply rate limiting for execution endpoint (stricter than chat)
  await fastify.register(rateLimit, {
    max: 10, // Very conservative limit for executions
    timeWindow: '1 minute',
    skipOnError: false,
    keyGenerator: (request) => `execute:${request.ip}:${request.headers['user-agent'] || 'unknown'}`,
    errorResponseBuilder: (request, context) => ({
      error: 'Execution rate limit exceeded',
      message: `Maximum ${context.max} executions per minute allowed. This limit protects system resources.`,
      retryAfter: Math.ceil(context.ttl / 1000),
      timestamp: new Date().toISOString()
    })
  });

  fastify.post<{
    Body: { tool_calls: ToolCall[]; approval_token?: string };
    Reply: { ok: boolean; results: any[]; execution_id: string; summary?: ExecutionSummary };
  }>('/execute', {
    schema: {
      body: {
        type: 'object',
        required: ['tool_calls'],
        properties: {
          tool_calls: { 
            type: 'array',
            minItems: 1,
            maxItems: EXECUTION_CONSTANTS.MAX_CONCURRENT_TOOLS
          },
          approval_token: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            results: { type: 'array' },
            execution_id: { type: 'string' },
            summary: { type: 'object' }
          }
        },
        400: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    },
    preHandler: async (request, reply) => {
      // Business logic validation for execution requests
      const validation = validateExecutionRequest(request.body);
      if (!validation.valid) {
        reply.status(400).send({
          ok: false,
          results: [],
          execution_id: 'invalid_request'
        });
        return;
      }
    }
  }, async (request, reply) => {
    const executionId = generateExecutionId();
    const startTime = Date.now();
    const executionContext = {
      executionId,
      requestId: request.id,
      clientIp: request.ip,
      toolCallCount: request.body.tool_calls.length,
      hasApprovalToken: !!request.body.approval_token,
      timestamp: new Date().toISOString()
    };
    
    try {
      fastify.log.info({
        ...executionContext,
        message: 'Starting tool execution batch'
      });

      // Business logic: Validate approvals before execution
      if (requiresApproval(request.body.tool_calls)) {
        if (!request.body.approval_token) {
          reply.status(403);
          return {
            ok: false,
            results: [],
            execution_id: executionId,
            error: 'Approval token required for this execution'
          };
        }

        await validateApproval(request.body.approval_token);
        fastify.log.info({ ...executionContext, message: 'Approval token validated' });
      }

      // Execute tools with business logic patterns
      const executionResult = await executeToolBatch({
        toolCalls: request.body.tool_calls,
        executionId,
        logger: fastify.log,
        startTime
      });

      const duration = Date.now() - startTime;
      
      fastify.log.info({
        ...executionContext,
        ...executionResult.summary,
        duration,
        message: 'Tool execution batch completed'
      });

      return {
        ok: executionResult.success,
        results: executionResult.results,
        execution_id: executionId,
        summary: executionResult.summary
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      fastify.log.error({
        ...executionContext,
        error: errorMessage,
        duration,
        message: 'Execution batch failed'
      });
      
      reply.status(500);
      return {
        ok: false,
        results: [{
          status: 'error',
          error: errorMessage,
          timestamp: new Date().toISOString(),
          execution_id: executionId
        }],
        execution_id: executionId
      };
    }
  });
};

// Business logic types
interface ExecutionSummary {
  totalTools: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  duration: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  toolsUsed: string[];
}

interface ExecutionResult {
  success: boolean;
  results: any[];
  summary: ExecutionSummary;
}

/**
 * Business logic for validating execution requests
 */
function validateExecutionRequest(body: any): { valid: boolean; error?: string } {
  if (!body.tool_calls || !Array.isArray(body.tool_calls)) {
    return { valid: false, error: 'tool_calls must be an array' };
  }

  if (body.tool_calls.length === 0) {
    return { valid: false, error: 'At least one tool call is required' };
  }

  if (body.tool_calls.length > EXECUTION_CONSTANTS.MAX_CONCURRENT_TOOLS) {
    return { valid: false, error: `Maximum ${EXECUTION_CONSTANTS.MAX_CONCURRENT_TOOLS} concurrent tool calls allowed` };
  }

  // Validate each tool call structure
  for (const [index, toolCall] of body.tool_calls.entries()) {
    if (!toolCall.tool || typeof toolCall.tool !== 'string') {
      return { valid: false, error: `Tool call ${index + 1} must specify a valid tool name` };
    }

    if (!toolCall.args || typeof toolCall.args !== 'object') {
      return { valid: false, error: `Tool call ${index + 1} must include args object` };
    }
  }

  // Business rule: Check for conflicting operations
  const hasDestructiveOps = body.tool_calls.some((tc: any) => 
    ['delete', 'drop', 'truncate', 'remove'].some(op => 
      tc.tool.toLowerCase().includes(op) || 
      JSON.stringify(tc.args).toLowerCase().includes(op)
    )
  );

  const hasCreationOps = body.tool_calls.some((tc: any) => 
    ['create', 'deploy', 'add', 'insert'].some(op => 
      tc.tool.toLowerCase().includes(op) || 
      JSON.stringify(tc.args).toLowerCase().includes(op)
    )
  );

  if (hasDestructiveOps && hasCreationOps) {
    return { valid: false, error: 'Cannot mix destructive and creation operations in the same batch' };
  }

  return { valid: true };
}

/**
 * Business logic to determine if approval is required
 */
function requiresApproval(toolCalls: ToolCall[]): boolean {
  // High-risk tools that always require approval
  const highRiskTools = ['gcp', 'github', 'supabase'];
  const productionKeywords = ['prod', 'production', 'live', 'main'];

  return toolCalls.some(toolCall => {
    // Check if using high-risk tools
    if (highRiskTools.includes(toolCall.tool)) {
      return true;
    }

    // Check if operating on production resources
    const argsString = JSON.stringify(toolCall.args).toLowerCase();
    if (productionKeywords.some(keyword => argsString.includes(keyword))) {
      return true;
    }

    // Check if not a dry-run
    if (toolCall.dry_run === false) {
      return true;
    }

    return false;
  });
}

/**
 * Generate unique execution ID with business context
 */
function generateExecutionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `exec_${timestamp}_${random}`;
}

/**
 * Execute tool batch with enhanced business logic
 */
async function executeToolBatch(params: {
  toolCalls: ToolCall[];
  executionId: string;
  logger: any;
  startTime: number;
}): Promise<ExecutionResult> {
  const { toolCalls, executionId, logger, startTime } = params;
  const results: any[] = [];
  const executedTools: string[] = [];
  const failedTools: string[] = [];
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

  // Assess overall risk level for the batch
  riskLevel = assessBatchRiskLevel(toolCalls);

  // Execute each tool with proper error handling and business logic
  for (const [index, toolCall] of toolCalls.entries()) {
    const toolStartTime = Date.now();
    
    try {
      logger.info({
        message: 'Executing tool call',
        executionId,
        toolIndex: index,
        tool: toolCall.tool,
        dryRun: toolCall.dry_run,
        riskLevel
      });

      // Business logic: Check if tool exists
      const tool = tools[toolCall.tool];
      if (!tool) {
        throw new Error(`Unknown tool: ${toolCall.tool}. Available tools: ${Object.keys(tools).join(', ')}`);
      }

      // Business logic: Apply timeout based on risk level
      const timeout = riskLevel === 'HIGH' ? 
        EXECUTION_CONSTANTS.TOOL_TIMEOUT_MS * 2 : 
        EXECUTION_CONSTANTS.TOOL_TIMEOUT_MS;

      // Execute tool with timeout and retry logic
      const result = await executeWithRetry(async () => {
        return Promise.race([
          tool.run(toolCall.args, {
            dryRun: toolCall.dry_run || false,
            expectedDiff: toolCall.expect_diff,
            executionId,
            riskLevel
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Tool execution timeout')), timeout)
          )
        ]);
      }, EXECUTION_CONSTANTS.MAX_RETRY_ATTEMPTS);

      const duration = Date.now() - toolStartTime;

      results.push({
        toolIndex: index,
        tool: toolCall.tool,
        status: 'success',
        result,
        duration,
        timestamp: new Date().toISOString()
      });

      executedTools.push(toolCall.tool);

      logger.info({
        message: 'Tool execution completed successfully',
        executionId,
        tool: toolCall.tool,
        duration,
        status: 'success'
      });

    } catch (toolError) {
      const duration = Date.now() - toolStartTime;
      const errorMessage = toolError instanceof Error ? toolError.message : String(toolError);
      
      logger.error({
        message: 'Tool execution failed',
        executionId,
        tool: toolCall.tool,
        error: errorMessage,
        duration
      });

      results.push({
        toolIndex: index,
        tool: toolCall.tool,
        status: 'error',
        error: errorMessage,
        duration,
        timestamp: new Date().toISOString()
      });

      failedTools.push(toolCall.tool);

      // Business logic: Decide whether to continue or halt
      if (shouldHaltOnError(toolCall, toolCalls, riskLevel)) {
        logger.warn({
          message: 'Halting execution due to critical tool failure',
          executionId,
          failedTool: toolCall.tool,
          remainingTools: toolCalls.length - index - 1
        });
        
        // Mark remaining tools as skipped
        for (let i = index + 1; i < toolCalls.length; i++) {
          results.push({
            toolIndex: i,
            tool: toolCalls[i].tool,
            status: 'skipped',
            reason: 'Execution halted due to previous failure',
            timestamp: new Date().toISOString()
          });
        }
        break;
      }
    }
  }

  // Generate execution summary
  const summary: ExecutionSummary = {
    totalTools: toolCalls.length,
    successCount: results.filter(r => r.status === 'success').length,
    errorCount: results.filter(r => r.status === 'error').length,
    skippedCount: results.filter(r => r.status === 'skipped').length,
    duration: Date.now() - startTime,
    riskLevel,
    toolsUsed: [...new Set(executedTools)]
  };

  return {
    success: summary.errorCount === 0,
    results,
    summary
  };
}

/**
 * Assess risk level for the entire batch
 */
function assessBatchRiskLevel(toolCalls: ToolCall[]): 'LOW' | 'MEDIUM' | 'HIGH' {
  const highRiskTools = ['gcp', 'github'];
  const mediumRiskTools = ['supabase', 'shopify'];
  
  // Check for production operations
  const hasProductionOps = toolCalls.some(tc => 
    JSON.stringify(tc.args).toLowerCase().includes('prod') ||
    JSON.stringify(tc.args).toLowerCase().includes('production')
  );

  // Check for non-dry-run operations
  const hasLiveOps = toolCalls.some(tc => tc.dry_run === false);

  // Check tool risk levels
  const hasHighRiskTools = toolCalls.some(tc => highRiskTools.includes(tc.tool));
  const hasMediumRiskTools = toolCalls.some(tc => mediumRiskTools.includes(tc.tool));

  if (hasProductionOps && hasLiveOps && hasHighRiskTools) {
    return 'HIGH';
  } else if (hasLiveOps || hasHighRiskTools || (hasProductionOps && hasMediumRiskTools)) {
    return 'MEDIUM';
  } else {
    return 'LOW';
  }
}

/**
 * Determine if execution should halt on error
 */
function shouldHaltOnError(failedTool: ToolCall, allTools: ToolCall[], riskLevel: string): boolean {
  // Always halt on HIGH risk operations
  if (riskLevel === 'HIGH') {
    return true;
  }

  // Halt if failed tool is a dependency for remaining tools
  const remainingTools = allTools.slice(allTools.indexOf(failedTool) + 1);
  const criticalTools = ['github', 'gcp'];
  
  return criticalTools.includes(failedTool.tool) && 
         remainingTools.some(rt => criticalTools.includes(rt.tool));
}

/**
 * Execute function with retry logic
 */
async function executeWithRetry<T>(
  fn: () => Promise<T>, 
  maxRetries: number
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}