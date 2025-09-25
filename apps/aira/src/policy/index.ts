/**
 * AIRA Policy Engine - Risk Assessment and Verification Gates
 * 
 * Implements enterprise-grade risk scoring, verification gates, and approval requirements
 * with configurable business logic patterns and comprehensive validation.
 */

import { 
  ExecutionPlan, 
  RiskAssessment, 
  Verification, 
  ApprovalRequest,
  RiskLevel,
  Action
} from '../schemas/aira.js';

// Business configuration for policy engine
const POLICY_CONFIG = {
  RISK_THRESHOLDS: {
    LOW: 0.3,
    MEDIUM: 0.7
  },
  WEIGHTS: {
    ACTION_RISK: 0.4,
    VERIFICATION_FAILURES: 0.2,
    PRODUCTION_IMPACT: 0.3,
    DATA_MIGRATION_RISK: 0.1
  },
  MAX_VERIFICATION_TIME_MS: 10000,
  SECURITY_PATTERNS: [
    'secret', 'key', 'token', 'password', 'auth', 'permission', 'oauth', 'jwt'
  ],
  DESTRUCTIVE_PATTERNS: [
    'delete', 'drop', 'truncate', 'remove', 'destroy', 'wipe', 'purge'
  ],
  HIGH_IMPACT_PATTERNS: [
    'deploy', 'migrate', 'scale', 'restart', 'backup', 'restore', 'failover'
  ]
} as const;

/**
 * Enhanced policy engine with enterprise business logic patterns
 */
