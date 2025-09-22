/**
 * AIRA JSON Schemas - Strict schemas for deterministic responses
 * Based on the specification requirements for structured plan output with enhanced business logic
 */

import { z } from 'zod';

// Risk levels as per specification
export const RiskLevel = z.enum(['LOW', 'MEDIUM', 'HIGH']);

// Action schema for execution plans
export const ActionSchema = z.object({
  type: z.string().describe('Type of action to execute'),
  args: z.record(z.unknown()).describe('Action arguments'),
  dry_run: z.boolean().optional().describe('Whether this is a dry run')
});

// Tool call schema for external integrations
export const ToolCallSchema = z.object({
  tool: z.string().describe('Tool identifier (github, gcp, supabase, etc.)'),
  args: z.record(z.unknown()).describe('Tool-specific arguments'),
  expect_diff: z.string().optional().describe('Expected diff from this tool call'),
  dry_run: z.boolean().optional().default(false).describe('Whether this is a dry run')
});

// Verification result schema
export const VerificationSchema = z.object({
  type: z.string().describe('Type of verification (lint, test, build, etc.)'),
  result: z.string().describe('Verification result description'),
  pass: z.boolean().describe('Whether verification passed')
});

// Enhanced approval request schema with business context
export const ApprovalRequestSchema = z.object({
  reason: z.string().describe('Reason approval is needed'),
  risk: z.number().min(0).max(1).describe('Risk score (0-1)'),
  approver_role: z.string().optional().describe('Required approver role'),
  estimated_time: z.string().optional().describe('Estimated approval time')
});

// Execution plan schema
export const ExecutionPlanSchema = z.object({
  goal: z.string().describe('High-level goal of the plan'),
  actions: z.array(ActionSchema).describe('List of actions to execute')
});

// Enhanced risk assessment schema with components
export const RiskAssessmentSchema = z.object({
  score: z.number().min(0).max(1).describe('Risk score (0-1)'),
  level: RiskLevel.describe('Risk level classification'),
  components: z.record(z.number()).optional().describe('Risk component breakdown')
});

// Main AIRA Response schema - the core contract
export const AIRAResponseSchema = z.object({
  plan: ExecutionPlanSchema.describe('Execution plan generated from user input'),
  risk: RiskAssessmentSchema.describe('Risk assessment for the plan'),
  verifications: z.array(VerificationSchema).describe('Verification checks performed'),
  approvals: z.array(ApprovalRequestSchema).optional().describe('Required approvals'),
  tool_calls: z.array(ToolCallSchema).optional().describe('Tool calls to execute'),
  next_ui_steps: z.array(z.string()).optional().describe('Suggested next steps for UI'),
  thoughts: z.object({
    redacted: z.string().optional().describe('Internal reasoning (redacted for security)')
  }).optional()
});

// Chat request schema with enhanced validation
export const ChatRequestSchema = z.object({
  message: z.string().min(3).max(2000).describe('Natural language input from user'),
  context: z.record(z.unknown()).optional().describe('Additional context')
});

// Execute request schema with enhanced validation
export const ExecuteRequestSchema = z.object({
  tool_calls: z.array(ToolCallSchema).min(1).max(5).describe('Tool calls to execute'),
  approval_token: z.string().optional().describe('Approval token for gated execution')
});

// Tool execution options schema
export const ToolExecutionOptionsSchema = z.object({
  dryRun: z.boolean().default(false),
  expectedDiff: z.string().optional(),
  executionId: z.string(),
  riskLevel: RiskLevel.optional()
});

// Execution summary schema for business reporting
export const ExecutionSummarySchema = z.object({
  totalTools: z.number(),
  successCount: z.number(),
  errorCount: z.number(),
  skippedCount: z.number(),
  duration: z.number(),
  riskLevel: RiskLevel,
  toolsUsed: z.array(z.string())
});

// Error response schema
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  timestamp: z.string(),
  requestId: z.string().optional(),
  retryAfter: z.number().optional()
});

// Chat response schema for Command Center integration
export const ChatResponseSchema = z.object({
  content: z.string(),
  agent_name: z.string(),
  plan: z.any().optional(),
  risk: z.any().optional(),
  verifications: z.array(z.any()).optional(),
  approvals: z.array(z.any()).optional(),
  tool_calls: z.array(z.any()).optional(),
  next_steps: z.array(z.string()).optional()
});

// Execute response schema
export const ExecuteResponseSchema = z.object({
  ok: z.boolean(),
  results: z.array(z.any()),
  execution_id: z.string(),
  summary: ExecutionSummarySchema.optional()
});

// Export types
export type RiskLevel = z.infer<typeof RiskLevel>;
export type Action = z.infer<typeof ActionSchema>;
export type ToolCall = z.infer<typeof ToolCallSchema>;
export type Verification = z.infer<typeof VerificationSchema>;
export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;
export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>;
export type AIRAResponse = z.infer<typeof AIRAResponseSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ExecuteRequest = z.infer<typeof ExecuteRequestSchema>;
export type ToolExecutionOptions = z.infer<typeof ToolExecutionOptionsSchema>;
export type ExecutionSummary = z.infer<typeof ExecutionSummarySchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type ExecuteResponse = z.infer<typeof ExecuteResponseSchema>;