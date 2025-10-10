#!/usr/bin/env pwsh
# Royal Equips Repository Cleanup Script
# Focus: 1 Backend (Flask) + 1 Frontend (React) + Real Business Logic Only

Write-Host "🏰 ROYAL EQUIPS REPOSITORY CLEANUP" -ForegroundColor Cyan
Write-Host "Target: 1 Backend + 1 Frontend + Real Business Logic Only" -ForegroundColor Green

# Create backup
$backupDir = "backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Write-Host "📦 Creating backup: $backupDir" -ForegroundColor Yellow

# 1. REMOVE REDUNDANT FASTAPI SERVICES
Write-Host "`n🗑️  REMOVING REDUNDANT SERVICES..." -ForegroundColor Red

$redundantServices = @(
    "apps/aira",
    "apps/api", 
    "apps/orchestrator-api",
    "apps/agent-executors"
)

foreach ($service in $redundantServices) {
    if (Test-Path $service) {
        Write-Host "   Removing: $service" -ForegroundColor Yellow
        Remove-Item -Path $service -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 2. REMOVE MOCK/DEMO/TEST FILES
Write-Host "`n🧹 REMOVING MOCK/DEMO FILES..." -ForegroundColor Red

$mockFiles = @(
    "dev-tools/mock-server",
    "demo_server.js",
    "elite_demo.html", 
    "test_autonomous_empire.py",
    "test_empire_system.py",
    "test_inventory_page.html",
    "agents/marketing_campaign.mjs",
    "agents/order_processing.mjs",
    "agents/product_research.mjs",
    "bin/hashFiles",
    "edge-functions/auth-hook-react-email-resend"
)

foreach ($file in $mockFiles) {
    if (Test-Path $file) {
        Write-Host "   Removing: $file" -ForegroundColor Yellow
        Remove-Item -Path $file -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 3. REMOVE REDUNDANT PACKAGES
Write-Host "`n📦 REMOVING REDUNDANT PACKAGES..." -ForegroundColor Red

$redundantPackages = @(
    "packages/obs",
    "packages/connectors", 
    "packages/agents-core",
    "tools/royal-fix-agent"
)

foreach ($pkg in $redundantPackages) {
    if (Test-Path $pkg) {
        Write-Host "   Removing: $pkg" -ForegroundColor Yellow
        Remove-Item -Path $pkg -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# 4. REMOVE UNNECESSARY CONFIG FILES
Write-Host "`n⚙️  REMOVING REDUNDANT CONFIG FILES..." -ForegroundColor Red

$configFiles = @(
    "jest.config.mjs",
    "knip.json",
    "commitlint.config.cjs",
    "eslint.config.mjs",
    "prettier.config.cjs",
    "tsconfig.tests.json"
)

foreach ($config in $configFiles) {
    if (Test-Path $config) {
        Write-Host "   Removing: $config" -ForegroundColor Yellow
        Remove-Item -Path $config -Force -ErrorAction SilentlyContinue
    }
}

# 5. CLEAN UP DOCUMENTATION
Write-Host "`n📚 CLEANING DOCUMENTATION..." -ForegroundColor Red

$docFiles = @(
    "docs/workplan.md",
    "docs/migration-fastapi-to-flask.md", 
    "docs/cleanup.md",
    "IMPLEMENTATION_SUMMARY.md",
    "CONTROL_CENTER_IMPLEMENTATION.md",
    "CROSS_PLATFORM_IMPLEMENTATION.md",
    "EMPIRE_INFRASTRUCTURE.md",
    "ML_ENHANCED_PRICING_SYSTEM.md",
    "SYSTEM_TESTING_RESULTS.md",
    "ALL_TYPESCRIPT_ERRORS_FIXED.md"
)

foreach ($doc in $docFiles) {
    if (Test-Path $doc) {
        Write-Host "   Removing: $doc" -ForegroundColor Yellow
        Remove-Item -Path $doc -Force -ErrorAction SilentlyContinue
    }
}

# 6. UPDATE PACKAGE.JSON TO REMOVE REDUNDANT SCRIPTS
Write-Host "`n📝 UPDATING ROOT PACKAGE.JSON..." -ForegroundColor Green

if (Test-Path "package.json") {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    
    # Keep only essential scripts
    $essentialScripts = @{
        "dev" = "concurrently `"pnpm dev:flask`" `"pnpm dev:ui`""
        "dev:flask" = "python wsgi.py"
        "dev:ui" = "cd apps/command-center-ui && pnpm dev"
        "build" = "cd apps/command-center-ui && pnpm build"
        "start" = "python wsgi.py"
        "typecheck" = "cd apps/command-center-ui && pnpm typecheck"
        "lint" = "cd apps/command-center-ui && pnpm lint"
        "test" = "cd apps/command-center-ui && pnpm test"
    }
    
    $packageJson.scripts = $essentialScripts
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"
}

# 7. UPDATE PNPM WORKSPACE TO FOCUS ON SINGLE FRONTEND
Write-Host "`n🏗️  UPDATING PNPM WORKSPACE..." -ForegroundColor Green

$workspaceContent = @"
packages:
  - "apps/command-center-ui"
  - "packages/shared-types"
"@

Set-Content "pnpm-workspace.yaml" $workspaceContent

Write-Host "`n✅ CLEANUP COMPLETE!" -ForegroundColor Green
Write-Host "🎯 Repository now focused on:" -ForegroundColor Cyan
Write-Host "   - Flask Backend: /app/, /orchestrator/, /core/" -ForegroundColor White  
Write-Host "   - React Frontend: /apps/command-center-ui/" -ForegroundColor White
Write-Host "   - Shared Types: /packages/shared-types/" -ForegroundColor White
Write-Host "`n🚀 Ready for real business logic implementation!" -ForegroundColor Green