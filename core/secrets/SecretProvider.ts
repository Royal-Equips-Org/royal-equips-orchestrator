import crypto from 'crypto';

export type SecretKey = string;

export interface SecretResult {
  key: SecretKey;
  value: string;
  source: SecretSource;
  fetchedAt: number;
  ttl?: number;
}

export enum SecretSource {
  ENV = 'env',
  GITHUB = 'github-actions-env',
  CLOUDFLARE = 'cloudflare',
  EXTERNAL = 'external-vault',
  CACHE = 'cache'
}

export class SecretNotFoundError extends Error {
  constructor(public key: string) {
    super(`Secret '${key}' not found in any provider`);
    this.name = 'SecretNotFoundError';
  }
}

export class SecretExpiredError extends Error {
  constructor(public key: string) {
    super(`Secret '${key}' has expired`);
    this.name = 'SecretExpiredError';
  }
}

interface SecretProvider {
  get(key: SecretKey): Promise<SecretResult | null>;
  name: string;
}

class EnvProvider implements SecretProvider {
  name = 'EnvProvider';
  
  async get(key: string): Promise<SecretResult | null> {
    const v = process.env[key];
    if (!v) return null;
    return { 
      key, 
      value: v, 
      source: SecretSource.ENV, 
      fetchedAt: Date.now() 
    };
  }
}

// GitHub Actions secrets are injected as environment variables
class GitHubActionsProvider implements SecretProvider {
  name = 'GitHubActionsProvider';
  
  async get(key: string): Promise<SecretResult | null> {
    // Check for GitHub Actions specific environment
    if (!process.env.GITHUB_ACTIONS) return null;
    
    const v = process.env[key];
    if (!v) return null;
    
    return { 
      key, 
      value: v, 
      source: SecretSource.GITHUB, 
      fetchedAt: Date.now() 
    };
  }
}

// Placeholder provider for Cloudflare (Workers/Pages binding simulation)
class CloudflareProvider implements SecretProvider {
  name = 'CloudflareProvider';
  
  constructor(private bindings?: Record<string, string>) {}
  
  async get(key: string): Promise<SecretResult | null> {
    const v = this.bindings?.[key];
    if (!v) return null;
    
    return { 
      key, 
      value: v, 
      source: SecretSource.CLOUDFLARE, 
      fetchedAt: Date.now() 
    };
  }
}

// External vault adapter placeholder (e.g., AWS SSM)
class ExternalVaultProvider implements SecretProvider {
  name = 'ExternalVaultProvider';
  
  async get(key: string): Promise<SecretResult | null> {
    // TODO: Implement actual SSM / Vault / GCP Secret Manager integration as needed.
    // This is a placeholder interface to avoid vendor lock-in
    return null;
  }
}

interface CacheEntry {
  cipher: string;
  iv: string;
  source: SecretSource;
  ts: number;
  ttl?: number;
}

export interface SecretMetrics {
  onResolve?(key: string, source: SecretSource, depth: number, latencyMs: number): void;
  onMiss?(key: string): void;
  onCacheHit?(key: string, latencyMs: number): void;
  onCacheMiss?(key: string): void;
}

export interface UnifiedSecretOptions {
  cacheTTLms?: number;
  encryptionKey?: string; // 32 bytes hex string
  metrics?: SecretMetrics;
  providers?: SecretProvider[];
}

export class UnifiedSecretResolver {
  private providers: SecretProvider[] = [];
  private cache = new Map<string, CacheEntry>();
  private encKey: Buffer;
  
  constructor(private opts: UnifiedSecretOptions = {}) {
    // Initialize encryption key
    const keySource = opts.encryptionKey || 
                     process.env.SECRET_ENCRYPTION_KEY || 
                     'royal-equips-default-dev-key-change-in-prod';
    
    if (keySource === 'royal-equips-default-dev-key-change-in-prod') {
      console.warn(JSON.stringify({
        level: 'warn',
        event: 'secret_encryption_key_default',
        message: 'Using default encryption key - set SECRET_ENCRYPTION_KEY in production'
      }));
    }
    
    this.encKey = Buffer.from(
      crypto.createHash('sha256').update(keySource).digest('hex').slice(0, 32),
      'hex'
    );
    
    // Initialize providers
    this.providers = opts.providers || [
      new EnvProvider(),
      new GitHubActionsProvider(),
      new CloudflareProvider(),
      new ExternalVaultProvider()
    ];
  }

