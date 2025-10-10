# 🏰 Royal Equips Multi-Agent Security Orchestrator

## Overview

The Royal Equips Multi-Agent Security Orchestrator is an enterprise-grade GitHub Actions workflow that provides autonomous security, quality, and compliance management for large-scale e-commerce operations. This system replaces the traditional single-job Codacy workflow with a sophisticated multi-agent architecture designed for resilience, observability, and compliance.

## Architecture

### Multi-Agent Design

The orchestrator employs five specialized agents working in parallel:

1. **🔐 Security Scan Agent** - Matrix-based security scanning
2. **🧹 Lint Agent** - Multi-language code quality enforcement  
3. **🧪 Test Agent** - Comprehensive testing with coverage
4. **⛓️ Supply Chain Agent** - Dependency and container security
5. **📊 Observability Agent** - Reporting and compliance hooks

### Key Features

- **Self-Healing**: 3-attempt retry with exponential backoff
- **Circuit Breaker**: Timeout controls and fail-fast strategies
- **Structured Logging**: JSON logs with compliance metadata
- **Matrix Scaling**: Parallel execution across languages/scan types
- **Enterprise Security**: Org-level secrets with validation
- **Compliance Integration**: GDPR/SOC2/ISO27001 audit trails

## Agent Details

### Security Scan Agent

**Purpose**: Comprehensive security analysis with SARIF integration

**Matrix Strategy**:
- `codacy`: Static analysis with Codacy CLI
- `secrets`: Secret scanning with Gitleaks  
- `dependencies`: Vulnerability scanning with Trivy

**Features**:
- Pinned tool versions (Codacy CLI 7.11.12, Gitleaks 8.18.4, Trivy 0.48.3)
- SARIF upload to GitHub Security tab
- Organization secret validation
- Self-healing retry logic

### Lint Agent

**Purpose**: Multi-language code quality enforcement with auto-fix

**Matrix Strategy**:
- `python`: Ruff linting and formatting
- `javascript`: ESLint with TypeScript support

**Features**:
- Auto-fix capabilities where possible
- JSON output for observability
- Pinned tool versions (Ruff 0.1.8)
- Artifact upload for results

### Test Agent

**Purpose**: Comprehensive testing with coverage reporting

**Matrix Strategy**:
- `python`: Pytest with coverage
- `javascript`: Jest with coverage

**Features**:
- Coverage reporting (JSON and HTML)
- Test result artifacts
- Pinned test frameworks (Pytest 7.4.3, Jest via npm)
- Passthrough for repositories without tests

### Supply Chain Agent

**Purpose**: Complete supply chain security auditing

**Matrix Strategy**:
- `npm`: NPM package vulnerability audit
- `pip`: Python package vulnerability audit  
- `container`: Docker/container configuration audit

**Features**:
- JSON output for all audit types
- High/critical severity focus
- Container configuration scanning
- Audit result artifacts

### Observability Agent

**Purpose**: Centralized reporting, compliance, and notifications

**Dependencies**: Runs after all other agents complete

**Features**:
- Comprehensive JSON reporting
- Security playbook integration
- GDPR/SOC2/ISO27001 compliance hooks
- Audit trail generation
- Slack failure notifications
- Artifact consolidation

## Configuration

### Required Organization Secrets

- `ORG_CODACY_PROJECT_TOKEN`: Codacy project authentication
- `ORG_AUDIT_WEBHOOK`: Compliance audit logging endpoint
- `ORG_SLACK_WEBHOOK`: Failure notification webhook

### Environment Variables

```yaml
env:
  AUDIT_ENABLED: true
  COMPLIANCE_STANDARDS: "GDPR,SOC2,ISO27001"
  SECURITY_PLAYBOOK_URL: "https://github.com/Royal-Equips-Org/security-playbook"
  LOG_LEVEL: "INFO"
  AGENT_TIMEOUT_MINUTES: 15
  MAX_RETRY_ATTEMPTS: 3
```

## Trigger Configuration

### Automatic Triggers

- **Push to main**: Full security scan on production deployments
- **Pull Requests**: Pre-merge security validation
- **Scheduled**: Weekly security audit (Wednesday 02:23 UTC)

### Manual Triggers

**Workflow Dispatch** with agent focus options:
- `all`: Run all agents (default)
- `security`: Security scan agent only
- `lint`: Lint agent only  
- `test`: Test agent only
- `supply-chain`: Supply chain agent only
- `observability`: Observability agent only

## Self-Healing Features

### Retry Logic

All critical operations use `nick-fields/retry@v3.0.0` with:
- Maximum 3 attempts
- Exponential backoff (5s, 10s, 15s)
- Timeout protection (15-20 minutes per agent)

### Circuit Breaker

- **Concurrency Control**: Single workflow per branch
- **Timeout Management**: Agent-specific timeout limits
- **Fail-Fast**: Immediate termination on critical failures
- **Resource Protection**: Memory and CPU constraints

### Error Handling

- Structured error logging with context
- Graceful degradation for non-critical failures
- Artifact preservation on failures
- Notification system for operational awareness

## Compliance & Audit

### Standards Support

- **GDPR**: Data processing audit trails
- **SOC2**: Security control monitoring
- **ISO27001**: Information security management

### Audit Trail

Each workflow run generates:
- Unique audit ID (GitHub run ID)
- Timestamp records for all operations
- Actor and event traceability
- Compliance standard validation
- Security result summaries

### Observability

**Structured JSON Logging**:
```json
{
  "timestamp": "2024-01-15T14:30:00Z",
  "level": "info",
  "agent": "security-scan",
  "event": "agent_start",
  "workflow_run_id": "12345",
  "compliance_standards": "GDPR,SOC2,ISO27001"
}
```

## Migration from Legacy Workflow

### Before (codacy.yml)
- Single Windows self-hosted runner
- Basic Codacy scan only
- No retry logic or observability
- Limited error handling

### After (Multi-Agent Orchestrator)
- Five specialized agents on Ubuntu
- Comprehensive security coverage
- Self-healing and circuit breaker
- Full compliance integration
- Structured observability

### Migration Steps

1. Update branch references from `master` to `main`
2. Configure organization secrets (`ORG_*`)
3. Set up audit webhook endpoints
4. Configure Slack notifications
5. Test with `workflow_dispatch` before full deployment

## Troubleshooting

### Common Issues

**Agent Timeout**: Increase `AGENT_TIMEOUT_MINUTES` for large repositories
**Secret Validation Failure**: Ensure org secrets are properly configured
**SARIF Upload Issues**: Check repository security settings
**Matrix Job Failures**: Review individual agent logs in structured output

### Debug Mode

Enable detailed logging by setting:
```yaml
env:
  LOG_LEVEL: "DEBUG"
```

### Support

- Security Playbook: https://github.com/Royal-Equips-Org/security-playbook
- Workflow Source: `.github/workflows/codacy.yml`
- Artifact Retention: 30-90 days based on content type

## Performance Metrics

- **Total Runtime**: ~15-25 minutes (parallel execution)
- **Resource Usage**: Ubuntu runner with standard resources
- **Retry Overhead**: ~5-15% additional time for retries
- **Artifact Size**: JSON reports typically <50MB total

## Future Enhancements

- Integration with external security platforms
- Custom compliance rule engines
- Advanced ML-based anomaly detection
- Cross-repository security trends
- Real-time security dashboards