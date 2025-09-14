"""Basic smoke tests for the Royal Equips Orchestrator package."""

def test_import_package() -> None:
    import royal_equips_orchestrator  # noqa: F401

def test_import_agents() -> None:
    pass  # noqa: F401

def test_product_recommendation_agent_import() -> None:
    """Test that ProductRecommendationAgent can be imported and instantiated."""
    from orchestrator.agents import ProductRecommendationAgent
    agent = ProductRecommendationAgent()
    assert agent.name == "recommendation"