  registerProvider(provider: SecretProvider, priority = this.providers.length) {
    this.providers.splice(priority, 0, provider);
  }

  private encrypt(plain: string): { cipher: string; iv: string } {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encKey, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    return { 
      cipher: Buffer.concat([enc, tag]).toString('base64'), 
      iv: iv.toString('base64') 
    };
  }

  private decrypt(entry: CacheEntry): string {
    const raw = Buffer.from(entry.cipher, 'base64');
    const tag = raw.slice(raw.length - 16);
    const data = raw.slice(0, raw.length - 16);
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encKey,
      Buffer.from(entry.iv, 'base64')
    );
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  }

  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.ts > entry.ttl;
  }

  private createKeyHash(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex').slice(0, 8);
  }

  async getSecret(key: SecretKey, explicitTTLms?: number): Promise<SecretResult> {
    const cached = this.cache.get(key);
    
    // Check cache first
    if (cached && !this.isExpired(cached)) {
      const start = performance.now();
      const value = this.decrypt(cached);
      const latencyMs = performance.now() - start;
      
      this.opts.metrics?.onCacheHit?.(this.createKeyHash(key), latencyMs);
      this.opts.metrics?.onResolve?.(this.createKeyHash(key), SecretSource.CACHE, 0, latencyMs);
      
      return {
        key,
        value,
        source: SecretSource.CACHE,
        fetchedAt: cached.ts,
        ttl: cached.ttl
      };
    }

    if (cached) {
      // Remove expired entry
      this.cache.delete(key);
    }

    this.opts.metrics?.onCacheMiss?.(this.createKeyHash(key));

    const start = performance.now();
    
    // Try each provider in order
    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      const res = await provider.get(key);
      
      if (res) {
        const ttl = explicitTTLms ?? this.opts.cacheTTLms ?? 5 * 60_000; // 5 minutes default
        const { cipher, iv } = this.encrypt(res.value);
        
        // Cache the encrypted result
        this.cache.set(key, {
          cipher,
          iv,
          source: res.source,
          ts: Date.now(),
          ttl
        });

        const latencyMs = performance.now() - start;
        this.opts.metrics?.onResolve?.(this.createKeyHash(key), res.source, i + 1, latencyMs);
        
        return { ...res, ttl };
      }
    }

    const keyHash = this.createKeyHash(key);
    this.opts.metrics?.onMiss?.(keyHash);
    throw new SecretNotFoundError(key);
  }

  // Get secret with fallback for graceful degradation
  async getSecretWithFallback(key: SecretKey, fallback?: string): Promise<string> {
    try {
      const result = await this.getSecret(key);
      return result.value;
    } catch (error) {
      if (error instanceof SecretNotFoundError && fallback !== undefined) {
        return fallback;
      }
      throw error;
    }
  }

  // Clear cache for testing/debugging
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats for monitoring
  getCacheStats(): { size: number; entries: Array<{ key: string; source: string; age: number }> } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key: this.createKeyHash(key),
      source: entry.source,
      age: Date.now() - entry.ts
    }));

    return {
      size: this.cache.size,
      entries
    };
  }
}

// Create a default instance
export const secrets = new UnifiedSecretResolver({
  metrics: {
    onResolve: (keyHash, source, depth, latencyMs) =>
      console.log(JSON.stringify({ 
        level: 'info', 
        event: 'secret_resolve', 
        key_hash: keyHash, 
        source, 
        depth, 
        latency_ms: latencyMs,
        cache: source === SecretSource.CACHE
      })),
    onMiss: (keyHash) =>
      console.warn(JSON.stringify({ 
        level: 'warn', 
        event: 'secret_miss', 
        key_hash: keyHash 
      })),
    onCacheHit: (keyHash, latencyMs) =>
      console.log(JSON.stringify({
        level: 'debug',
        event: 'secret_cache_hit',
        key_hash: keyHash,
        latency_ms: latencyMs
      })),
    onCacheMiss: (keyHash) =>
      console.log(JSON.stringify({
        level: 'debug',
        event: 'secret_cache_miss',
        key_hash: keyHash
      }))
  }
});