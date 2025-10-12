# Copilot Operating Directives
- Read: INSTRUCTIONS.md, EMPIRE_PROMPT.md, AGENT_INSTRUCTIONS.md, EMPIRE_INFRASTRUCTURE.md.
- Output: small atomic PR commits with tests, typed code, docs.
- Constraints:
  - Node 20 + pnpm 9.9.0. Unify ports: 10000.
  - Provide health endpoints and CI fixes.
  - No placeholders. Use real logic or open TODO issues with concrete specs.
- Security: Fix CodeQL, Gitleaks, Trivy findings with minimal, auditable patches.
- If information is missing, generate self-prompts and add them to PR comments.
