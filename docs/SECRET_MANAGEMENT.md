# Secret Management & Security Best Practices

## 🔒 Security Policy Compliance

This repository follows the Royal Equips Organization security directives:

- ✅ **Zero hardcoded secrets** - All credentials via environment variables
- ✅ **Automated secret scanning** - Gitleaks integration in CI/CD
- ✅ **Pre-commit protection** - Local hooks prevent secret commits
- ✅ **Audit logging** - Structured JSON logging for all operations
- ✅ **Environment isolation** - Secrets only via ORG secrets or approved managers

## 🛡️ Secret Detection & Prevention

### Automated Scanning
- **Gitleaks** runs in GitHub Actions on every commit
- **Pre-commit hooks** prevent local secret commits
- **SARIF reports** provide detailed findings for remediation

### Configuration
```toml
# .gitleaks.toml - Custom rules for this repository
title = "Royal Equips Orchestrator Security Scan"
[extend]
useDefault = true
```

## 🔧 Proper Secret Management

### Environment Variables Pattern
```bash
# ✅ CORRECT - Use placeholders in documentation
export SHOPIFY_GRAPHQL_TOKEN="shpat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key-here"
export ORCHESTRATOR_HMAC_KEY="your-secret-hmac-key-here"

# ❌ WRONG - Never commit real secrets
export OPENAI_API_KEY="your-openai-api-key-here"  # Use proper placeholders!
```

### Python Code Pattern
```python
import os
import logging

logger = logging.getLogger("royal_equips")

# ✅ CORRECT - Load from environment
API_KEY = os.environ.get("STRIPE_API_KEY")
if not API_KEY:
    logger.error("STRIPE_API_KEY not found in environment variables")
    # Fail gracefully or trigger alert
```

### GitHub Actions Integration
```yaml
env:
  STRIPE_API_KEY: ${{ secrets.ORG_STRIPE_API_KEY }}
  SHOPIFY_TOKEN: ${{ secrets.ORG_SHOPIFY_TOKEN }}
```

## 🚨 Incident Response

### If Secrets Are Detected
1. **Immediate**: Remove secrets from code
2. **Rotate**: Change all affected credentials at provider
3. **Audit**: Check logs for potential unauthorized access  
4. **Document**: Record incident and remediation steps

### Secret Rotation Checklist
- [ ] Remove hardcoded secret from code
- [ ] Update secret at provider (API key rotation)
- [ ] Update environment variables/GitHub secrets
- [ ] Test all dependent services
- [ ] Monitor for authentication failures
- [ ] Document change in audit log

## 🔄 Git History Cleanup

### For Committed Secrets
If secrets were committed to git history, use these tools:

```bash
# Option 1: git-filter-repo (recommended)
git filter-repo --invert-paths --path secrets.txt

# Option 2: BFG Repo-Cleaner
java -jar bfg.jar --delete-files secrets.txt
git reflog expire --expire=now --all && git gc --prune=now --aggressive
```

### Force Push Communication
```bash
# After history rewrite
git push --force-with-lease origin main

# Notify team
echo "🚨 Git history rewritten to remove secrets"
echo "   Please run: git pull --rebase"
echo "   All team members must re-clone or rebase"
```

## 📋 Security Workflow

### Pre-Commit (Local)
```bash
# Install Gitleaks
brew install gitleaks  # macOS
# or download from: https://github.com/gitleaks/gitleaks/releases

# Enable pre-commit hooks
cp .pre-commit-hook.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### CI/CD (GitHub Actions)
- Gitleaks runs on every push/PR
- Security gate blocks deployment if secrets found
- SARIF reports uploaded for analysis
- Notifications sent for security failures

### Monitoring & Alerts
- Failed security scans trigger alerts
- Structured logging captures all secret access attempts
- Regular security reviews and dependency updates

## 🔗 Integration Points

### Supported Secret Stores
- GitHub Actions Secrets (Organization level)
- Environment variables (Development)
- HashiCorp Vault (Production)
- AWS Secrets Manager (Cloud deployment)

### Logging Pattern
```python
# Structured logging for security events
logger.info("secret_access", extra={
    "event_type": "api_key_retrieved",
    "service": "shopify_graphql", 
    "user_id": user.id,
    "timestamp": datetime.utcnow().isoformat(),
    "success": True
})
```

## 📚 Resources

- [Gitleaks Documentation](https://github.com/gitleaks/gitleaks)
- [GitHub Secrets Management](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [OWASP Secret Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [Royal Equips Security Policy](SECURITY.md)

---

**Remember**: When in doubt, treat it as a secret and use environment variables. 
Security is easier to implement than to remediate after a breach.