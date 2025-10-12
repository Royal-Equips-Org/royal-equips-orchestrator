# scripts/fix-agent.ps1
$ErrorActionPreference = "Stop"

# 1) Ensure pnpm on PATH
try { pnpm -v | Out-Null }
catch {
  npm config set prefix "$env:APPDATA\npm" | Out-Null
  npm i -g pnpm@9.9.0 | Out-Null
  $env:Path = "$env:APPDATA\npm;$env:Path"
}

# 2) Run agent once, then watch
node scripts/fix-agent.mjs --watch --commit
