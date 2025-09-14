#requires -Version 5
$ErrorActionPreference = "Stop"

# ---- CONFIG ----
$ORG   = "Royal-Equips-Org"
$REPO  = "Royal-Equips-Orchestrator"
$BRANCH= "master"     # zet op 'main' als dat je default is
$NODE  = "20"

# ---- SAFETY ----
git rev-parse --is-inside-work-tree | Out-Null
git fetch origin --prune
try { git checkout -B $BRANCH "origin/$BRANCH" } catch { git checkout -B $BRANCH }
git pull --ff-only; if ($LASTEXITCODE -ne 0) { Write-Host "git pull returned $LASTEXITCODE (ok to continue)"; }

# ---- GH REPO SETTINGS ----
& gh api -X PATCH -H "Accept: application/vnd.github+json" "/repos/$ORG/$REPO" -f allow_auto_merge=true | Out-Null
& gh api -X PUT -H "Accept: application/vnd.github+json" `
  "/repos/$ORG/$REPO/branches/$BRANCH/protection" `
  -f enforce_admins=true `
  -f required_linear_history=true `
  -f allow_force_pushes=false `
  -f allow_deletions=false `
  -F required_pull_request_reviews='{"required_approving_review_count":0,"require_code_owner_reviews":false}' `
  -F required_status_checks='{"strict":false,"contexts":["ci","codeql","trivy"]}' `
  -F restrictions='null' | Out-Null

# ---- FS LAYOUT ----
New-Item -ItemType Directory -Force -Path ".github/workflows" | Out-Null
New-Item -ItemType Directory -Force -Path ".husky/_" | Out-Null

# ---- package.json + Husky ----
if (Test-Path package.json) {
  node -e @"
const fs=require('fs');
const f='package.json';
const j=JSON.parse(fs.readFileSync(f,'utf8'));
j.engines=j.engines||{}; j.engines.node='$NODE';
j.scripts=j.scripts||{};
j.scripts['husky:install']='husky install';
j.scripts['husky:verify']="node -e \"require('fs').accessSync('.husky/pre-commit')\"";
if(!j.scripts.lint) j.scripts.lint='eslint .';
if(!j.scripts.test) j.scripts.test='jest --runInBand';
fs.writeFileSync(f, JSON.stringify(j,null,2));
"@
} else {
@"
{
  "name": "royal-equips-orchestrator",
  "private": true,
  "type": "module",
  "engines": { "node": "$NODE" },
  "scripts": {
    "husky:install": "husky install",
    "husky:verify": "node -e \"require('fs').accessSync('.husky/pre-commit')\"",
    "lint": "eslint .",
    "test": "jest --runInBand"
  },
  "devDependencies": {}
}
"@ | Set-Content -Encoding UTF8 package.json
}

@'
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"
npm run lint
npm test --silent
'@ | Set-Content -Encoding UTF8 .husky/pre-commit
@'
#!/usr/bin/env sh
# minimal shim
'@ | Set-Content -Encoding UTF8 .husky/_/husky.sh

# ---- Codacy ----
@'
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
'@ | Set-Content -Encoding UTF8 .codacy.yml

# ---- CI ----
$ci = @'
name: ci
on:
  push:
    branches: [__BRANCH__]
  pull_request:
permissions:
  contents: read
  checks: write
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: "__NODE__"
          cache: npm
      - run: npm ci || npm i
      - run: npm run lint || true
      - run: npm test -- --ci --reporters=default --reporters=jest-junit
'@
$ci.Replace("__BRANCH__",$BRANCH).Replace("__NODE__",$NODE) | Set-Content -Encoding UTF8 .github/workflows/ci.yml

# ---- CodeQL ----
@'
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
'@ | Set-Content -Encoding UTF8 .github/workflows/codeql.yml

# ---- Trivy ----
@'
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
'@ | Set-Content -Encoding UTF8 .github/workflows/trivy.yml

# ---- Enforce main health (auto-revert) ----
$enforce = @'
name: enforce-main-health
on:
  push:
    branches: [__BRANCH__]
permissions:
  contents: write
  pull-requests: write
jobs:
  ci:
    runs-on: ubuntu-latest
    outputs:
      result: ${{ steps.outcome.outputs.status }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "__NODE__"
          cache: npm
      - run: npm ci || npm i
      - id: lint
        run: npm run lint
      - id: test
        run: npm test -- --ci
      - id: outcome
        run: |
          if [ "${{ steps.lint.outcome }}" = "success" ] && [ "${{ steps.test.outcome }}" = "success" ]; then
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
        with:
          ref: "__BRANCH__"
          fetch-depth: 0
      - name: Revert last commit on __BRANCH__
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git revert --no-edit "${GITHUB_SHA}" || exit 1
          git push origin HEAD:__BRANCH__
'@
$enforce.Replace("__BRANCH__",$BRANCH).Replace("__NODE__",$NODE) | Set-Content -Encoding UTF8 .github/workflows/enforce-main-health.yml

# ---- COMMIT ----
git add .husky .github package.json .codacy.yml
git commit -m "infra(ci): direct-to-$BRANCH with CI/CodeQL/Trivy, Husky, auto-revert"
if ($LASTEXITCODE -ne 0) { Write-Host "Nothing to commit"; }
git push -u origin $BRANCH

Write-Host "Klaar. Direct commits op '$BRANCH' met CI, CodeQL, Trivy en auto-revert guard."
