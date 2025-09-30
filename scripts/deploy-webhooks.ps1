#!/usr/bin/env pwsh

# Royal Equips Webhook Deployment Script
# Deploys webhook worker to Cloudflare with proper secrets

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "production",
    
    [Parameter(Mandatory=$false)]
    [switch]$SetSecrets = $false,
    
    [Parameter(Mandatory=$false)]
    [string]$Domain = ""
)

Write-Host "🏰 Royal Equips Webhook Deployment" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Yellow

# Change to cloudflare-proxy directory
Set-Location -Path "cloudflare-proxy"

# Check if wrangler is installed
try {
    $wranglerVersion = wrangler --version
    Write-Host "✅ Wrangler found: $wranglerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Wrangler CLI not found. Install with: npm install -g wrangler" -ForegroundColor Red
    exit 1
}

# Authenticate with Cloudflare (if not already authenticated)
Write-Host "🔐 Checking Cloudflare authentication..." -ForegroundColor Blue
try {
    $whoami = wrangler whoami 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Already authenticated: $whoami" -ForegroundColor Green
    } else {
        Write-Host "🔑 Please authenticate with Cloudflare..." -ForegroundColor Yellow
        wrangler login
    }
} catch {
    Write-Host "🔑 Please authenticate with Cloudflare..." -ForegroundColor Yellow
    wrangler login
}

# Set secrets if requested
if ($SetSecrets) {
    Write-Host "🔒 Setting up webhook secrets..." -ForegroundColor Blue
    
    $githubSecret = Read-Host -Prompt "Enter GitHub webhook secret" -AsSecureString
    $shopifySecret = Read-Host -Prompt "Enter Shopify webhook secret" -AsSecureString
    
    # Convert secure strings back to plain text for wrangler
    $githubPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($githubSecret))
    $shopifyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($shopifySecret))
    
    Write-Host "Setting GitHub webhook secret..." -ForegroundColor Yellow
    echo $githubPlain | wrangler secret put GITHUB_WEBHOOK_SECRET --env $Environment
    
    Write-Host "Setting Shopify webhook secret..." -ForegroundColor Yellow  
    echo $shopifyPlain | wrangler secret put SHOPIFY_WEBHOOK_SECRET --env $Environment
    
    Write-Host "✅ Secrets configured" -ForegroundColor Green
}

# Update domain in wrangler config if provided
if ($Domain) {
    Write-Host "🌐 Updating domain configuration to: $Domain" -ForegroundColor Blue
    
    # Read current config
    $config = Get-Content "wrangler-webhooks.toml" -Raw
    
    # Replace domain placeholders
    $config = $config -replace "your-domain\.com", $Domain
    
    # Write back to file
    Set-Content "wrangler-webhooks.toml" $config
    
    Write-Host "✅ Domain updated in configuration" -ForegroundColor Green
}

# Deploy the worker
Write-Host "🚀 Deploying webhook worker..." -ForegroundColor Blue
wrangler deploy --config wrangler-webhooks.toml --env $Environment

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Webhook worker deployed successfully!" -ForegroundColor Green
    
    # Display webhook URLs
    $workerUrl = if ($Environment -eq "production") { 
        "royal-equips-webhooks-prod" 
    } else { 
        "royal-equips-webhooks-dev" 
    }
    
    if ($Domain) {
        Write-Host "📡 Webhook URLs:" -ForegroundColor Cyan
        Write-Host "  GitHub: https://$Domain/webhooks/github" -ForegroundColor White
        Write-Host "  Shopify: https://$Domain/webhooks/shopify" -ForegroundColor White
        Write-Host "  Health: https://$Domain/health" -ForegroundColor White
    } else {
        Write-Host "📡 Webhook URLs:" -ForegroundColor Cyan
        Write-Host "  GitHub: https://$workerUrl.workers.dev/webhooks/github" -ForegroundColor White
        Write-Host "  Shopify: https://$workerUrl.workers.dev/webhooks/shopify" -ForegroundColor White
        Write-Host "  Health: https://$workerUrl.workers.dev/health" -ForegroundColor White
    }
    
} else {
    Write-Host "❌ Deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n🎯 Next Steps:" -ForegroundColor Magenta
Write-Host "1. Configure GitHub org webhooks with the GitHub URL above" -ForegroundColor White
Write-Host "2. Configure Shopify webhooks with the Shopify URL above" -ForegroundColor White
Write-Host "3. Test webhooks with: curl https://your-webhook-url/health" -ForegroundColor White

# Return to original directory
Set-Location -Path ".."