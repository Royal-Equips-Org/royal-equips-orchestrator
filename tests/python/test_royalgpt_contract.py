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
    assert "/v2/products" in data["paths"]
    assert "/intelligence/report" in data["paths"]


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
    response = client.get("/v2/products")
    assert response.status_code == 200
    payload = response.get_json()

    schema = royal_spec["paths"]["/v2/products"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]
    _validate(royal_spec, schema, payload)
    assert payload["items"], "Expected at least one product in response"


def test_products_v2_post_contract(royal_app, royal_spec):
    client = royal_app.test_client()
    product_id = "gid://shopify/Product/842390123"
    response = client.post("/v2/products", json={"productId": product_id, "includeBenchmarks": True})
    assert response.status_code == 200
    payload = response.get_json()

    schema = royal_spec["paths"]["/v2/products"]["post"]["responses"]["200"]["content"]["application/json"]["schema"]
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
    response = client.post("/fraud/scan")
    assert response.status_code == 200
    payload = response.get_json()

    schema = royal_spec["paths"]["/fraud/scan"]["post"]["responses"]["200"]["content"]["application/json"]["schema"]
    _validate(royal_spec, schema, payload)
    assert payload["summary"]["analyzed"] >= payload["summary"]["alertsGenerated"]


@pytest.mark.parametrize("timeframe", ["24h", "7d", "30d", "90d"])
def test_intelligence_report_contract(timeframe, royal_app, royal_spec):
    client = royal_app.test_client()
    response = client.get(f"/intelligence/report?timeframe={timeframe}")
    assert response.status_code == 200
    payload = response.get_json()

    schema = royal_spec["paths"]["/intelligence/report"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]
    _validate(royal_spec, schema, payload)
    assert payload["timeframe"] == timeframe


def test_intelligence_report_invalid_timeframe(royal_app):
    client = royal_app.test_client()
    response = client.get("/intelligence/report?timeframe=5h")
    assert response.status_code == 400
    payload = response.get_json()
    assert payload["error"] == "request_invalid"