export const policy = {
  /**
   * Run comprehensive verification checks on execution plan
   */
  async verify(plan: ExecutionPlan): Promise<Verification[]> {
    const verifications: Verification[] = [];
    const startTime = Date.now();
    
    try {
      // Parallel verification execution for better performance
      const verificationPromises = [
        runTypeCheck(plan),
        runActionValidation(plan),
        runSecurityCheck(plan),
        runResourceImpactCheck(plan),
        runComplianceCheck(plan),
        runDependencyCheck(plan)
      ];

      const results = await Promise.allSettled(verificationPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          verifications.push(result.value);
        } else {
          verifications.push({
            type: `verification_${index}`,
            result: `Verification failed: ${result.reason}`,
            pass: false
          });
        }
      });

      // Add performance verification
      const duration = Date.now() - startTime;
      verifications.push({
        type: 'performance_check',
        result: `Verification completed in ${duration}ms`,
        pass: duration < POLICY_CONFIG.MAX_VERIFICATION_TIME_MS
      });

    } catch (error) {
      verifications.push({
        type: 'verification_error',
        result: `Verification system error: ${error instanceof Error ? error.message : String(error)}`,
        pass: false
      });
    }
    
    return verifications;
  },

  /**
   * Enhanced risk assessment with weighted scoring
   */
  assessRisk(plan: ExecutionPlan, verifications: Verification[]): RiskAssessment {
    const riskComponents = {
      actionRisk: calculateActionRisk(plan.actions) * POLICY_CONFIG.WEIGHTS.ACTION_RISK,
      verificationRisk: calculateVerificationRisk(verifications) * POLICY_CONFIG.WEIGHTS.VERIFICATION_FAILURES,
      productionRisk: assessProductionImpact(plan) * POLICY_CONFIG.WEIGHTS.PRODUCTION_IMPACT,
      dataRisk: assessDataMigrationRisk(plan) * POLICY_CONFIG.WEIGHTS.DATA_MIGRATION_RISK
    };

    // Calculate weighted risk score
    const totalRisk = Object.values(riskComponents).reduce((sum, risk) => sum + risk, 0);
    const riskScore = Math.min(totalRisk, 1.0);
    
    // Determine risk level with business logic
    let level: RiskLevel;
    if (riskScore >= POLICY_CONFIG.RISK_THRESHOLDS.MEDIUM) {
      level = 'HIGH';
    } else if (riskScore >= POLICY_CONFIG.RISK_THRESHOLDS.LOW) {
      level = 'MEDIUM';
    } else {
      level = 'LOW';
    }

    // Business rule: Override to HIGH if critical patterns detected
    if (containsCriticalPatterns(plan)) {
      level = 'HIGH';
    }
    
    return { 
      score: riskScore, 
      level,
      components: riskComponents // For debugging and transparency
    };
  },

  /**
   * Enhanced execution permission logic
   */
  allows(plan: ExecutionPlan, risk: RiskAssessment): boolean {
    // Business rules for execution permission
    if (risk.level === 'HIGH') {
      return false; // HIGH risk always requires approval
    }

    if (risk.level === 'MEDIUM') {
      // Medium risk requires approval unless it's a read-only operation
      return isReadOnlyOperation(plan);
    }
    
    // LOW risk: check for additional constraints
    return !containsDestructiveActions(plan) && !hasProductionTarget(plan);
  },

  /**
   * Generate contextual approval requirements
   */
  getRequiredApprovals(plan: ExecutionPlan, risk: RiskAssessment): ApprovalRequest[] {
    const approvals: ApprovalRequest[] = [];
    
    // Business logic for approval requirements
    if (risk.level === 'MEDIUM') {
      approvals.push({
        reason: 'Medium risk operation requires UI approval',
        risk: risk.score,
        approver_role: 'operator',
        estimated_time: '2-5 minutes'
      });

      // Additional approvals for specific scenarios
      if (hasProductionTarget(plan)) {
        approvals.push({
          reason: 'Production environment access requires lead approval',
          risk: risk.score,
          approver_role: 'team_lead',
          estimated_time: '5-15 minutes'
        });
      }
    }
    
    if (risk.level === 'HIGH') {
      approvals.push({
        reason: 'High risk operation requires owner approval',
        risk: risk.score,
        approver_role: 'owner',
        estimated_time: '15-30 minutes'
      });
      
      // Security approval for sensitive operations
      if (containsSecuritySensitiveActions(plan)) {
        approvals.push({
          reason: 'Security-sensitive operation requires security team approval',
          risk: risk.score,
          approver_role: 'security_team',
          estimated_time: '30-60 minutes'
        });
      }

      // Compliance approval for regulated operations
      if (containsComplianceRelevantActions(plan)) {
        approvals.push({
          reason: 'Compliance-regulated operation requires compliance officer approval',
          risk: risk.score,
          approver_role: 'compliance_officer',
          estimated_time: '1-2 hours'
        });
      }
    }
    
    return approvals;
  },

  /**
   * Get policy configuration for transparency
   */
  getConfiguration() {
    return POLICY_CONFIG;
  }
};

/**
 * Enhanced verification functions with business logic
 */
async function runTypeCheck(plan: ExecutionPlan): Promise<Verification> {
  // Enhanced type checking with business validation
  if (!plan || typeof plan !== 'object') {
    return { type: 'type_check', result: 'Plan must be a valid object', pass: false };
  }

  if (!plan.goal || typeof plan.goal !== 'string' || plan.goal.trim().length === 0) {
    return { type: 'type_check', result: 'Plan must have a valid goal', pass: false };
  }

  if (!Array.isArray(plan.actions) || plan.actions.length === 0) {
    return { type: 'type_check', result: 'Plan must contain at least one action', pass: false };
  }

  // Business rule: Check goal clarity
  if (plan.goal.length < 10) {
    return { type: 'type_check', result: 'Plan goal should be more descriptive (minimum 10 characters)', pass: false };
  }

  return { type: 'type_check', result: 'Plan structure validated successfully', pass: true };
}

async function runActionValidation(plan: ExecutionPlan): Promise<Verification> {
  const issues: string[] = [];
  
  for (const [index, action] of plan.actions.entries()) {
    if (!action.type || typeof action.type !== 'string') {
      issues.push(`Action ${index + 1}: Missing or invalid type`);
    }

    if (action.type && action.type.length < 3) {
      issues.push(`Action ${index + 1}: Action type too short`);
    }

    // Business rule: Validate action arguments
    if (action.args && typeof action.args !== 'object') {
      issues.push(`Action ${index + 1}: Arguments must be an object`);
    }
  }

  if (issues.length > 0) {
    return { 
      type: 'action_validation', 
      result: `Validation issues: ${issues.join('; ')}`, 
      pass: false 
    };
  }

  return { 
    type: 'action_validation', 
    result: `Validated ${plan.actions.length} actions successfully`, 
    pass: true 
  };
}

