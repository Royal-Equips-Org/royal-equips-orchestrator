"""
Decision Approval Engine
Manages business decision approval workflow with email reports and autonomous decisions
"""
import asyncio
import json
import logging
import os
import smtplib
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List

from ..core.agent_base import AgentBase

logger = logging.getLogger(__name__)

@dataclass
class BusinessDecision:
    """Business decision data structure"""
    decision_id: str
    decision_type: str
    title: str
    description: str
    impact_assessment: Dict[str, Any]
    confidence_score: float
    estimated_revenue_impact: float
    risk_level: str
    data_sources: List[str]
    recommended_action: str
    alternatives: List[Dict[str, Any]]
    created_at: datetime
    requires_approval: bool
    auto_executable: bool
    priority: str

@dataclass
class ApprovalRequest:
    """Approval request structure"""
    request_id: str
    decision: BusinessDecision
    status: str  # pending, approved, rejected, expired
    requested_by: str
    assigned_to: List[str]
    approval_deadline: datetime
    responses: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

class DecisionApprovalEngine(AgentBase):
    """
    Advanced decision approval system that:
    - Evaluates business decisions for autonomous execution
    - Manages approval workflows for complex decisions
    - Sends email reports for manual approval
    - Tracks decision outcomes and learns from them
    - Provides decision audit trails
    """

    def __init__(self):
        super().__init__(
            name="Decision Approval Engine",
            agent_type="decision_management",
            description="Manages business decision approval workflows and autonomous execution"
        )

        # Email configuration
        self.smtp_server = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.email_username = os.getenv('EMAIL_USERNAME')
        self.email_password = os.getenv('EMAIL_PASSWORD')
        self.approval_email = os.getenv('APPROVAL_EMAIL')

        # Decision management
        self.pending_decisions: Dict[str, BusinessDecision] = {}
        self.approval_requests: Dict[str, ApprovalRequest] = {}
        self.decision_history: List[Dict[str, Any]] = []
        self.autonomous_thresholds = {
            'confidence_score': 0.85,
            'revenue_impact': 10000,  # $10k threshold
            'risk_level': 'low'
        }

        # Learning system
        self.decision_patterns = {}
        self.success_rates = {}

    async def initialize(self):
        """Initialize decision approval engine"""
        await super().initialize()

        # Load historical decisions
        await self._load_decision_history()

        # Initialize learning models
        await self._initialize_decision_models()

        logger.info("✅ Decision Approval Engine initialized")

    async def start_autonomous_workflow(self):
        """Start autonomous decision management workflow"""
        while not self.emergency_stop:
            try:
                if self.status.value == "active":
                    # Process pending decisions
                    await self._process_pending_decisions()

                    # Check approval deadlines
                    await self._check_approval_deadlines()

                    # Update decision models
                    await self._update_decision_models()

                    # Clean up old decisions
                    await self._cleanup_old_decisions()

                    self.current_task = "Monitoring decision workflows"

                await asyncio.sleep(300)  # 5-minute cycles

            except Exception as e:
                logger.error(f"❌ Decision approval workflow error: {e}")
                await asyncio.sleep(600)

    async def evaluate_decision(self, decision_data: Dict[str, Any]) -> BusinessDecision:
        """Evaluate a business decision and determine approval requirements"""
        try:
            # Create decision object
            decision = BusinessDecision(
                decision_id=str(uuid.uuid4()),
                decision_type=decision_data.get('type', 'general'),
                title=decision_data.get('title', ''),
                description=decision_data.get('description', ''),
                impact_assessment=decision_data.get('impact_assessment', {}),
                confidence_score=decision_data.get('confidence_score', 0.0),
                estimated_revenue_impact=decision_data.get('revenue_impact', 0.0),
                risk_level=decision_data.get('risk_level', 'medium'),
                data_sources=decision_data.get('data_sources', []),
                recommended_action=decision_data.get('recommended_action', ''),
                alternatives=decision_data.get('alternatives', []),
                created_at=datetime.now(timezone.utc),
                requires_approval=False,
                auto_executable=False,
                priority='medium'
            )

            # Evaluate autonomy eligibility
            await self._evaluate_autonomy_eligibility(decision)

            # Store decision
            self.pending_decisions[decision.decision_id] = decision

            logger.info(f"📋 Decision evaluated: {decision.title} (ID: {decision.decision_id[:8]})")
            return decision

        except Exception as e:
            logger.error(f"❌ Decision evaluation failed: {e}")
            raise

    async def _evaluate_autonomy_eligibility(self, decision: BusinessDecision):
        """Evaluate if decision can be executed autonomously"""
        try:
            # Check confidence threshold
            high_confidence = decision.confidence_score >= self.autonomous_thresholds['confidence_score']

            # Check revenue impact threshold
            low_impact = abs(decision.estimated_revenue_impact) <= self.autonomous_thresholds['revenue_impact']

            # Check risk level
            low_risk = decision.risk_level == self.autonomous_thresholds['risk_level']

            # Check decision type patterns
            type_approved = await self._check_decision_type_approval(decision.decision_type)

            # Determine autonomy
            if high_confidence and low_risk and type_approved:
                decision.auto_executable = True
                decision.requires_approval = False
                decision.priority = 'low'
            elif high_confidence and low_impact:
                decision.auto_executable = True
                decision.requires_approval = True  # Notify but execute
                decision.priority = 'medium'
            else:
                decision.auto_executable = False
                decision.requires_approval = True
                decision.priority = 'high'

            logger.info(f"🤖 Decision autonomy: {decision.title} - Auto: {decision.auto_executable}, Approval: {decision.requires_approval}")

        except Exception as e:
            logger.error(f"❌ Autonomy evaluation failed: {e}")
            decision.auto_executable = False
            decision.requires_approval = True

    async def get_pending_autonomous_decisions(self) -> List[Dict[str, Any]]:
        """Get decisions ready for autonomous execution"""
        autonomous_decisions = []

        for decision in self.pending_decisions.values():
            if decision.auto_executable and not decision.requires_approval:
                autonomous_decisions.append({
                    'decision_id': decision.decision_id,
                    'type': decision.decision_type,
                    'title': decision.title,
                    'action': decision.recommended_action,
                    'confidence_score': decision.confidence_score,
                    'revenue_impact': decision.estimated_revenue_impact,
                    'data': asdict(decision)
                })

        return autonomous_decisions

    async def queue_for_approval(self, decision: BusinessDecision):
        """Queue decision for manual approval"""
        try:
            # Create approval request
            request = ApprovalRequest(
                request_id=str(uuid.uuid4()),
                decision=decision,
                status='pending',
                requested_by='empire_system',
                assigned_to=[self.approval_email] if self.approval_email else [],
                approval_deadline=datetime.now(timezone.utc) + timedelta(hours=24),
                responses=[],
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc)
            )

            self.approval_requests[request.request_id] = request

            # Send approval email
            await self._send_approval_email(request)

            logger.info(f"📧 Approval request created: {decision.title}")

        except Exception as e:
            logger.error(f"❌ Failed to queue for approval: {e}")

    async def _send_approval_email(self, request: ApprovalRequest):
        """Send approval request email"""
        if not self.email_username or not self.approval_email:
            logger.warning("⚠️ Email credentials not configured - cannot send approval email")
            return

        try:
            decision = request.decision

            # Create email content
            subject = f"🏰 Royal Equips Empire - Decision Approval Required: {decision.title}"

            html_content = f"""
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .header {{ background: linear-gradient(135deg, #FFD700, #FFA500); padding: 20px; color: white; }}
                    .decision-card {{ border: 1px solid #ddd; margin: 20px 0; padding: 20px; border-radius: 8px; }}
                    .high-impact {{ border-left: 4px solid #ff4444; }}
                    .medium-impact {{ border-left: 4px solid #ffaa00; }}
                    .low-impact {{ border-left: 4px solid #44ff44; }}
                    .metrics {{ display: flex; gap: 20px; margin: 15px 0; }}
                    .metric {{ text-align: center; padding: 10px; background: #f8f9fa; border-radius: 4px; }}
                    .actions {{ margin: 20px 0; }}
                    .approve-btn {{ background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }}
                    .reject-btn {{ background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }}
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>👑 Royal Equips Empire Command Center</h1>
                    <h2>Decision Approval Required</h2>
                </div>
                
                <div class="decision-card {self._get_impact_class(decision.estimated_revenue_impact)}">
                    <h3>{decision.title}</h3>
                    <p><strong>Type:</strong> {decision.decision_type.title()}</p>
                    <p><strong>Description:</strong> {decision.description}</p>
                    
                    <div class="metrics">
                        <div class="metric">
                            <h4>{decision.confidence_score:.1f}%</h4>
                            <p>Confidence Score</p>
                        </div>
                        <div class="metric">
                            <h4>${decision.estimated_revenue_impact:,.0f}</h4>
                            <p>Revenue Impact</p>
                        </div>
                        <div class="metric">
                            <h4>{decision.risk_level.title()}</h4>
                            <p>Risk Level</p>
                        </div>
                    </div>
                    
                    <p><strong>Recommended Action:</strong> {decision.recommended_action}</p>
                    
                    <p><strong>Data Sources:</strong> {', '.join(decision.data_sources)}</p>
                    
                    <div class="actions">
                        <a href="mailto:{self.email_username}?subject=APPROVE: {request.request_id}&body=Decision approved" class="approve-btn">✅ APPROVE</a>
                        <a href="mailto:{self.email_username}?subject=REJECT: {request.request_id}&body=Decision rejected" class="reject-btn">❌ REJECT</a>
                    </div>
                    
                    <p><small><strong>Request ID:</strong> {request.request_id}</small></p>
                    <p><small><strong>Deadline:</strong> {request.approval_deadline.strftime('%Y-%m-%d %H:%M UTC')}</small></p>
                </div>
                
                <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                    <h4>📊 Decision Impact Assessment</h4>
                    <pre>{json.dumps(decision.impact_assessment, indent=2)}</pre>
                </div>
            </body>
            </html>
            """

            # Send email
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.email_username
            msg['To'] = self.approval_email

            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)

            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.email_username, self.email_password)
                server.send_message(msg)

            logger.info(f"📧 Approval email sent for decision: {decision.title}")

        except Exception as e:
            logger.error(f"❌ Failed to send approval email: {e}")

    def _get_impact_class(self, revenue_impact: float) -> str:
        """Get CSS class based on revenue impact"""
        if abs(revenue_impact) > 50000:
            return "high-impact"
        elif abs(revenue_impact) > 10000:
            return "medium-impact"
        else:
            return "low-impact"

    async def _process_pending_decisions(self):
        """Process all pending decisions"""
        for decision_id, decision in list(self.pending_decisions.items()):
            try:
                if decision.auto_executable and not decision.requires_approval:
                    # Execute immediately
                    await self._execute_autonomous_decision(decision)
                    del self.pending_decisions[decision_id]

                elif decision.requires_approval and decision_id not in self.approval_requests:
                    # Queue for approval
                    await self.queue_for_approval(decision)

            except Exception as e:
                logger.error(f"❌ Failed to process decision {decision_id}: {e}")

    async def _execute_autonomous_decision(self, decision: BusinessDecision):
        """Execute an autonomous decision"""
        try:
            logger.info(f"🤖 Executing autonomous decision: {decision.title}")

            # Record decision execution
            execution_record = {
                'decision_id': decision.decision_id,
                'title': decision.title,
                'type': decision.decision_type,
                'executed_at': datetime.now(timezone.utc),
                'execution_method': 'autonomous',
                'confidence_score': decision.confidence_score,
                'revenue_impact': decision.estimated_revenue_impact
            }

            self.decision_history.append(execution_record)
            self.discoveries_count += 1

            # In a real implementation, this would trigger the actual business action
            # For now, we log the successful autonomous execution

        except Exception as e:
            logger.error(f"❌ Autonomous decision execution failed: {e}")

    async def _check_decision_type_approval(self, decision_type: str) -> bool:
        """Check if decision type has been approved before"""
        # Simple pattern matching - in reality, this would use ML
        approved_types = ['price_adjustment', 'inventory_reorder', 'marketing_campaign']
        return decision_type in approved_types

    async def get_daily_discoveries(self) -> int:
        """Get daily decision count"""
        today = datetime.now(timezone.utc).date()
        return len([d for d in self.decision_history if d['executed_at'].date() == today])

    # Placeholder methods for future implementation
    async def _load_decision_history(self):
        """Load historical decisions for learning"""
        pass

    async def _initialize_decision_models(self):
        """Initialize ML models for decision patterns"""
        pass

    async def _update_decision_models(self):
        """Update decision learning models"""
        pass

    async def _check_approval_deadlines(self):
        """Check for expired approval requests"""
        pass

    async def _cleanup_old_decisions(self):
        """Clean up old decision records"""
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
        self.decision_history = [
            d for d in self.decision_history
            if d['executed_at'] > cutoff_date
        ]
