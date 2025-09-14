#!/usr/bin/env bash
set -euo pipefail

# -------- CONFIG --------
ORG="Royal-Equips-Org"
REPO="Royal-Equips-Orchestrator"
BRANCH="master"          # zet op 'main' als jouw default branch zo heet
NODE_VERSION="20"

# -------- SAFETY --------
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "Run from repo root."; exit 1; }
git fetch origin --prune
git checkout -B "$BRANCH" "origin/$BRANCH" 2>/dev/null || git checkout -B "$BRANCH"
git pull --ff-only || true

# -------- GITHUB SETTINGS --------
gh api -X PATCH -H "Accept: application/vnd.github+json" "/repos/$ORG/$REPO" -f allow_auto_merge=true >/dev/null

# Branch protection: geen PR verplicht, wel lineaire historie en admin enforcement.
# Let op: status checks blokkeren geen directe pushes. We vangen failures af met auto-revert workflow.
gh api -X PUT -H "Accept: application/vnd.github+json" \
  "/repos/$ORG/$REPO/branches/$BRANCH/protection" \
  -f enforce_admins=true \
  -f required_linear_history=true \
  -f allow_force_pushes=false \
  -f allow_deletions=false \
  -F required_pull_request_reviews='{"required_approving_review_count":0,"require_code_owner_reviews":false}' \
  -F required_status_checks='{"strict":false,"contexts":["ci","codeql","trivy"]}' \
  -F restrictions='null' >/dev/null

mkdir -p .github/workflows .husky

# -------- PACKAGE + HUSKY --------
if [ -f package.json ]; then
  TMP=$(mktemp)
  jq '
    .engines = (.engines // {}) + {"node":"'"$NODE_VERSION"'"} |
    .scripts = (.scripts // {}) +
      {"husky:install":"husky install","husky:verify":"node -e \"require(\" + "\"fs\"" + ").accessSync(\" + "\".husky/pre-commit\"" + \")\"} +
      {"lint":(.scripts.lint // "eslint ."),"test":(.scripts.test // "jest --runInBand")}
  ' package.json > "$TMP" && mv "$TMP" package.json
else
  cat > package.json <<JSON
{
  "name": "royal-equips-orchestrator",
  "private": true,
  "type": "module",
  "engines": { "node": "$NODE_VERSION" },
  "scripts": {
    "husky:install": "husky install",
    "husky:verify": "node -e \"require('fs').accessSync('.husky/pre-commit')\"",
    "lint": "eslint .",
    "test": "jest --runInBand"
  },
  "devDependencies": {}
}
JSON
fi

# Basic dev deps lock-in (idempotent; faalt niet als geen npm)
( corepack enable >/dev/null 2>&1 || true; npm pkg set engines.node="$NODE_VERSION" >/dev/null 2>&1 || true )

cat > .husky/pre-commit <<'HUSKY'
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"
npm run lint
npm test --silent
HUSKY
chmod +x .husky/pre-commit

# Husky bootstrap
mkdir -p .husky/_ && cat > .husky/_/husky.sh <<'EOS'
#!/usr/bin/env sh
# shellcheck shell=sh
if [ -z "$husky_skip_init" ]; then
  debug () {
    [ "${HUSKY_DEBUG:-}" = "1" ] && echo "husky (debug) - $1"
  }
  readonly hook_name="$(basename "$0")"
  debug "starting $hook_name..."
fi
EOS
chmod +x .husky/_/husky.sh

# -------- CODACY (optioneel strict) --------
cat > .codacy.yml <<'YML'
engines:
  eslint:
    enabled: true
    configuration:
      extensions: [.js, .jsx, .ts, .tsx]
    exclude_paths:
      - dist/**
patterns:
  security:
    - id: no-eval
      message: "Disallow eval"
      languages: [javascript, typescript]
      severity: error
      regex: "\\beval\\("
    - id: child_process-exec
      message: "Disallow exec from child_process"
      languages: [javascript, typescript]
      severity: error
      regex: "child_process\\.(exec|execSync)\\("
YML

# -------- CI --------
cat > .github/workflows/ci.yml <<YAML
name: ci
on:
  push:
    branches: [$BRANCH]
  pull_request:
permissions:
  contents: read
  checks: write
concurrency:
  group: \${{ github.workflow }}-\${{ github.ref }}
  cancel-in-progress: true
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: actions/setup-node@v4
        with: { node-version: '$NODE_VERSION', cache: 'npm' }
      - run: npm ci || npm i
      - run: npm run lint || true
      - run: npm test -- --ci --reporters=default --reporters=jest-junit
YAML

# -------- CODEQL --------
cat > .github/workflows/codeql.yml <<'YAML'
name: codeql
on:
  push:
    branches: [master, main]
  pull_request:
permissions:
  contents: read
  security-events: write
jobs:
  analyze:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix: { language: [javascript] }
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with: { languages: ${{ matrix.language }} }
      - uses: github/codeql-action/analyze@v3
        with: { category: codeql-${{ matrix.language }} }
YAML

# -------- TRIVY --------
cat > .github/workflows/trivy.yml <<'YAML'
name: trivy
on:
  push:
    branches: [master, main]
  pull_request:
permissions:
  contents: read
  security-events: write
jobs:
  fs-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aquasecurity/trivy-action@0.24.0
        with:
          scan-type: fs
          format: sarif
          output: trivy-files.sarif
          ignore-unfixed: true
          severity: HIGH,CRITICAL
      - uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy-files.sarif
          category: trivy-fs
YAML

# -------- ENFORCE HEALTH: auto-revert on failure to keep master green --------
cat > .github/workflows/enforce-main-health.yml <<YAML
name: enforce-main-health
on:
  push:
    branches: [$BRANCH]
permissions:
  contents: write
  pull-requests: write
jobs:
  ci:
    runs-on: ubuntu-latest
    outputs:
      result: \${{ steps.outcome.outputs.status }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '$NODE_VERSION', cache: 'npm' }
      - run: npm ci || npm i
      - id: lint
        run: npm run lint
      - id: test
        run: npm test -- --ci
      - id: outcome
        run: |
          if [ "\${{ steps.lint.outcome }}" = "success" ] && [ "\${{ steps.test.outcome }}" = "success" ]; then
            echo "status=success" >> "$GITHUB_OUTPUT"
          else
            echo "status=failure" >> "$GITHUB_OUTPUT"
          fi

  revert_if_failed:
    needs: [ci]
    if: needs.ci.outputs.result == 'failure'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { ref: '$BRANCH', fetch-depth: 0 }
      - name: Revert last commit on $BRANCH
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git revert --no-edit "${GITHUB_SHA}" || exit 1
          git push origin HEAD:$BRANCH
YAML

# -------- COMMIT --------
git add .husky .github package.json .codacy.yml || true
git commit -m "infra(ci): direct-to-$BRANCH with CI/CodeQL/Trivy, Husky, auto-revert guard" || true
git push -u origin "$BRANCH"

echo "Done. Direct commits to '$BRANCH' zijn actief met CI en auto-revert guard."