async function runSecurityCheck(plan: ExecutionPlan): Promise<Verification> {
  const securityIssues: string[] = [];
  
  // Check for security-sensitive patterns
  const planString = JSON.stringify(plan).toLowerCase();
  const foundPatterns = POLICY_CONFIG.SECURITY_PATTERNS.filter(pattern => 
    planString.includes(pattern)
  );

  if (foundPatterns.length > 0) {
    securityIssues.push(`Contains security-sensitive keywords: ${foundPatterns.join(', ')}`);
  }

  // Check for destructive patterns
  const destructivePatterns = POLICY_CONFIG.DESTRUCTIVE_PATTERNS.filter(pattern => 
    planString.includes(pattern)
  );

  if (destructivePatterns.length > 0) {
    securityIssues.push(`Contains potentially destructive operations: ${destructivePatterns.join(', ')}`);
  }

  // Business rule: Flag suspicious combinations
  if (foundPatterns.includes('secret') && destructivePatterns.length > 0) {
    securityIssues.push('Dangerous combination: secret operations with destructive actions');
  }

  if (securityIssues.length > 0) {
    return { 
      type: 'security_check', 
      result: `Security concerns: ${securityIssues.join('; ')}`, 
      pass: false 
    };
  }

  return { type: 'security_check', result: 'No security concerns identified', pass: true };
}

async function runResourceImpactCheck(plan: ExecutionPlan): Promise<Verification> {
  const planString = JSON.stringify(plan).toLowerCase();
  const highImpactPatterns = POLICY_CONFIG.HIGH_IMPACT_PATTERNS.filter(pattern => 
    planString.includes(pattern)
  );

  if (highImpactPatterns.length > 0) {
    return {
      type: 'resource_impact',
      result: `High resource impact operations detected: ${highImpactPatterns.join(', ')} - monitor execution carefully`,
      pass: true
    };
  }

  return { type: 'resource_impact', result: 'Low resource impact expected', pass: true };
}

async function runComplianceCheck(plan: ExecutionPlan): Promise<Verification> {
  // Business logic for compliance checking
  const complianceKeywords = ['pii', 'gdpr', 'hipaa', 'financial', 'audit', 'retention'];
  const planString = JSON.stringify(plan).toLowerCase();
  
  const complianceFlags = complianceKeywords.filter(keyword => 
    planString.includes(keyword)
  );

  if (complianceFlags.length > 0) {
    return {
      type: 'compliance_check',
      result: `Compliance-relevant operations detected: ${complianceFlags.join(', ')} - additional review may be required`,
      pass: true
    };
  }

  return { type: 'compliance_check', result: 'No compliance concerns identified', pass: true };
}

async function runDependencyCheck(plan: ExecutionPlan): Promise<Verification> {
  // Business logic for checking action dependencies
  const actionTypes = plan.actions.map(a => a.type);
  const issues: string[] = [];

  // Check for logical dependencies
  if (actionTypes.includes('execute_deployment') && !actionTypes.includes('validate_deployment_target')) {
    issues.push('Deployment execution without validation');
  }

  if (actionTypes.includes('delete') && !actionTypes.includes('backup')) {
    issues.push('Destructive operation without backup');
  }

  if (issues.length > 0) {
    return {
      type: 'dependency_check',
      result: `Dependency issues: ${issues.join('; ')}`,
      pass: false
    };
  }

  return { type: 'dependency_check', result: 'Action dependencies validated', pass: true };
}

/**
 * Enhanced risk calculation functions
 */
