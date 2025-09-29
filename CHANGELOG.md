# Changelog

All notable changes to the Command Center UI are documented here following [Keep a Changelog](https://keepachangelog.com/) conventions and [Semantic Versioning](https://semver.org/).

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
