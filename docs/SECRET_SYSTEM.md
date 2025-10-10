# Royal Equips Secret Resolution System

A multi-layer, encrypted secret resolution system with fallback providers and performance monitoring.

## Overview

The Royal Equips Orchestrator implements a sophisticated secret management system that:

- **Multi-layer Resolution**: Attempts secret resolution across multiple providers in order
- **Encrypted Caching**: Stores resolved secrets in encrypted cache with TTL
- **Performance Monitoring**: Tracks resolution latency, cache hit ratios, and fallback depth
- **Security-First**: Never logs actual secret values; uses SHA-256 key hashes for monitoring
- **Language Agnostic**: Identical APIs available in TypeScript and Python

## Architecture

### Resolution Order

1. **Environment Variables** (`ENV`) - Process environment variables
2. **GitHub Actions** (`GITHUB`) - GitHub Actions injected environment variables  
3. **Cloudflare** (`CLOUDFLARE`) - Cloudflare Workers/Pages environment bindings
4. **External Vault** (`EXTERNAL`) - Pluggable interface for AWS SSM, HashiCorp Vault, etc.
5. **Cache** (`CACHE`) - Encrypted in-memory cache (if available and not expired)

### Security Features

- **AES-256-GCM Encryption**: All cached secrets are encrypted at rest
- **Key Derivation**: Encryption keys derived from `SECRET_ENCRYPTION_KEY` environment variable
- **No Plaintext Logging**: Actual secret keys/values are never written to logs
- **Key Hashing**: Uses SHA-256 hash (first 8 chars) for monitoring and debugging
- **TTL Support**: Cached secrets expire based on configurable TTL

## Usage

### TypeScript

```typescript
import { secrets, UnifiedSecretResolver } from '../core/secrets/SecretProvider';

// Using default instance
const apiKey = await secrets.getSecret('STRIPE_API_KEY');
console.log(`Resolved: ${apiKey.value}`);

// With fallback for graceful degradation  
const dbUrl = await secrets.getSecretWithFallback('DATABASE_URL', 'sqlite://memory');

// Custom resolver with metrics
const customResolver = new UnifiedSecretResolver({
  cacheTTLms: 300000, // 5 minutes
  metrics: {
    onResolve: (keyHash, source, depth, latencyMs) => {
      console.log(`Secret resolved: ${keyHash} from ${source} in ${latencyMs}ms`);
    },
    onMiss: (keyHash) => {
      console.warn(`Secret not found: ${keyHash}`);
    }
  }
});
```

### Python

```python
import asyncio
from core.secrets.secret_provider import secrets, UnifiedSecretResolver

# Using default instance
async def main():
    api_key = await secrets.get_secret('STRIPE_API_KEY')
    print(f"Resolved: {api_key.value}")
    
    # With fallback
    db_url = await secrets.get_secret_with_fallback('DATABASE_URL', 'sqlite://memory')
    
    # Get cache statistics
    stats = secrets.get_cache_stats()
    print(f"Cache size: {stats['size']}")

asyncio.run(main())
```

## Configuration

### Environment Variables

- `SECRET_ENCRYPTION_KEY`: 32-byte encryption key for cache encryption (required for production)
- `LOG_LEVEL`: Logging level for structured output (`debug`, `info`, `warn`, `error`)
- `GITHUB_ACTIONS`: Automatically detected to enable GitHub Actions provider

### Provider Configuration

```typescript
// TypeScript: Custom provider registration
const customProvider = {
  name: 'HashiCorpVault',
  async get(key: string) {
    // Implement vault integration
    return { key, value: 'secret-value', source: 'external-vault', fetchedAt: Date.now() };
  }
};

resolver.registerProvider(customProvider, 0); // Insert at highest priority
```

```python
# Python: Custom provider registration  
class HashiCorpVaultProvider:
    name = "HashiCorpVault"
    
    async def get(self, key: str):
        # Implement vault integration
        return SecretResult(
            key=key,
            value="secret-value", 
            source=SecretSource.EXTERNAL,
            fetched_at=time.time()
        )

resolver.register_provider(HashiCorpVaultProvider(), 0)
```

## Monitoring & Metrics

### Structured Logging Events

All events are logged as JSON with the following structure:

