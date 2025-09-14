# Required Status Checks for ARIA Command Center

This document outlines the required status checks that must pass before any pull request can be merged into the main branch.

## 🔒 Security Gates (BLOCKING)

These checks will **block** the merge if they fail:

### Critical Security Checks
- **Gitleaks**: No secrets or credentials detected in code
- **Trivy Critical**: No critical security vulnerabilities in dependencies or containers
- **CodeQL High**: No high-severity code security issues

### Security Monitoring
- **Bandit**: Python SAST security analysis
- **Safety**: Python dependency vulnerability check  
- **OWASP ZAP**: Dynamic application security testing
- **Trivy Config**: Infrastructure as Code security scanning

## 🧪 Build & Quality Gates (BLOCKING)

These checks will **block** the merge if they fail:

### Python/Flask API
- **Python Tests**: All unit and integration tests pass
- **Coverage Gate**: Minimum 70% code coverage maintained
- **Linting**: Code passes ruff and black formatting checks
- **Type Check**: MyPy static type checking passes

### React/TypeScript Frontend  
- **TypeScript**: No TypeScript compilation errors
- **Linting**: ESLint passes with no errors
- **Build**: Application builds successfully for production
- **Bundle Size**: Build artifacts under size limits

### Integration
- **Integration Tests**: End-to-end service communication works
- **Docker Build**: All container images build successfully
- **Health Checks**: All services start and respond to health checks

## 📝 Process Gates

### Required Checks
- **Commit Lint**: Conventional commit format enforced
- **PR Title**: Must follow conventional commit format
- **Branch Protection**: Direct pushes to main blocked

### Review Requirements
- **Code Review**: At least 1 approving review required
- **CODEOWNERS**: Security-sensitive files require security team review
- **Documentation**: README and docs updated for breaking changes

## 🚀 Deployment Prerequisites

Before deployment to production:

### Pre-deployment Checks
- ✅ All security gates passed
- ✅ All build & test gates passed  
- ✅ Integration tests passed
- ✅ Performance benchmarks within acceptable range
- ✅ Security scan results reviewed
- ✅ Documentation updated

### Environment-Specific Gates
- **Staging**: All checks + manual QA approval
- **Production**: All checks + security team approval + deployment window

## 🔧 Configuration

### GitHub Branch Protection Rules
```yaml
required_status_checks:
  strict: true
  contexts:
    # Security Gates
    - "Security Gate"
    - "CodeQL"
    - "Gitleaks"
    - "Trivy Security Scan"
    
    # Build Gates  
    - "Flask API Tests"
    - "React Frontend Tests"
    - "Integration Tests"
    - "Docker Build"
    
    # Quality Gates
    - "Commit Lint"

required_pull_request_reviews:
  required_approving_review_count: 1
  dismiss_stale_reviews: true
  require_code_owner_reviews: true

enforce_admins: true
allow_force_pushes: false
allow_deletions: false
```

## 🆘 Emergency Procedures

### Security Incident Response
1. **Critical vulnerability found**: Immediately block all deployments
2. **Secret leak detected**: Rotate affected credentials immediately  
3. **Active attack detected**: Activate incident response team

### Build Failure Recovery
1. **Check GitHub Actions logs** for specific failure details
2. **Security failures**: Cannot be bypassed, must be fixed
3. **Build failures**: Can be temporarily bypassed by maintainers with justification
4. **Test failures**: Investigate and fix or disable specific failing tests with issue tracking

### Override Process
- **Security gates**: No override possible
- **Build gates**: Maintainer override with security team approval
- **Process gates**: Repository admin override with audit trail

## 📚 Resources

- [GitHub Actions Workflows](/.github/workflows/)
- [Security Policy](./SECURITY.md) 
- [Contributing Guide](./CONTRIBUTING.md)
- [Deployment Guide](./docs/ops.md)