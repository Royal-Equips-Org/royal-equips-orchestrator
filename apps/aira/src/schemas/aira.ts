/**
 * AIRA JSON Schemas - Strict schemas for deterministic responses
 * Based on the specification requirements for structured plan output
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

// Approval request schema
export const ApprovalRequestSchema = z.object({
  reason: z.string().describe('Reason approval is needed'),
  risk: z.number().min(0).max(1).describe('Risk score (0-1)')
});

// Execution plan schema
export const ExecutionPlanSchema = z.object({
  goal: z.string().describe('High-level goal of the plan'),
  actions: z.array(ActionSchema).describe('List of actions to execute')
});

// Risk assessment schema
export const RiskAssessmentSchema = z.object({
  score: z.number().min(0).max(1).describe('Risk score (0-1)'),
  level: RiskLevel.describe('Risk level classification')
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

// Chat request schema
export const ChatRequestSchema = z.object({
  message: z.string().describe('Natural language input from user'),
  context: z.record(z.unknown()).optional().describe('Additional context')
});

// Execute request schema  
export const ExecuteRequestSchema = z.object({
  tool_calls: z.array(ToolCallSchema).describe('Tool calls to execute'),
  approval_token: z.string().optional().describe('Approval token for gated execution')
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