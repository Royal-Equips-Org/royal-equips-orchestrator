"""Automated pricing rules engine.

This module provides an automated pricing rules system that can apply
AI recommendations based on confidence thresholds and business rules.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Callable, Dict, List, Optional

from orchestrator.services.ai_pricing_service import (
    AIPricingService,
    PriceRecommendation,
)


class RuleAction(Enum):
    """Actions that can be taken by pricing rules."""
    APPLY_IMMEDIATELY = "apply_immediately"
    APPLY_WITH_APPROVAL = "apply_with_approval"
    NOTIFY_ONLY = "notify_only"
    IGNORE = "ignore"


class PriceChangeStatus(Enum):
    """Status of price change applications."""
    PENDING = "pending"
    APPLIED = "applied"
    REJECTED = "rejected"
    EXPIRED = "expired"
    MANUAL_REVIEW = "manual_review"


@dataclass
class PricingRule:
    """Automated pricing rule configuration."""
    rule_id: str
    name: str
    description: str

    # Conditions
    min_confidence: float  # Minimum AI confidence to trigger
    max_confidence: float = 1.0  # Maximum confidence to apply rule
    product_categories: List[str] = field(default_factory=list)  # Product categories to apply to
    excluded_products: List[str] = field(default_factory=list)  # Products to exclude

    # Price change limits
    max_price_increase: float = 0.20  # Maximum 20% price increase
    max_price_decrease: float = 0.30  # Maximum 30% price decrease
    min_price: Optional[float] = None  # Minimum allowed price
    max_price: Optional[float] = None  # Maximum allowed price

    # Timing constraints
    max_changes_per_day: int = 3  # Maximum price changes per product per day
    cooldown_hours: int = 6  # Hours to wait between changes
    active_hours: List[int] = field(default_factory=lambda: list(range(24)))  # Hours when rule is active

    # Action to take
    action: RuleAction = RuleAction.APPLY_WITH_APPROVAL

    # Business constraints
    require_margin_check: bool = True  # Check profit margins before applying
    min_profit_margin: float = 0.15  # Minimum profit margin to maintain

    enabled: bool = True
    priority: int = 100  # Lower numbers = higher priority


@dataclass
class PriceChangeRequest:
    """Request for a price change."""
    request_id: str
    product_id: str
    current_price: float
    recommended_price: float
    recommendation: PriceRecommendation
    applicable_rules: List[PricingRule]
    status: PriceChangeStatus
    created_at: datetime
    applied_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    applied_by_rule: Optional[str] = None
    manual_approval_required: bool = False
    approval_reason: str = ""


class AutomatedPricingEngine:
    """Automated pricing rules engine."""

    def __init__(self, ai_pricing_service: AIPricingService):
        """Initialize the pricing engine.
        
        Args:
            ai_pricing_service: AI pricing service for generating recommendations
        """
        self.ai_service = ai_pricing_service
        self.logger = logging.getLogger(__name__)

        # Rules and tracking
        self.rules: Dict[str, PricingRule] = {}
        self.price_change_requests: Dict[str, PriceChangeRequest] = {}
        self.price_change_history: Dict[str, List[Dict[str, Any]]] = {}  # Product -> change history

        # Callbacks
        self.price_update_callbacks: List[Callable[[str, float, float], None]] = []
        self.approval_required_callbacks: List[Callable[[PriceChangeRequest], None]] = []

    def add_rule(self, rule: PricingRule) -> None:
        """Add a pricing rule."""
        self.rules[rule.rule_id] = rule
        self.logger.info(f"Added pricing rule: {rule.name}")

    def remove_rule(self, rule_id: str) -> None:
        """Remove a pricing rule."""
        if rule_id in self.rules:
            del self.rules[rule_id]
            self.logger.info(f"Removed pricing rule: {rule_id}")

    def add_price_update_callback(self, callback: Callable[[str, float, float], None]) -> None:
        """Add callback for when prices are updated."""
        self.price_update_callbacks.append(callback)

    def add_approval_required_callback(self, callback: Callable[[PriceChangeRequest], None]) -> None:
        """Add callback for when manual approval is required."""
        self.approval_required_callbacks.append(callback)

    async def process_pricing_recommendation(
        self,
        product_id: str,
        current_price: float,
        recommendation: PriceRecommendation,
        business_context: Dict[str, Any] = None
    ) -> PriceChangeRequest:
        """Process an AI pricing recommendation through the rules engine.
        
        Args:
            product_id: Product identifier
            current_price: Current product price
            recommendation: AI pricing recommendation
            business_context: Additional business context (margins, inventory, etc.)
            
        Returns:
            PriceChangeRequest with processing result
        """
        context = business_context or {}

        # Find applicable rules
        applicable_rules = self._find_applicable_rules(product_id, recommendation, context)

        if not applicable_rules:
            self.logger.info(f"No applicable rules for {product_id}, no action taken")
            return self._create_no_action_request(product_id, current_price, recommendation)

        # Sort rules by priority
        applicable_rules.sort(key=lambda r: r.priority)

        # Create price change request
        request = PriceChangeRequest(
            request_id=f"{product_id}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
            product_id=product_id,
            current_price=current_price,
            recommended_price=recommendation.recommended_price,
            recommendation=recommendation,
            applicable_rules=applicable_rules,
            status=PriceChangeStatus.PENDING,
            created_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24)  # Default expiry
        )

        # Process through rules
        action_taken = False
        for rule in applicable_rules:
            try:
                if await self._process_rule(request, rule, context):
                    action_taken = True
                    break
            except Exception as e:
                self.logger.error(f"Error processing rule {rule.rule_id}: {e}")
                continue

        if not action_taken:
            request.status = PriceChangeStatus.MANUAL_REVIEW
            request.manual_approval_required = True
            request.approval_reason = "No rules could process this recommendation automatically"

        # Store request
        self.price_change_requests[request.request_id] = request

        # Trigger callbacks if needed
        if request.manual_approval_required:
            for callback in self.approval_required_callbacks:
                try:
                    callback(request)
                except Exception as e:
                    self.logger.error(f"Error in approval callback: {e}")

        return request

    async def _process_rule(
        self,
        request: PriceChangeRequest,
        rule: PricingRule,
        context: Dict[str, Any]
    ) -> bool:
        """Process a price change request through a specific rule.
        
        Returns:
            True if the rule processed the request, False otherwise
        """
        # Check if rule is currently active
        current_hour = datetime.now(timezone.utc).hour
        if current_hour not in rule.active_hours:
            return False

        # Check confidence bounds
        if not (rule.min_confidence <= request.recommendation.confidence <= rule.max_confidence):
            return False

        # Check price change limits
        if not self._check_price_limits(request, rule):
            self.logger.warning(f"Price change for {request.product_id} exceeds limits for rule {rule.rule_id}")
            return False

        # Check business constraints
        if rule.require_margin_check:
            if not self._check_profit_margins(request, rule, context):
                self.logger.warning(f"Price change for {request.product_id} fails margin check for rule {rule.rule_id}")
                return False

        # Check cooldown period
        if not self._check_cooldown(request.product_id, rule):
            self.logger.info(f"Product {request.product_id} in cooldown period for rule {rule.rule_id}")
            return False

        # Check daily change limits
        if not self._check_daily_limits(request.product_id, rule):
            self.logger.info(f"Product {request.product_id} exceeds daily change limit for rule {rule.rule_id}")
            return False

        # Execute rule action
        request.applied_by_rule = rule.rule_id

        if rule.action == RuleAction.APPLY_IMMEDIATELY:
            return await self._apply_price_change_immediately(request, rule)
        elif rule.action == RuleAction.APPLY_WITH_APPROVAL:
            return self._request_approval(request, rule)
        elif rule.action == RuleAction.NOTIFY_ONLY:
            return self._notify_only(request, rule)
        else:  # IGNORE
            request.status = PriceChangeStatus.REJECTED
            return True

    def _find_applicable_rules(
        self,
        product_id: str,
        recommendation: PriceRecommendation,
        context: Dict[str, Any]
    ) -> List[PricingRule]:
        """Find rules applicable to a product and recommendation."""
        applicable_rules = []

        for rule in self.rules.values():
            if not rule.enabled:
                continue

            # Check product exclusions
            if product_id in rule.excluded_products:
                continue

            # Check product categories (if specified)
            if rule.product_categories:
                product_category = context.get('category', '')
                if product_category not in rule.product_categories:
                    continue

            # Check confidence threshold
            if recommendation.confidence < rule.min_confidence:
                continue

            applicable_rules.append(rule)

        return applicable_rules

    def _check_price_limits(self, request: PriceChangeRequest, rule: PricingRule) -> bool:
        """Check if price change is within configured limits."""
        current_price = request.current_price
        new_price = request.recommended_price

        # Calculate percentage change
        if current_price > 0:
            change_percentage = abs((new_price - current_price) / current_price)

            if new_price > current_price:  # Price increase
                if change_percentage > rule.max_price_increase:
                    return False
            else:  # Price decrease
                if change_percentage > rule.max_price_decrease:
                    return False

        # Check absolute limits
        if rule.min_price is not None and new_price < rule.min_price:
            return False

        if rule.max_price is not None and new_price > rule.max_price:
            return False

        return True

    def _check_profit_margins(
        self,
        request: PriceChangeRequest,
        rule: PricingRule,
        context: Dict[str, Any]
    ) -> bool:
        """Check if price change maintains required profit margins."""
        if not rule.require_margin_check:
            return True

        # Get product cost from context
        product_cost = context.get('cost', 0)
        if product_cost <= 0:
            self.logger.warning(f"No cost data available for {request.product_id}, skipping margin check")
            return True  # Allow if no cost data

        # Calculate margin at new price
        new_price = request.recommended_price
        if new_price <= product_cost:
            return False  # Would result in loss

        margin = (new_price - product_cost) / new_price

        return margin >= rule.min_profit_margin

    def _check_cooldown(self, product_id: str, rule: PricingRule) -> bool:
        """Check if product is in cooldown period for this rule."""
        if product_id not in self.price_change_history:
            return True

        history = self.price_change_history[product_id]
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=rule.cooldown_hours)

        # Check for recent changes by this rule
        for change in history:
            if (change.get('rule_id') == rule.rule_id and
                change.get('timestamp', datetime.min) > cutoff_time):
                return False

        return True

    def _check_daily_limits(self, product_id: str, rule: PricingRule) -> bool:
        """Check if product has exceeded daily change limits."""
        if product_id not in self.price_change_history:
            return True

        today = datetime.now(timezone.utc).date()
        history = self.price_change_history[product_id]

        # Count changes today
        changes_today = sum(1 for change in history
                           if change.get('timestamp', datetime.min).date() == today)

        return changes_today < rule.max_changes_per_day

    async def _apply_price_change_immediately(
        self,
        request: PriceChangeRequest,
        rule: PricingRule
    ) -> bool:
        """Apply price change immediately."""
        try:
            # Record the change
            self._record_price_change(
                request.product_id,
                request.current_price,
                request.recommended_price,
                rule.rule_id,
                "automatic"
            )

            # Update request status
            request.status = PriceChangeStatus.APPLIED
            request.applied_at = datetime.now(timezone.utc)

            # Trigger price update callbacks
            for callback in self.price_update_callbacks:
                try:
                    callback(request.product_id, request.current_price, request.recommended_price)
                except Exception as e:
                    self.logger.error(f"Error in price update callback: {e}")

            self.logger.info(f"Applied price change for {request.product_id}: ${request.current_price:.2f} → ${request.recommended_price:.2f}")
            return True

        except Exception as e:
            self.logger.error(f"Error applying price change: {e}")
            request.status = PriceChangeStatus.MANUAL_REVIEW
            request.manual_approval_required = True
            request.approval_reason = f"Error during automatic application: {str(e)}"
            return False

    def _request_approval(self, request: PriceChangeRequest, rule: PricingRule) -> bool:
        """Request manual approval for price change."""
        request.status = PriceChangeStatus.MANUAL_REVIEW
        request.manual_approval_required = True
        request.approval_reason = f"Manual approval required by rule: {rule.name}"

        self.logger.info(f"Manual approval requested for {request.product_id} price change")
        return True

    def _notify_only(self, request: PriceChangeRequest, rule: PricingRule) -> bool:
        """Send notification only, don't apply price change."""
        request.status = PriceChangeStatus.REJECTED
        request.approval_reason = f"Notification only rule: {rule.name}"

        self.logger.info(f"Price change notification for {request.product_id}: ${request.current_price:.2f} → ${request.recommended_price:.2f}")
        return True

    def _record_price_change(
        self,
        product_id: str,
        old_price: float,
        new_price: float,
        rule_id: str,
        change_type: str
    ) -> None:
        """Record a price change in history."""
        if product_id not in self.price_change_history:
            self.price_change_history[product_id] = []

        change_record = {
            'timestamp': datetime.now(timezone.utc),
            'old_price': old_price,
            'new_price': new_price,
            'rule_id': rule_id,
            'change_type': change_type,
            'change_percentage': ((new_price - old_price) / old_price) * 100 if old_price > 0 else 0
        }

        self.price_change_history[product_id].append(change_record)

        # Keep only recent history (last 30 days)
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=30)
        self.price_change_history[product_id] = [
            record for record in self.price_change_history[product_id]
            if record['timestamp'] > cutoff_date
        ]

    def _create_no_action_request(
        self,
        product_id: str,
        current_price: float,
        recommendation: PriceRecommendation
    ) -> PriceChangeRequest:
        """Create a request for cases where no rules apply."""
        return PriceChangeRequest(
            request_id=f"{product_id}_no_action_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
            product_id=product_id,
            current_price=current_price,
            recommended_price=recommendation.recommended_price,
            recommendation=recommendation,
            applicable_rules=[],
            status=PriceChangeStatus.REJECTED,
            created_at=datetime.now(timezone.utc),
            approval_reason="No applicable pricing rules found"
        )

    async def approve_price_change(self, request_id: str, approved: bool, approver: str = "manual") -> bool:
        """Manually approve or reject a price change request."""
        if request_id not in self.price_change_requests:
            self.logger.error(f"Price change request not found: {request_id}")
            return False

        request = self.price_change_requests[request_id]

        if approved:
            # Apply the price change
            self._record_price_change(
                request.product_id,
                request.current_price,
                request.recommended_price,
                request.applied_by_rule or "manual",
                "manual_approval"
            )

            request.status = PriceChangeStatus.APPLIED
            request.applied_at = datetime.now(timezone.utc)

            # Trigger callbacks
            for callback in self.price_update_callbacks:
                try:
                    callback(request.product_id, request.current_price, request.recommended_price)
                except Exception as e:
                    self.logger.error(f"Error in price update callback: {e}")

            self.logger.info(f"Price change approved and applied for {request.product_id} by {approver}")
        else:
            request.status = PriceChangeStatus.REJECTED
            request.approval_reason = f"Rejected by {approver}"
            self.logger.info(f"Price change rejected for {request.product_id} by {approver}")

        return True

    def get_pending_approvals(self) -> List[PriceChangeRequest]:
        """Get all pending approval requests."""
        return [
            request for request in self.price_change_requests.values()
            if request.status == PriceChangeStatus.MANUAL_REVIEW and request.manual_approval_required
        ]

    def get_pricing_history(self, product_id: str, days: int = 30) -> List[Dict[str, Any]]:
        """Get pricing history for a product."""
        if product_id not in self.price_change_history:
            return []

        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
        return [
            record for record in self.price_change_history[product_id]
            if record['timestamp'] > cutoff_date
        ]
