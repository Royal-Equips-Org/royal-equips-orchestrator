"""RoyalGPT contract conformance tests."""

from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

import pytest
import yaml
from jsonschema import Draft202012Validator, RefResolver

from app import create_app

SPEC_PATH = Path(__file__).resolve().parents[2] / "docs" / "openapi" / "royalgpt-command-api.yaml"


@pytest.fixture(scope="module")
def royal_app():
    app = create_app("testing")
    app.config.update(TESTING=True)
    return app


@pytest.fixture(scope="module")
def royal_spec() -> Dict[str, Any]:
    with SPEC_PATH.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle)


def _validate(spec: Dict[str, Any], schema: Dict[str, Any], payload: Dict[str, Any]) -> None:
    resolver = RefResolver.from_schema(spec)
    validator = Draft202012Validator(schema, resolver=resolver)
    validator.validate(payload)


def test_openapi_spec_advertised(royal_app, royal_spec):
    client = royal_app.test_client()
    response = client.get("/docs/apispec.json")
    assert response.status_code == 200
    data = response.get_json()
    assert data["openapi"] == "3.1.0"
    assert "/api/v2/products" in data["paths"]
    assert "/api/intelligence/report" in data["paths"]


def test_health_diagnostics_payload(royal_app):
    client = royal_app.test_client()
    response = client.get("/health")
    assert response.status_code in (200, 503)
    payload = response.get_json()
    assert set(payload).issuperset({"status", "uptime", "version", "agents", "checks", "timestamp"})
    assert isinstance(payload["agents"], dict)
    assert "seconds" in payload["uptime"]


def test_products_v2_get_contract(royal_app, royal_spec):
    client = royal_app.test_client()
    response = client.get("/api/v2/products")
    assert response.status_code == 200
    payload = response.get_json()

    schema = royal_spec["paths"]["/api/v2/products"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]
    _validate(royal_spec, schema, payload)
    assert payload["items"], "Expected at least one product in response"


def test_products_v2_post_contract(royal_app, royal_spec):
    client = royal_app.test_client()
    product_id = "gid://shopify/Product/842390123"
    response = client.post("/api/v2/products", json={"productId": product_id, "includeBenchmarks": True})
    assert response.status_code == 200
    payload = response.get_json()

    schema = royal_spec["paths"]["/api/v2/products"]["post"]["responses"]["200"]["content"]["application/json"]["schema"]
    _validate(royal_spec, schema, payload)
    assert payload["productId"] == product_id


class _StubSecurityAgent:
    name = "Security Fraud Agent"
    risk_threshold = 0.8

    def __init__(self) -> None:
        self.fraud_alerts = []

    async def _detect_fraudulent_transactions(self):
        return [
            {
                "id": "txn_001",
                "order_id": "1001",
                "customer_id": "cust-55",
                "risk_score": 0.92,
                "reasons": ["velocity_spike", "billing_mismatch"],
            },
            {
                "id": "txn_002",
                "order_id": "1002",
                "customer_id": "cust-56",
                "risk_score": 0.45,
                "reasons": ["ip_country_mismatch"],
            },
        ]

    async def _handle_fraud_alert(self, transaction):
        self.fraud_alerts.append(transaction)


class _StubOrchestrator:
    def __init__(self, agent):
        self._agent = agent

    def get_agent(self, name: str):
        if name == "security_fraud":
            return self._agent
        return None


def test_fraud_scan_contract(monkeypatch, royal_app, royal_spec):
    agent = _StubSecurityAgent()
    orchestrator = _StubOrchestrator(agent)
    monkeypatch.setattr("app.routes.security.get_orchestrator", lambda: orchestrator)

    client = royal_app.test_client()
    response = client.post("/api/fraud/scan")
    assert response.status_code == 200
    payload = response.get_json()

    schema = royal_spec["paths"]["/api/fraud/scan"]["post"]["responses"]["200"]["content"]["application/json"]["schema"]
    _validate(royal_spec, schema, payload)
    assert payload["summary"]["analyzed"] >= payload["summary"]["alertsGenerated"]


@pytest.mark.parametrize("timeframe", ["24h", "7d", "30d", "90d"])
def test_intelligence_report_contract(timeframe, royal_app, royal_spec):
    client = royal_app.test_client()
    response = client.get(f"/api/intelligence/report?timeframe={timeframe}")
    assert response.status_code == 200
    payload = response.get_json()

    schema = royal_spec["paths"]["/api/intelligence/report"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]
    _validate(royal_spec, schema, payload)
    assert payload["timeframe"] == timeframe


def test_intelligence_report_invalid_timeframe(royal_app):
    client = royal_app.test_client()
    response = client.get("/api/intelligence/report?timeframe=5h")
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "request_invalid"


def test_agents_status_endpoint(royal_app):
    """Test the new agents status endpoint."""
    client = royal_app.test_client()
    response = client.get("/api/agents/status")
    assert response.status_code in (200, 503)
    if response.status_code == 200:
        payload = response.get_json()
        assert "agents" in payload
        assert "totalAgents" in payload
        assert "activeAgents" in payload
        assert "timestamp" in payload
        assert isinstance(payload["agents"], list)


def test_inventory_status_endpoint(royal_app):
    """Test the new inventory status endpoint."""
    client = royal_app.test_client()
    response = client.get("/api/inventory/status")
    assert response.status_code in (200, 503)
    if response.status_code == 200:
        payload = response.get_json()
        assert "summary" in payload
        assert "lowStockItems" in payload
        assert "timestamp" in payload
        assert "totalInventory" in payload["summary"]


def test_marketing_campaigns_endpoint(royal_app):
    """Test the new marketing campaigns endpoint."""
    client = royal_app.test_client()
    response = client.get("/api/marketing/campaigns")
    assert response.status_code == 200
    payload = response.get_json()
    assert "campaigns" in payload
    assert "totalCampaigns" in payload
    assert "activeCampaigns" in payload
    assert "timestamp" in payload


def test_system_capabilities_endpoint(royal_app):
    """Test the new system capabilities endpoint."""
    client = royal_app.test_client()
    response = client.get("/api/system/capabilities")
    assert response.status_code == 200
    payload = response.get_json()
    assert "apiVersion" in payload
    assert "capabilities" in payload
    assert "accessLevel" in payload
    assert "timestamp" in payload
    assert payload["apiVersion"] == "2.1.0"
