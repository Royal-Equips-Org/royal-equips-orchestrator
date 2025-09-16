# Security Policy
# SECURITY.md
## Reporting
Email: pro.jokhoe2@gmail.com 72h SLA.  
## Scope
Code, pipelines, infra, supply chain.  
## Controls
Signed commits, RBAC, least privilege, WAF, DDoS, secret scanning, SBOM, Trivy, CodeQL.  
## Handling
Triage → contain → fix → rotate secrets → postmortem.

## Supported Versions

We actively maintain security updates for the following versions of Royal Equips Orchestrator:

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| 2.x.x   | :white_check_mark: | Current major version with full security support |
| 1.x.x   | :warning:          | Legacy support - critical security fixes only |
| < 1.0   | :x:                | No longer supported |

## Security Features

Royal Equips Orchestrator implements multiple layers of security:

### MCP Server Security
- **HMAC Authentication**: All orchestrator API calls use HMAC signatures
- **Circuit Breakers**: Prevent cascade failures and DoS scenarios
- **Rate Limiting**: Token bucket algorithm protects against abuse
- **Input Validation**: All user inputs are validated and sanitized
- **Secure Defaults**: All security features enabled by default

### Application Security
- **Environment Variable Management**: Secrets never committed to code
- **Dependency Scanning**: Automated vulnerability scanning with `pip-audit`
- **Static Code Analysis**: Security issues detected with `bandit`
- **HTTPS Enforcement**: TLS/SSL required in production environments

### Infrastructure Security
- **Container Security**: Multi-stage Docker builds with minimal attack surface
- **Secret Management**: Integration with secure secret stores
- **Network Policies**: Restrictive networking and firewall rules
- **Monitoring**: Comprehensive logging and alerting for security events

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

### 1. Do NOT create a public GitHub issue

Security vulnerabilities should be reported privately to allow us to patch them before public disclosure.

### 2. Report via GitHub Security Advisories (Preferred)

1. Go to the [Security tab](https://github.com/Skidaw23/royal-equips-orchestrator/security) in our repository
2. Click "Report a vulnerability"
3. Fill out the vulnerability report form with as much detail as possible

### 3. Alternative: Email Report

Send an email to: **security@royalequips.com** (if available) or create a private issue.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (if known)

### 4. What to Expect

- **Acknowledgment**: We will acknowledge receipt within 24 hours
- **Initial Assessment**: Initial vulnerability assessment within 72 hours
- **Regular Updates**: Weekly updates on progress (minimum)
- **Resolution Timeline**: 
  - Critical vulnerabilities: 7 days
  - High severity: 30 days  
  - Medium/Low severity: 90 days

## Vulnerability Disclosure Process

### Our Commitment

1. **Responsible Disclosure**: We follow coordinated disclosure practices
2. **Credit**: Security researchers will be credited (unless they prefer anonymity)
3. **Transparency**: Public disclosure after patches are available and deployed

### Timeline

1. **Day 0**: Vulnerability reported
2. **Day 1**: Acknowledgment and initial triage
3. **Day 3**: Detailed assessment and severity classification
4. **Day 7-90**: Fix development and testing (depending on severity)
5. **Day 90+**: Public disclosure and security advisory publication

## Security Best Practices for Users

### Environment Setup
```bash
# Use strong, unique secrets
export ORCHESTRATOR_HMAC_KEY="$(openssl rand -base64 32)"
export SHOPIFY_GRAPHQL_TOKEN="your-secure-shopify-token"

# Enable security features
export ENABLE_RATE_LIMITING=true
export ENABLE_CIRCUIT_BREAKER=true
export LOG_SECURITY_EVENTS=true
```

### Production Deployment
- Use HTTPS/TLS for all communications
- Implement proper firewall rules
- Use container security scanning
- Enable monitoring and alerting
- Keep dependencies updated
- Use secret management systems

### Regular Security Maintenance
```bash
# Run security scans regularly
make scan

# Update dependencies
pip-audit --fix

# Check for vulnerabilities
bandit -r royal_mcp/ api/ app/ orchestrator/
```

## Security Contact

For security-related questions or concerns:

- **Security Reports**: Use GitHub Security Advisories or email security@royalequips.com
- **General Security Questions**: Create a GitHub Discussion in the Security category
- **Documentation Issues**: Submit a regular GitHub issue

## Acknowledgments

We appreciate the security research community and will recognize contributors who help improve our security posture.

### Hall of Fame

Contributors who have responsibly disclosed security vulnerabilities will be listed here (with their permission).

---

Last updated: January 2024

