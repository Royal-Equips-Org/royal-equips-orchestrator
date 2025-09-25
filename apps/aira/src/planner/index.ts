/**
 * AIRA Planner - Natural Language to Structured Plans
 * 
 * Converts natural language input into deterministic execution plans
 * with proper reasoning, critique loops, and hallucination guards.
 */

import { ExecutionPlan } from '../schemas/aira.js';
import { UEGSnapshot } from '../ueg/index.ts';
/**
 * Main planner function - converts NL to structured execution plan
 */
export async function planner(
  message: string, 
  ueg: UEGSnapshot, 
  context?: Record<string, unknown>
): Promise<ExecutionPlan> {
  
  // For MVP implementation, we'll use rule-based planning
  // In production, this would integrate with OpenAI/LLM reasoning
  
  const normalizedMessage = message.toLowerCase().trim();
  
  // Analyze message intent
  const intent = analyzeIntent(normalizedMessage);
  
  // Generate plan based on intent and context
  const plan = generatePlan(intent, normalizedMessage, ueg, context);
  
  // Validate plan structure
  validatePlan(plan);
  
  return plan;
}

/**
 * Analyze user intent from natural language input
 */
function analyzeIntent(message: string): string {
  // Simple intent classification for MVP
  if (message.includes('deploy') || message.includes('release')) {
    return 'deployment';
  }
  
  if (message.includes('create') || message.includes('add') || message.includes('new')) {
    return 'creation';
  }
  
  if (message.includes('update') || message.includes('modify') || message.includes('change')) {
    return 'modification';
  }
  
  if (message.includes('delete') || message.includes('remove')) {
    return 'deletion';
  }
  
  if (message.includes('check') || message.includes('status') || message.includes('health')) {
    return 'monitoring';
  }
  
  if (message.includes('backup') || message.includes('restore')) {
    return 'data_management';
  }
  
  return 'analysis';
}

/**
 * Generate execution plan based on intent
 */
function generatePlan(
  intent: string, 
  message: string, 
  ueg: UEGSnapshot, 
  context?: Record<string, unknown>
): ExecutionPlan {
  
  switch (intent) {
    case 'deployment':
      return {
        goal: `Deploy application or service based on: ${message}`,
        actions: [
          { type: 'validate_deployment_target', args: { message, context } },
          { type: 'run_pre_deployment_checks', args: {} },
          { type: 'execute_deployment', args: { dry_run: true } },
          { type: 'verify_deployment_health', args: {} }
        ]
      };
      
    case 'creation':
      return {
        goal: `Create new resource based on: ${message}`,
        actions: [
          { type: 'analyze_creation_request', args: { message, context } },
          { type: 'validate_resource_requirements', args: {} },
          { type: 'create_resource', args: { dry_run: true } },
          { type: 'verify_resource_creation', args: {} }
        ]
      };
      
    case 'modification':
      return {
        goal: `Modify existing resource based on: ${message}`,
        actions: [
          { type: 'identify_target_resource', args: { message, context } },
          { type: 'backup_current_state', args: {} },
          { type: 'apply_modifications', args: { dry_run: true } },
          { type: 'verify_modifications', args: {} }
        ]
      };
      
    case 'deletion':
      return {
        goal: `Safely delete resource based on: ${message}`,
        actions: [
          { type: 'identify_deletion_target', args: { message, context } },
          { type: 'check_dependencies', args: {} },
          { type: 'create_backup', args: {} },
          { type: 'execute_deletion', args: { dry_run: true } }
        ]
      };
      
    case 'monitoring':
      return {
        goal: `Check system status based on: ${message}`,
        actions: [
          { type: 'gather_system_metrics', args: { message, context } },
          { type: 'analyze_health_indicators', args: {} },
          { type: 'generate_status_report', args: {} }
        ]
      };
      
    case 'data_management':
      return {
        goal: `Manage data based on: ${message}`,
        actions: [
          { type: 'identify_data_operation', args: { message, context } },
          { type: 'validate_data_access', args: {} },
          { type: 'execute_data_operation', args: { dry_run: true } },
          { type: 'verify_data_integrity', args: {} }
        ]
      };
      
    default:
      return {
        goal: `Analyze and respond to: ${message}`,
        actions: [
          { type: 'analyze_request', args: { message, context } },
          { type: 'gather_relevant_information', args: {} },
          { type: 'generate_insights', args: {} },
          { type: 'provide_recommendations', args: {} }
        ]
      };
  }
}

/**
 * Validate plan structure and requirements
 */
function validatePlan(plan: ExecutionPlan): void {
  if (!plan.goal || plan.goal.trim().length === 0) {
    throw new Error('Plan must have a valid goal');
  }
  
  if (!plan.actions || plan.actions.length === 0) {
    throw new Error('Plan must have at least one action');
  }
  
  for (const action of plan.actions) {
    if (!action.type || action.type.trim().length === 0) {
      throw new Error('All actions must have a valid type');
    }
  }
}

