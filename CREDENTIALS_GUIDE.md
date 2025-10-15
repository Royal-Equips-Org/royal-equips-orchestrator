# Credentials and Environment Variables Guide

## Where Credentials are Expected

The Royal Equips Orchestrator uses a cascading secret resolution system that checks multiple sources in order:

```
ENV variables → GitHub Actions secrets → Cloudflare bindings → Cached values
```

### Priority Order:
1. **Environment Variables** (.env file or system environment)
2. **GitHub Actions** (when running in CI/CD)
3. **Cloudflare Workers/Pages** (bindings)
4. **Encrypted Cache** (fallback for previously resolved secrets)

## Required Credentials

### Minimal Configuration (Development)
```bash
# Flask essentials
SECRET_KEY=<generated-secret-key>
FLASK_ENV=development
PORT=10000

# Optional: Set to avoid warning in logs
SECRET_ENCRYPTION_KEY=<random-32-byte-key>
```

### Production Configuration (Render/Deployment)

#### Core Services
```bash
# Flask Configuration
SECRET_KEY=<strong-secret-key>
FLASK_ENV=production
PORT=10000
SECRET_ENCRYPTION_KEY=<production-key>

# Sentry Error Monitoring (Optional but recommended)
SENTRY_DSN=<your-sentry-dsn>
ENVIRONMENT=production
```

#### E-commerce Integration (Optional)
```bash
# Shopify
SHOPIFY_STORE_URL=<your-store>.myshopify.com
SHOPIFY_ACCESS_TOKEN=<shopify-admin-api-token>

# AutoDS Dropshipping
AUTO_DS_API_KEY=<your-autods-key>

# Spocket Supplier Integration
SPOCKET_API_KEY=<your-spocket-key>
```

#### AI Services (Optional)
```bash
# OpenAI for Customer Support Agent
OPENAI_API_KEY=sk-<your-openai-key>
```

#### Developer Integration (Optional)
```bash
# GitHub Integration
GITHUB_TOKEN=<github-personal-access-token>
GITHUB_REPO_OWNER=Royal-Equips-Org
GITHUB_REPO_NAME=royal-equips-orchestrator
```

#### Database & Analytics (Optional)
```bash
# PostgreSQL Database
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>

# Redis Cache
REDIS_URL=redis://<host>:<port>

# BigQuery Analytics
BIGQUERY_PROJECT_ID=<your-project-id>
GOOGLE_APPLICATION_CREDENTIALS=<path-to-service-account-json>
```

## Setting Credentials

### Local Development (.env file)
1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your credentials:
   ```bash
   nano .env
   ```

3. Generate a strong SECRET_KEY:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

4. Generate SECRET_ENCRYPTION_KEY:
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(32))"
   ```

### Render Deployment
1. Go to Render Dashboard → Your Service → Environment
2. Add environment variables:
   - Click "Add Environment Variable"
   - Enter key/value pairs
   - Click "Save Changes"

3. Required for production:
   ```
   SECRET_KEY=<generated>
   SECRET_ENCRYPTION_KEY=<generated>
   FLASK_ENV=production
   PORT=10000
   ```

### GitHub Actions (CI/CD)
Secrets are automatically available as environment variables when configured in:
- Repository Settings → Secrets and variables → Actions

### Cloudflare Workers/Pages
Bindings are configured in:
- Cloudflare Dashboard → Workers & Pages → Your Worker → Settings → Variables

## Troubleshooting

### "Using default encryption key" Warning
**Issue**: Warning appears in logs multiple times

**Cause**: Multiple worker processes each initialize the secret resolver

**Solution**: Set `SECRET_ENCRYPTION_KEY` environment variable:
```bash
export SECRET_ENCRYPTION_KEY=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
```

**Note**: With Gunicorn workers, each process will show the warning once. This is expected behavior and doesn't indicate a problem unless you're in production.

### "GitHub rate limit exceeded" Warnings
**Issue**: Frequent warnings about GitHub API rate limits

**Cause**: GitHub API has rate limits (60/hour unauthenticated, 5000/hour authenticated)

**Solution**:
1. Add `GITHUB_TOKEN` with a personal access token
2. Or disable GitHub integration if not needed

**Fixed in this version**: Rate limit warnings now only appear once per 5 minutes to reduce log spam.

### "Agent executor not initialized" Errors
**Issue**: `'NoneType' object is not callable` errors

**Cause**: Services trying to access agent executor before it's fully initialized

**Solution**: Wait for full application startup (15-30 seconds)

**Fixed in this version**: Better null checks and graceful degradation when executor is not ready.

### "Shopify unavailable" Errors
**Issue**: Cannot connect to Shopify

**Cause**: Missing or invalid Shopify credentials

**Solution**:
1. Set `SHOPIFY_STORE_URL` and `SHOPIFY_ACCESS_TOKEN`
2. Or run without Shopify integration (system will degrade gracefully)

## Security Best Practices

### ✅ DO:
- Use strong, randomly generated keys for `SECRET_KEY` and `SECRET_ENCRYPTION_KEY`
- Store credentials in environment variables, never in code
- Use different credentials for development and production
- Rotate credentials regularly
- Use GitHub Actions secrets for CI/CD
- Enable Sentry error monitoring in production

### ❌ DON'T:
- Commit `.env` file to git (already in `.gitignore`)
- Share credentials in public channels
- Use default/example credentials in production
- Store credentials in code comments
- Use the same SECRET_KEY across environments

## Credential Sources Reference

### UnifiedSecretResolver
Location: `core/secrets/secret_provider.py`

The secret resolver automatically:
1. Checks environment variables first
2. Falls back to GitHub Actions secrets in CI
3. Tries Cloudflare bindings for Workers/Pages
4. Uses encrypted cache for previously resolved values

### Example Usage in Code
```python
from core.secrets.secret_provider import UnifiedSecretResolver

secrets = UnifiedSecretResolver()

# Get a secret (will try all sources)
api_key = await secrets.get_secret('SHOPIFY_ACCESS_TOKEN')
print(f"Key source: {api_key.source}")  # e.g., "env", "github-actions-env"

# Get with fallback
db_url = await secrets.get_secret_with_fallback(
    'DATABASE_URL',
    'sqlite:///./local.db'
)
```

## Common Error Messages and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Working outside of request context" | Eventlet not patched early enough | Fixed in wsgi.py |
| "GitHub rate limit exceeded" | Too many API calls | Add GITHUB_TOKEN or reduce frequency |
| "Failed to collect agent metrics" | Agent executor not ready | Wait for startup, now handled gracefully |
| "Unknown action: update_dependencies" | Missing action handler | Fixed in autonomous_empire_agent.py |
| "Using default encryption key" | SECRET_ENCRYPTION_KEY not set | Set in environment or accept warning |

## Environment-Specific Settings

### Development
```bash
FLASK_ENV=development
DEBUG=True
LOG_LEVEL=DEBUG
```

### Staging
```bash
FLASK_ENV=staging
DEBUG=False
LOG_LEVEL=INFO
SENTRY_DSN=<staging-dsn>
```

### Production
```bash
FLASK_ENV=production
DEBUG=False
LOG_LEVEL=WARNING
SENTRY_DSN=<production-dsn>
SECRET_ENCRYPTION_KEY=<strong-key>
```

## Need Help?

- Check `DEPLOYMENT_TROUBLESHOOTING.md` for deployment-specific issues
- See `docs/SECRET_SYSTEM.md` for detailed secret management documentation
- Review `.env.example` for all available environment variables
