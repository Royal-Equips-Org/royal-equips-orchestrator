# Cross-Platform Enterprise Workflows Guide

This document provides comprehensive guidance for the Royal Equips Enterprise cross-platform workflow system, designed to run seamlessly on both GitHub-hosted (ubuntu-latest) and self-hosted Windows x64 runners.

## 🏗️ Architecture Overview

The Royal Equips Orchestrator now supports enterprise-grade cross-platform CI/CD with the following key features:

- **Self-Healing Retry Logic**: 3-attempt retry with exponential backoff
- **Structured JSON Logging**: Observable logs for monitoring integration
- **Cross-Shell Compatibility**: Native PowerShell and Bash support
- **Matrix Strategies**: Parallel execution across multiple platforms
- **Organization-Level Secrets**: Secure credential management
- **Real-time Notifications**: Slack integration for operational awareness

## 🚀 Updated Workflows

### Critical Workflows

| Workflow | Status | Features |
|----------|--------|----------|
| `_reusable-base.yml` | ✅ Updated | Cross-platform reusable workflow with configurable OS/shell |
| `ci-complete.yml` | ✅ Updated | Full CI pipeline with matrix strategy for ubuntu + windows |
| `comprehensive-ci.yml` | ✅ Updated | Python testing across versions and platforms |
| `orchestrator.yml` | ✅ Updated | Agent orchestration with platform selection |
| `agents-execution.yml` | ✅ Updated | Tier 1/2 agent execution with enterprise features |
| `selfhosted-smoke.yml` | ✅ Updated | Multi-platform smoke testing |
| `cross-platform-validation.yml` | ✅ New | Comprehensive environment validation |

## 📋 Cross-Platform Patterns

### Matrix Strategy Implementation

```yaml
strategy:
  matrix:
    include:
      - os: 'ubuntu-latest'
        shell: bash
        platform: 'linux'
      - os: '[self-hosted, Windows, X64]'
        shell: pwsh
        platform: 'windows'
runs-on: ${{ fromJSON(matrix.os) }}
defaults:
  run:
    shell: ${{ matrix.shell }}
```

### Structured Logging Patterns

#### PowerShell (Windows)
```powershell
Write-Host (@{
  level="info"; 
  message="Operation started"; 
  timestamp=(Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json -Compress)
```

#### Bash (Linux)
```bash
echo '{"level":"info","message":"Operation started","timestamp":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}'
```

### Self-Healing Retry Logic

#### PowerShell Implementation
```powershell
$maxAttempts = 3
for ($i = 1; $i -le $maxAttempts; $i++) {
  try {
    # Critical operation
    command
    break
  } catch {
    Write-Host (@{level="warn"; message="Attempt $i failed"; error=$_.Exception.Message} | ConvertTo-Json -Compress)
    if ($i -lt $maxAttempts) {
      Start-Sleep -Seconds (5 * $i)
    } else {
      throw $_
    }
  }
}
```

#### Bash Implementation
```bash
for i in {1..3}; do
  if command; then
    break
  elif [ $i -eq 3 ]; then
    echo '{"level":"error","message":"All attempts failed"}'
    exit 1
  else
    echo '{"level":"warn","message":"Attempt '$i' failed, retrying..."}'
    sleep $((5*i))
  fi
done
```

### Cross-Platform Conditional Logic

```yaml
run: |
  if ($IsWindows -or $env:OS -like "*Windows*") {
    # PowerShell commands for Windows
    Write-Host (@{level="info"; message="Running on Windows"} | ConvertTo-Json -Compress)
  } else {
    # Bash commands for Linux
    echo '{"level":"info","message":"Running on Linux"}'
  fi
```

## 🔒 Secret Management

### Organization-Level Secrets Pattern

All workflows now follow the organization-level secret pattern with fallbacks:

```yaml
env:
  DATABASE_URL: ${{ secrets.ORG_DATABASE_URL || secrets.DATABASE_URL }}
  REDIS_URL: ${{ secrets.ORG_REDIS_URL || secrets.REDIS_URL }}
  SLACK_WEBHOOK_URL: ${{ secrets.ORG_SLACK_WEBHOOK || vars.ORG_SLACK_WEBHOOK }}
```

### Required Organization Secrets

Configure these secrets at the organization level (Settings > Secrets and variables > Actions):

| Secret Name | Description | Required |
|-------------|-------------|----------|
| `ORG_GITHUB_TOKEN` | GitHub token for API access | Optional |
| `ORG_SLACK_WEBHOOK` | Slack webhook for notifications | Optional |
| `ORG_DATABASE_URL` | Database connection string | Yes |
| `ORG_REDIS_URL` | Redis connection string | Yes |
| `ORG_SHOPIFY_ACCESS_TOKEN` | Shopify API token | Yes |
| `ORG_OPENAI_API_KEY` | OpenAI API key | Optional |

## 📊 Slack Notifications

### Rich Notification Format (PowerShell)

```powershell
$slackMessage = @{
  text = "🚨 Alert Title"
  attachments = @(
    @{
      color = "danger"
      fields = @(
        @{ title = "Platform"; value = "${{ matrix.platform }}"; short = $true }
        @{ title = "Status"; value = "Failed"; short = $true }
        @{ title = "Run ID"; value = "${{ github.run_id }}"; short = $true }
        @{ title = "Repository"; value = "${{ github.repository }}"; short = $true }
      )
    }
  )
} | ConvertTo-Json -Depth 5 -Compress
Invoke-RestMethod -Uri $env:SLACK_WEBHOOK_URL -Method Post -Body $slackMessage -ContentType "application/json"
```