function calculateActionRisk(actions: Action[]): number {
  const riskScores: Record<string, number> = {
    'delete': 0.8,
    'drop': 0.9,
    'truncate': 0.7,
    'deploy': 0.6,
    'migrate': 0.5,
    'scale': 0.4,
    'modify': 0.3,
    'create': 0.2,
    'read': 0.0,
    'analyze': 0.1
  };
  
  let totalRisk = 0;
  let maxRisk = 0;
  
  for (const action of actions) {
    const actionType = action.type.toLowerCase();
    let actionRisk = 0;
    
    for (const [riskType, score] of Object.entries(riskScores)) {
      if (actionType.includes(riskType)) {
        actionRisk = Math.max(actionRisk, score);
      }
    }
    
    totalRisk += actionRisk;
    maxRisk = Math.max(maxRisk, actionRisk);
  }
  
  // Combine average and maximum risk for better assessment
  const averageRisk = totalRisk / actions.length;
  return (averageRisk * 0.7) + (maxRisk * 0.3);
}

function calculateVerificationRisk(verifications: Verification[]): number {
  if (verifications.length === 0) return 0.5; // No verifications is risky
  
  const failedCount = verifications.filter(v => !v.pass).length;
  return failedCount / verifications.length;
}

function assessProductionImpact(plan: ExecutionPlan): number {
  const prodKeywords = ['prod', 'production', 'live', 'main', 'master', 'release'];
  const planString = JSON.stringify(plan).toLowerCase();
  
  const matchCount = prodKeywords.filter(keyword => planString.includes(keyword)).length;
  return Math.min(matchCount * 0.2, 0.8); // Scale impact
}

function assessDataMigrationRisk(plan: ExecutionPlan): number {
  const migrationKeywords = ['migrate', 'schema', 'database', 'table', 'column', 'index', 'constraint'];
  const planString = JSON.stringify(plan).toLowerCase();
  
  const matchCount = migrationKeywords.filter(keyword => planString.includes(keyword)).length;
  return Math.min(matchCount * 0.15, 0.6);
}

/**
 * Business logic helper functions
 */
function containsCriticalPatterns(plan: ExecutionPlan): boolean {
  const criticalCombinations = [
    ['delete', 'production'],
    ['drop', 'database'],
    ['truncate', 'table'],
    ['modify', 'permissions']
  ];
  
  const planString = JSON.stringify(plan).toLowerCase();
  
  return criticalCombinations.some(combination => 
    combination.every(keyword => planString.includes(keyword))
  );
}

function isReadOnlyOperation(plan: ExecutionPlan): boolean {
  const readOnlyPatterns = ['read', 'get', 'list', 'view', 'show', 'describe', 'analyze', 'check'];
  const planString = JSON.stringify(plan).toLowerCase();
  
  return readOnlyPatterns.some(pattern => planString.includes(pattern)) &&
         !POLICY_CONFIG.DESTRUCTIVE_PATTERNS.some(pattern => planString.includes(pattern));
}

function containsDestructiveActions(plan: ExecutionPlan): boolean {
  const planString = JSON.stringify(plan).toLowerCase();
  return POLICY_CONFIG.DESTRUCTIVE_PATTERNS.some(pattern => planString.includes(pattern));
}

function hasProductionTarget(plan: ExecutionPlan): boolean {
  const prodKeywords = ['prod', 'production', 'live'];
  const planString = JSON.stringify(plan).toLowerCase();
  return prodKeywords.some(keyword => planString.includes(keyword));
}

function containsSecuritySensitiveActions(plan: ExecutionPlan): boolean {
  const planString = JSON.stringify(plan).toLowerCase();
  return POLICY_CONFIG.SECURITY_PATTERNS.some(pattern => planString.includes(pattern));
}

function containsComplianceRelevantActions(plan: ExecutionPlan): boolean {
  const complianceKeywords = ['pii', 'gdpr', 'hipaa', 'audit', 'financial', 'personal'];
  const planString = JSON.stringify(plan).toLowerCase();
  return complianceKeywords.some(keyword => planString.includes(keyword));
}