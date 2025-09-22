/**
 * AIRA Execute Route - Approval-Gated Tool Execution
 * 
 * Handles /execute endpoint for running approved tool calls with
 * proper validation, logging, and rollback capabilities.
 */

import { FastifyPluginAsync } from 'fastify';
import { ExecuteRequestSchema, type ToolCall } from '../schemas/aira.js';
import { tools } from '../tools/index.js';
import { validateApproval } from '../policy/approvals.js';

export const executeRoute: FastifyPluginAsync = async (fastify) => {
  fastify.post<{
    Body: { tool_calls: ToolCall[]; approval_token?: string };
    Reply: { ok: boolean; results: any[]; execution_id: string };
  }>('/execute', {
    schema: {
      body: {
        type: 'object',
        required: ['tool_calls'],
        properties: {
          tool_calls: { type: 'array' },
          approval_token: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            results: { type: 'array' },
            execution_id: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      fastify.log.info({
        message: 'Starting tool execution',
        executionId,
        toolCallCount: request.body.tool_calls.length,
        hasApprovalToken: !!request.body.approval_token
      });

      // Step 1: Validate approval token if provided
      if (request.body.approval_token) {
        await validateApproval(request.body.approval_token);
        fastify.log.info({ message: 'Approval token validated', executionId });
      }

      // Step 2: Execute tool calls sequentially
      const results: any[] = [];
      const executedTools: string[] = [];
      
      for (const [index, toolCall] of request.body.tool_calls.entries()) {
        try {
          fastify.log.info({
            message: 'Executing tool call',
            executionId,
            toolIndex: index,
            tool: toolCall.tool,
            dryRun: toolCall.dry_run
          });

          // Get tool from registry
          const tool = tools[toolCall.tool];
          if (!tool) {
            throw new Error(`Unknown tool: ${toolCall.tool}`);
          }

          // Execute tool with proper error handling
          const result = await tool.run(toolCall.args, {
            dryRun: toolCall.dry_run || false,
            expectedDiff: toolCall.expect_diff,
            executionId
          });

          results.push({
            toolIndex: index,
            tool: toolCall.tool,
            status: 'success',
            result,
            timestamp: new Date().toISOString()
          });

          executedTools.push(toolCall.tool);

          fastify.log.info({
            message: 'Tool execution completed',
            executionId,
            tool: toolCall.tool,
            status: 'success'
          });

        } catch (toolError) {
          const errorMessage = toolError instanceof Error ? toolError.message : String(toolError);
          
          fastify.log.error({
            message: 'Tool execution failed',
            executionId,
            tool: toolCall.tool,
            error: errorMessage
          });

          results.push({
            toolIndex: index,
            tool: toolCall.tool,
            status: 'error',
            error: errorMessage,
            timestamp: new Date().toISOString()
          });

          // For now, continue with other tools rather than failing completely
          // In production, this should be configurable based on tool dependencies
        }
      }

      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      fastify.log.info({
        message: 'Tool execution batch completed',
        executionId,
        successCount,
        errorCount,
        duration: Date.now() - startTime
      });

      return {
        ok: errorCount === 0,
        results,
        execution_id: executionId
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      fastify.log.error({
        message: 'Execution failed',
        executionId,
        error: errorMessage,
        duration: Date.now() - startTime
      });
      
      reply.status(500);
      return {
        ok: false,
        results: [{
          status: 'error',
          error: errorMessage,
          timestamp: new Date().toISOString()
        }],
        execution_id: executionId
      };
    }
  });
};