### Simple Notification Format (Bash)

```bash
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🚨 Alert: Operation failed on ${{ matrix.platform }} (Run #${{ github.run_id }})"}' \
  "$SLACK_WEBHOOK_URL"
```

## 🛠️ Usage Examples

### Using the Reusable Base Workflow

```yaml
jobs:
  execute-agent:
    uses: ./.github/workflows/_reusable-base.yml
    with:
      agent: 'product_research'
      os: '["ubuntu-latest"]'  # Linux only
      shell: 'bash'
    secrets:
      ORG_GITHUB_TOKEN: ${{ secrets.ORG_GITHUB_TOKEN }}
      ORG_SLACK_WEBHOOK: ${{ secrets.ORG_SLACK_WEBHOOK }}
```

### Cross-Platform Matrix Job

```yaml
jobs:
  cross-platform-test:
    strategy:
      matrix:
        include:
          - os: 'ubuntu-latest'
            shell: bash
          - os: '[self-hosted, Windows, X64]'
            shell: pwsh
    runs-on: ${{ fromJSON(matrix.os) }}
    defaults:
      run:
        shell: ${{ matrix.shell }}
    steps:
      - uses: actions/checkout@v4
      - name: Test
        run: |
          if ($IsWindows -or $env:OS -like "*Windows*") {
            Write-Host "Testing on Windows"
          } else {
            echo "Testing on Linux"
          fi
```

## 🔍 Monitoring and Observability

### Health Check Workflow

The `cross-platform-validation.yml` workflow provides comprehensive environment validation:

- **Secrets Validation**: Checks availability of required secrets
- **Environment Checks**: Validates system resources and tools
- **Network Connectivity**: Tests access to external services
- **Tool Availability**: Verifies Node.js, Python, Git installation

### Structured Log Analysis

All workflows generate JSON logs that can be ingested by monitoring tools:

```json
{
  "level": "info",
  "message": "Agent execution started",
  "agent": "product_research",
  "platform": "windows",
  "timestamp": "2024-09-20T12:00:00Z"
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Matrix Exclusion Not Working**
   - Ensure proper syntax: `${{ github.event.inputs.platform == 'windows' && contains(matrix.platform, 'linux') }}`

2. **JSON Parsing Errors**
   - Use `fromJSON()` for JSON arrays: `${{ fromJSON(matrix.os) }}`

3. **PowerShell Conditional Logic**
   - Use both conditions: `($IsWindows -or $env:OS -like "*Windows*")`

4. **Slack Notifications Not Sending**
   - Verify webhook URL is set in secrets
   - Check webhook URL format and permissions

### Debug Mode

Enable debug logging by adding to workflow:

```yaml
env:
  ACTIONS_STEP_DEBUG: true
  ACTIONS_RUNNER_DEBUG: true
```

## 📈 Performance Optimization

### Resource Constraints (4GB Windows Hosts)

- **Timeout Management**: Set appropriate timeouts for operations
- **Memory Usage**: Monitor memory consumption in health checks
- **Parallel Execution**: Use matrix strategies to distribute load
- **Caching**: Leverage platform-specific caching strategies

### Best Practices

1. **Use Retry Logic**: Wrap critical operations with self-healing retry
2. **Structure Logs**: Always use JSON logging for observability
3. **Fail Fast**: Set appropriate timeouts to avoid hanging workflows
4. **Monitor Resources**: Include health checks for system resources
5. **Notify Failures**: Use Slack notifications for operational awareness

## 🔄 Migration Guide

### From Single-Platform to Cross-Platform

1. **Add Matrix Strategy**: Convert single OS to matrix with multiple platforms
2. **Update Shell Commands**: Replace bash-specific commands with conditional logic
3. **Add Structured Logging**: Replace echo/Write-Host with JSON logging
4. **Implement Retry Logic**: Wrap critical operations with retry logic
5. **Update Secrets**: Migrate to organization-level secrets pattern
6. **Add Notifications**: Implement Slack notifications for failures

### Example Migration

**Before:**
```yaml
runs-on: ubuntu-latest
steps:
  - run: echo "Starting process"
  - run: npm install
```

**After:**
```yaml
strategy:
  matrix:
    include:
      - os: 'ubuntu-latest'
        shell: bash
      - os: '[self-hosted, Windows, X64]'
        shell: pwsh
runs-on: ${{ fromJSON(matrix.os) }}
defaults:
  run:
    shell: ${{ matrix.shell }}
steps:
  - run: |
      if ($IsWindows -or $env:OS -like "*Windows*") {
        Write-Host (@{level="info"; message="Starting process"} | ConvertTo-Json -Compress)
      } else {
        echo '{"level":"info","message":"Starting process"}'
      fi
  - uses: nick-fields/retry@v3
    with:
      timeout_minutes: 10
      max_attempts: 3
      retry_on: error
      command: npm install
```

## 📚 Additional Resources

- [GitHub Actions Matrix Strategy](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs)
- [PowerShell in GitHub Actions](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsshell)
- [Organization Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets#creating-encrypted-secrets-for-an-organization)
- [Slack Webhooks](https://api.slack.com/messaging/webhooks)

---

*Cross-platform enterprise workflows powered by Royal Equips Empire 🚀*