```json
{
  "level": "info",
  "event": "secret_resolve",
  "key_hash": "a1b2c3d4",
  "source": "env",
  "depth": 1,
  "latency_ms": 2.5,
  "cache": false,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Key Events

- `secret_resolve`: Successful secret resolution with timing and source
- `secret_miss`: Secret not found in any provider
- `secret_cache_hit`: Secret resolved from encrypted cache
- `secret_cache_miss`: Cache miss, resolution required from providers
- `secret_provider_error`: Individual provider failed (with fallback)

### Performance Metrics

The system tracks:

- **Resolution Latency**: Time to resolve secrets (cache vs provider)
- **Cache Hit Ratio**: Percentage of requests served from cache
- **Fallback Depth**: How deep in the provider chain resolution occurred
- **Provider Reliability**: Error rates per provider

## Testing

### Running Tests

```bash
# TypeScript tests
pnpm test

# Python tests  
python -m pytest tests/python/ -v

# With coverage
python -m pytest tests/python/ --cov=core/secrets --cov-report=html
```

### Test Coverage

- ✅ Secret resolution from all provider types
- ✅ Cache hit/miss scenarios with encryption
- ✅ Fallback provider chain resolution
- ✅ Error handling and graceful degradation
- ✅ Metrics collection and key hashing
- ✅ TTL expiration and cache management
- ✅ Concurrent access patterns

## Security Considerations

### Production Deployment

1. **Set Strong Encryption Key**: Generate a cryptographically secure 32-byte key:
   ```bash
   openssl rand -hex 32 | base64
   ```

2. **Rotate Keys Regularly**: Implement key rotation strategy for long-running services

3. **Monitor Access Patterns**: Watch for unusual secret access patterns in logs

4. **Network Security**: Ensure external vault connections use TLS and proper authentication

### Key Rotation

When rotating the `SECRET_ENCRYPTION_KEY`:

1. Clear existing cache: `resolver.clearCache()`
2. Update environment variable
3. Restart service
4. Monitor for resolution latency increase (cache rebuilding)

## Integration Examples

### Express.js Middleware

```typescript
import { createRequestLogger } from '../core/logging/logger';
import { secrets } from '../core/secrets/SecretProvider';

app.use(async (req, res, next) => {
  req.logger = createRequestLogger(req.id, req.user?.id);
  
  // Inject secrets for request context
  req.secrets = {
    async get(key: string) {
      return secrets.getSecret(key);
    }
  };
  
  next();
});
```

### FastAPI Dependency

```python
from fastapi import Depends
from core.secrets.secret_provider import secrets

async def get_api_key() -> str:
    result = await secrets.get_secret("API_KEY")
    return result.value

@app.get("/protected")
async def protected_endpoint(api_key: str = Depends(get_api_key)):
    return {"message": "Access granted"}
```

## Troubleshooting

### Common Issues

**Secret Not Found**
```json
{"level": "warn", "event": "secret_miss", "key_hash": "a1b2c3d4"}
```
- Check if secret exists in any configured provider
- Verify provider configuration and connectivity
- Consider adding fallback values for non-critical secrets

**Cache Encryption Errors**
```
ValueError: AESGCM key must be 128, 192, or 256 bits
```
- Ensure `SECRET_ENCRYPTION_KEY` is exactly 32 bytes
- Check base64 encoding if key is encoded

**High Resolution Latency**
```json
{"level": "info", "event": "secret_resolve", "latency_ms": 5000}
```
- External provider timeouts - check network connectivity
- Cache misses due to short TTL - consider increasing cache duration
- Provider ordering - move faster providers earlier in chain

### Debug Logging

Enable debug logging to see detailed resolution flow:

```bash
export LOG_LEVEL=debug
```

This will show cache lookups, provider attempts, and encryption operations.

## Roadmap

### Planned Features

- **Distributed Cache**: Redis backend for multi-instance deployments
- **Key Versioning**: Support for secret rotation with graceful fallbacks  
- **Audit Trail**: Detailed access logging for compliance
- **Dynamic Refresh**: Background refresh of cached secrets before expiration
- **Health Checks**: Provider availability monitoring and circuit breakers

### Provider Integrations

- AWS Systems Manager Parameter Store
- HashiCorp Vault
- Azure Key Vault  
- Google Secret Manager
- Kubernetes Secrets

## Contributing

When adding new providers:

1. Implement the `SecretProvider` interface
2. Add comprehensive tests including error scenarios
3. Update documentation with configuration examples
4. Ensure consistent error handling and logging
5. Maintain security best practices (no plaintext logging)

See `tests/python/test_secret_provider.py` and `tests/unit/secrets/SecretProvider.test.ts` for testing patterns.