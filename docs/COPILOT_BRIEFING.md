# Royal Orchestrator — Copilot Briefing

## Canonical docs
- AGENT_INSTRUCTIONS.md
- EMPIRE_PROMPT.md
- EMPIRE_INFRASTRUCTURE.md
- Royal Orchestrator build (canvas): beschrijft agents, orchestrator, API, command center. 
  Doel: alle modules productieklaar op poort 10000.

## Operatiemodus
- Werk in kleine PRs per taak (max ~300 LOC).
- Schrijf tests waar mogelijk.
- Geen destructieve wijzigingen zonder migratie/rollback.
- Geheime variabelen alleen via GitHub Secrets/.env.production (nooit hardcoden).

## Prioriteiten
1) Poort-unificatie 10000 + health endpoints.
2) Agents volledig: research → sourcing → listing → pricing → inventory → order router → fulfillment → tracking → returns → marketing → reviews → analytics → finance → tax → risk → KB.
3) Orchestrator pipelines + retries/backoff + idempotentie.
4) Command Center UI live telemetry.
5) CI/CD groen, security scans schoon.

## Done-Definition
- Tests groen in CI.
- `docker compose up --build` werkt lokaal.
- `/health` en `/agents` OK.
- Documentatie aangepast.
