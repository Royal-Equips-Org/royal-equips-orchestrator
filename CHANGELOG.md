# Changelog

All notable changes to the Command Center UI are documented here following [Keep a Changelog](https://keepachangelog.com/) conventions and [Semantic Versioning](https://semver.org/).

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
