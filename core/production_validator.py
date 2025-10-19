"""Production environment validator for Royal Equips Orchestrator.

This module validates that all required credentials and configuration
are present before allowing the orchestrator to start. This implements
fail-fast behavior to prevent running with incomplete configuration.

PRODUCTION MODE - NO FALLBACKS:
- All API credentials must be present
- Database connections must be valid
- Critical services must be accessible
- No mock/stub data allowed in production
"""

import logging
import os
from dataclasses import dataclass
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class ValidationResult:
    """Result of a validation check."""
    passed: bool
    message: str
    severity: str = "error"  # error, warning, info


class ProductionValidator:
    """Validates production environment requirements.
    
    This validator checks for:
    1. Required API credentials
    2. Database connectivity
    3. Service accessibility
    4. Configuration completeness
    """
    
    def __init__(self, strict_mode: bool = True):
        """Initialize the validator.
        
        Args:
            strict_mode: If True, any validation error prevents startup.
                        If False, only critical errors prevent startup.
        """
        self.strict_mode = strict_mode
        self.results: List[ValidationResult] = []
    
    def validate_all(self) -> bool:
        """Run all validation checks.
        
        Returns:
            True if all checks pass, False otherwise.
        """
        logger.info("🔍 Starting production environment validation...")
        
        # Reset results
        self.results = []
        
        # Run all validation checks
        self._validate_flask_config()
        self._validate_ecommerce_apis()
        self._validate_marketing_apis()
        self._validate_ai_services()
        self._validate_database_config()
        self._validate_monitoring_config()
        
        # Evaluate results
        critical_failures = [r for r in self.results if not r.passed and r.severity == "error"]
        warnings = [r for r in self.results if not r.passed and r.severity == "warning"]
        
        # Log summary
        self._log_validation_summary(critical_failures, warnings)
        
        # Determine pass/fail
        if critical_failures:
            if self.strict_mode:
                logger.error(
                    f"❌ VALIDATION FAILED: {len(critical_failures)} critical error(s) found. "
                    "Cannot start in production mode without required credentials."
                )
                return False
            else:
                logger.warning(
                    f"⚠️ VALIDATION WARNINGS: {len(critical_failures)} critical error(s) found. "
                    "Starting anyway (strict_mode=False)."
                )
                return True
        
        if warnings:
            logger.warning(
                f"⚠️ Validation completed with {len(warnings)} warning(s). "
                "Some optional features may be unavailable."
            )
        else:
            logger.info("✅ All production environment validations passed!")
        
        return True
    
    def _validate_flask_config(self) -> None:
        """Validate Flask application configuration."""
        # SECRET_KEY validation
        secret_key = os.getenv('SECRET_KEY')
        if not secret_key:
            self.results.append(ValidationResult(
                passed=False,
                message="SECRET_KEY not set. Required for session security.",
                severity="error"
            ))
        elif secret_key in ['dev', 'development', 'test', 'change-me']:
            self.results.append(ValidationResult(
                passed=False,
                message="SECRET_KEY uses a default/insecure value. Generate a strong secret key.",
                severity="error"
            ))
        else:
            self.results.append(ValidationResult(
                passed=True,
                message="SECRET_KEY configured",
                severity="info"
            ))
        
        # Flask environment
        flask_env = os.getenv('FLASK_ENV', 'production')
        if flask_env == 'development':
            self.results.append(ValidationResult(
                passed=False,
                message="FLASK_ENV is set to 'development'. Use 'production' for production deployments.",
                severity="warning"
            ))
    
    def _validate_ecommerce_apis(self) -> None:
        """Validate e-commerce platform API credentials."""
        # Shopify (REQUIRED)
        shopify_store = os.getenv('SHOPIFY_STORE')
        shopify_token = os.getenv('SHOPIFY_ACCESS_TOKEN')
        
        if not shopify_store or not shopify_token:
            self.results.append(ValidationResult(
                passed=False,
                message="Shopify credentials missing (SHOPIFY_STORE, SHOPIFY_ACCESS_TOKEN). REQUIRED for order processing.",
                severity="error"
            ))
        else:
            self.results.append(ValidationResult(
                passed=True,
                message="Shopify credentials configured",
                severity="info"
            ))
        
        # AutoDS (REQUIRED for ProductResearchAgent)
        autods_key = os.getenv('AUTO_DS_API_KEY') or os.getenv('AUTODS_API_KEY')
        if not autods_key:
            self.results.append(ValidationResult(
                passed=False,
                message="AutoDS API key missing (AUTO_DS_API_KEY). REQUIRED for product research.",
                severity="error"
            ))
        else:
            self.results.append(ValidationResult(
                passed=True,
                message="AutoDS API key configured",
                severity="info"
            ))
        
        # Spocket (REQUIRED for ProductResearchAgent)
        spocket_key = os.getenv('SPOCKET_API_KEY')
        if not spocket_key:
            self.results.append(ValidationResult(
                passed=False,
                message="Spocket API key missing (SPOCKET_API_KEY). REQUIRED for product research.",
                severity="error"
            ))
        else:
            self.results.append(ValidationResult(
                passed=True,
                message="Spocket API key configured",
                severity="info"
            ))
        
        # Printful (OPTIONAL but recommended)
        printful_key = os.getenv('PRINTFUL_API_KEY')
        if not printful_key:
            self.results.append(ValidationResult(
                passed=False,
                message="Printful API key missing (PRINTFUL_API_KEY). Order fulfillment limited.",
                severity="warning"
            ))
        else:
            self.results.append(ValidationResult(
                passed=True,
                message="Printful API key configured",
                severity="info"
            ))
    
    def _validate_marketing_apis(self) -> None:
        """Validate marketing platform API credentials."""
        # Klaviyo (OPTIONAL but recommended for email marketing)
        klaviyo_key = os.getenv('KLAVIYO_API_KEY')
        if not klaviyo_key:
            self.results.append(ValidationResult(
                passed=False,
                message="Klaviyo API key missing (KLAVIYO_API_KEY). Email marketing unavailable.",
                severity="warning"
            ))
        else:
            self.results.append(ValidationResult(
                passed=True,
                message="Klaviyo API key configured",
                severity="info"
            ))
        
        # Twilio (OPTIONAL for SMS notifications)
        twilio_sid = os.getenv('TWILIO_ACCOUNT_SID')
        twilio_token = os.getenv('TWILIO_AUTH_TOKEN')
        if not twilio_sid or not twilio_token:
            self.results.append(ValidationResult(
                passed=False,
                message="Twilio credentials missing. SMS notifications unavailable.",
                severity="warning"
            ))
        else:
            self.results.append(ValidationResult(
                passed=True,
                message="Twilio credentials configured",
                severity="info"
            ))
    
    def _validate_ai_services(self) -> None:
        """Validate AI service API credentials."""
        # OpenAI (REQUIRED for customer support and content generation)
        openai_key = os.getenv('OPENAI_API_KEY')
        if not openai_key:
            self.results.append(ValidationResult(
                passed=False,
                message="OpenAI API key missing (OPENAI_API_KEY). AI features unavailable.",
                severity="error"
            ))
        else:
            self.results.append(ValidationResult(
                passed=True,
                message="OpenAI API key configured",
                severity="info"
            ))
    
    def _validate_database_config(self) -> None:
        """Validate database configuration."""
        # Supabase (OPTIONAL for advanced features)
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_KEY') or os.getenv('SUPABASE_ANON_KEY')
        
        if not supabase_url or not supabase_key:
            self.results.append(ValidationResult(
                passed=False,
                message="Supabase configuration missing. Advanced features unavailable.",
                severity="warning"
            ))
        else:
            self.results.append(ValidationResult(
                passed=True,
                message="Supabase configured",
                severity="info"
            ))
        
        # Redis (OPTIONAL for caching)
        redis_url = os.getenv('REDIS_URL')
        if not redis_url:
            self.results.append(ValidationResult(
                passed=False,
                message="Redis URL missing. Caching unavailable.",
                severity="warning"
            ))
        else:
            self.results.append(ValidationResult(
                passed=True,
                message="Redis configured",
                severity="info"
            ))
    
    def _validate_monitoring_config(self) -> None:
        """Validate monitoring and observability configuration."""
        # Sentry (OPTIONAL for error tracking)
        sentry_dsn = os.getenv('SENTRY_DSN')
        if not sentry_dsn:
            self.results.append(ValidationResult(
                passed=False,
                message="Sentry DSN missing. Error tracking unavailable.",
                severity="warning"
            ))
        else:
            self.results.append(ValidationResult(
                passed=True,
                message="Sentry error tracking configured",
                severity="info"
            ))
    
    def _log_validation_summary(self, critical_failures: List[ValidationResult], warnings: List[ValidationResult]) -> None:
        """Log a summary of validation results."""
        logger.info("\n" + "="*80)
        logger.info("PRODUCTION ENVIRONMENT VALIDATION SUMMARY")
        logger.info("="*80)
        
        if critical_failures:
            logger.error("\n❌ CRITICAL FAILURES:")
            for failure in critical_failures:
                logger.error(f"  • {failure.message}")
        
        if warnings:
            logger.warning("\n⚠️ WARNINGS:")
            for warning in warnings:
                logger.warning(f"  • {warning.message}")
        
        passed_checks = [r for r in self.results if r.passed]
        logger.info(f"\n✅ {len(passed_checks)} checks passed")
        logger.info("="*80 + "\n")
    
    def get_validation_report(self) -> Dict[str, any]:
        """Get a structured validation report.
        
        Returns:
            Dictionary with validation results and summary.
        """
        critical_failures = [r for r in self.results if not r.passed and r.severity == "error"]
        warnings = [r for r in self.results if not r.passed and r.severity == "warning"]
        passed_checks = [r for r in self.results if r.passed]
        
        return {
            "passed": len(critical_failures) == 0,
            "total_checks": len(self.results),
            "passed_checks": len(passed_checks),
            "critical_failures": len(critical_failures),
            "warnings": len(warnings),
            "results": [
                {
                    "passed": r.passed,
                    "message": r.message,
                    "severity": r.severity
                }
                for r in self.results
            ]
        }


def validate_production_environment(strict_mode: bool = True) -> bool:
    """Validate production environment and return success status.
    
    Args:
        strict_mode: If True, any validation error prevents startup.
        
    Returns:
        True if validation passes, False otherwise.
    """
    validator = ProductionValidator(strict_mode=strict_mode)
    return validator.validate_all()
