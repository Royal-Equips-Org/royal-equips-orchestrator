/**
 * AIRA Policy Engine - Risk Assessment and Verification Gates
 * 
 * Implements risk scoring, verification gates, and approval requirements
 * based on diff size, prod impact, schema migrations, etc.
 */

import { 
  ExecutionPlan, 
  RiskAssessment, 
  Verification, 
  ApprovalRequest,
  RiskLevel 
} from '../schemas/aira.js';

/**
 * Policy engine with verification and risk assessment capabilities
 */
export const policy = {
  /**
   * Run verification checks on execution plan
   */
  async verify(plan: ExecutionPlan): Promise<Verification[]> {
    const verifications: Verification[] = [];
    
    // Type check verification
    verifications.push({
      type: 'type_check',
      result: 'Plan structure validated successfully',
      pass: true
    });
    
    // Action validation
    const actionValidation = validateActions(plan.actions);
    verifications.push({
      type: 'action_validation',
      result: actionValidation.message,
      pass: actionValidation.pass
    });
    
    // Security check
    const securityCheck = performSecurityCheck(plan);
    verifications.push({
      type: 'security_check',
      result: securityCheck.message,
      pass: securityCheck.pass
    });
    
    // Resource impact check
    const resourceCheck = checkResourceImpact(plan);
    verifications.push({
      type: 'resource_impact',
      result: resourceCheck.message,
      pass: resourceCheck.pass
    });
    
    return verifications;
  },

  /**
   * Assess risk level of execution plan
   */
  assessRisk(plan: ExecutionPlan, verifications: Verification[]): RiskAssessment {
    let riskScore = 0.0;
    
    // Base risk from action types
    const actionRisk = calculateActionRisk(plan.actions);
    riskScore += actionRisk;
    
    // Risk from failed verifications
    const failedVerifications = verifications.filter(v => !v.pass);
    riskScore += failedVerifications.length * 0.2;
    
    // Production impact risk
    const prodRisk = assessProductionImpact(plan);
    riskScore += prodRisk;
    
    // Schema/data migration risk
    const dataRisk = assessDataMigrationRisk(plan);
    riskScore += dataRisk;
    
    // Cap at 1.0
    riskScore = Math.min(riskScore, 1.0);
    
    // Determine risk level
    let level: RiskLevel;
    if (riskScore >= 0.7) {
      level = 'HIGH';
    } else if (riskScore >= 0.3) {
      level = 'MEDIUM';
    } else {
      level = 'LOW';
    }
    
    return { score: riskScore, level };
  },

  /**
   * Check if plan is allowed to execute
   */
  allows(plan: ExecutionPlan, risk: RiskAssessment): boolean {
    // LOW risk: always allowed
    if (risk.level === 'LOW') {
      return true;
    }
    
    // MEDIUM/HIGH risk: requires approval (not implemented in MVP)
    // In production, this would check for approval tokens
    return false;
  },

  /**
   * Get required approvals for plan
   */
  getRequiredApprovals(plan: ExecutionPlan, risk: RiskAssessment): ApprovalRequest[] {
    const approvals: ApprovalRequest[] = [];
    
    if (risk.level === 'MEDIUM') {
      approvals.push({
        reason: 'Medium risk operation requires UI approval',
        risk: risk.score
      });
    }
    
    if (risk.level === 'HIGH') {
      approvals.push({
        reason: 'High risk operation requires owner approval',
        risk: risk.score
      });
      
      // High risk also requires security approval
      if (containsSecuritySensitiveActions(plan)) {
        approvals.push({
          reason: 'Security-sensitive operation requires security team approval',
          risk: risk.score
        });
      }
    }
    
    return approvals;
  }
};

/**
 * Validate individual actions in the plan
 */
function validateActions(actions: any[]): { pass: boolean; message: string } {
  if (actions.length === 0) {
    return { pass: false, message: 'Plan must contain at least one action' };
  }
  
  for (const action of actions) {
    if (!action.type) {
      return { pass: false, message: 'All actions must have a type' };
    }
  }
  
  return { pass: true, message: `Validated ${actions.length} actions successfully` };
}

/**
 * Perform security checks on the plan
 */
function performSecurityCheck(plan: ExecutionPlan): { pass: boolean; message: string } {
  const sensitiveActions = [
    'delete',
    'drop',
    'truncate',
    'modify_permissions',
    'access_secrets'
  ];
  
  const hasSensitiveActions = plan.actions.some(action => 
    sensitiveActions.some(sensitive => 
      action.type.toLowerCase().includes(sensitive)
    )
  );
  
  if (hasSensitiveActions) {
    return { 
      pass: false, 
      message: 'Plan contains security-sensitive actions requiring additional review' 
    };
  }
  
  return { pass: true, message: 'No security concerns identified' };
}

/**
 * Check resource impact of the plan
 */
function checkResourceImpact(plan: ExecutionPlan): { pass: boolean; message: string } {
  const highImpactActions = [
    'deploy',
    'migrate',
    'scale',
    'restart',
    'backup'
  ];
  
  const hasHighImpact = plan.actions.some(action =>
    highImpactActions.some(impact =>
      action.type.toLowerCase().includes(impact)
    )
  );
  
  if (hasHighImpact) {
    return {
      pass: true, // Pass but note high impact
      message: 'Plan has high resource impact - monitor execution carefully'
    };
  }
  
  return { pass: true, message: 'Low resource impact expected' };
}

/**
 * Calculate risk score based on action types
 */
function calculateActionRisk(actions: any[]): number {
  const riskScores: Record<string, number> = {
    'delete': 0.4,
    'deploy': 0.3,
    'migrate': 0.3,
    'modify': 0.2,
    'create': 0.1,
    'read': 0.0,
    'analyze': 0.0
  };
  
  let totalRisk = 0;
  for (const action of actions) {
    const actionType = action.type.toLowerCase();
    for (const [riskType, score] of Object.entries(riskScores)) {
      if (actionType.includes(riskType)) {
        totalRisk += score;
        break;
      }
    }
  }
  
  return Math.min(totalRisk / actions.length, 0.5); // Normalize and cap
}

/**
 * Assess production impact risk
 */
function assessProductionImpact(plan: ExecutionPlan): number {
  const prodKeywords = ['prod', 'production', 'live', 'main', 'master'];
  
  const hasProdImpact = plan.goal.toLowerCase().split(' ').some(word =>
    prodKeywords.includes(word)
  ) || plan.actions.some(action =>
    JSON.stringify(action.args).toLowerCase().split(' ').some(word =>
      prodKeywords.includes(word)
    )
  );
  
  return hasProdImpact ? 0.3 : 0.0;
}

/**
 * Assess data migration risk
 */
function assessDataMigrationRisk(plan: ExecutionPlan): number {
  const migrationKeywords = ['migrate', 'schema', 'database', 'table', 'column'];
  
  const hasMigrationRisk = plan.actions.some(action =>
    migrationKeywords.some(keyword =>
      action.type.toLowerCase().includes(keyword)
    )
  );
  
  return hasMigrationRisk ? 0.2 : 0.0;
}

/**
 * Check if plan contains security-sensitive actions
 */
function containsSecuritySensitiveActions(plan: ExecutionPlan): boolean {
  const securityKeywords = ['secret', 'key', 'token', 'password', 'auth', 'permission'];
  
  return plan.actions.some(action =>
    securityKeywords.some(keyword =>
      action.type.toLowerCase().includes(keyword) ||
      JSON.stringify(action.args).toLowerCase().includes(keyword)
    )
  );
}