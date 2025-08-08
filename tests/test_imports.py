"""Basic smoke tests for the Royal Equips Orchestrator package."""

def test_import_package() -> None:
    import royal_equips_orchestrator  # noqa: F401

def test_import_agents() -> None:
    from royal_equips_orchestrator import (
        ProductResearchAgent,
        InventoryForecastingAgent,
        PricingOptimizerAgent,
        MarketingAutomationAgent,
        CustomerSupportAgent,
        OrderManagementAgent,
        AnalyticsAgent,
    )  # noqa: F401