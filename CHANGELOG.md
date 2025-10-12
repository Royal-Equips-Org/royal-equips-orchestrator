# Changelog

All notable changes to the Command Center UI are documented here following [Keep a Changelog](https://keepachangelog.com/) conventions and [Semantic Versioning](https://semver.org/).

## [1.2.0] - 2025-02-15
### Added
- RoyalGPT OpenAPI 3.1.0 contract (`docs/openapi/royalgpt-command-api.yaml`) served at `/docs/apispec.json` for client discovery.
- Versioned `/v2/products` endpoints exposing `Product` and `ProductAnalysis` responses aligned with Shopify data and deterministic fallbacks.
- `/fraud/scan` RoyalGPT alias preserving auth/rate limiting while emitting the `FraudScanResult` payload.
- `/intelligence/report` intelligence feed wrapping the analytics agent to supply the canonical `IntelligenceReport` structure.
- Backend contract test suite (`tests/python/test_royalgpt_contract.py`) covering the new endpoints and OpenAPI advertisement.

### Changed
- `/health` now delivers structured diagnostics including uptime, build version, and agent counts.
- CI (`ci.yml`) installs Python dependencies and executes the RoyalGPT contract tests alongside frontend checks.
- `reports/STACK_REPORT.md` documents the RoyalGPT API surface for operational awareness.

## [1.1.0] - 2025-09-29
### Added
- AI Core room layout with holographic Three.js avatar linked to live metrics and voice commands.
- Real-time data layer binding Supabase broadcasts, WebSocket telemetry, and chart visualisations for revenue, logistics, and marketing intelligence.
- Voice-operated interface with speech recognition, AIRA integration, and interaction logging.

### Changed
- Reworked the Command Center shell to centre the holographic AI core while retaining module navigation and command console access.
- Extended `empireService` with engine boost, auto sync controls, and analytics logging to back-end endpoints with supporting tests.
- Introduced charting and Supabase dependencies for data panels and live analytics.

## [1.0.1] - 2025-09-29
### Added
- `reports/STACK_REPORT.md` summarising current deployment providers, build process, and operational gaps.
- `docs/RUNBOOK.md` detailing local development, deployment, rollback, and incident response procedures.
- Static `public/health.json` for health probing by Cloudflare Pages or external monitors.

### Changed
- Updated runtime API configuration defaults to `/api` and aligned `EmpireService` endpoints to match documented backend routes.
- Refined service tests to assert new endpoint paths and prevent regressions.
- Adjusted `public/config.json` and runtime config fallbacks to use the new base path.

[1.0.1]: https://github.com/Royal-Equips-Org/royal-equips-orchestrator/releases/tag/v1.0.1
[1.1.0]: https://github.com/Royal-Equips-Org/royal-equips-orchestrator/releases/tag/v1.1.0
[1.2.0]: https://github.com/Royal-Equips-Org/royal-equips-orchestrator/releases/tag/v1.2.0
