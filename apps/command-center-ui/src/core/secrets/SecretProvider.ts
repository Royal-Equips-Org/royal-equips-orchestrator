
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

interface SecretProvider {
  get(key: SecretKey): Promise<SecretResult | null>;
  name: string;
}

class EnvProvider implements SecretProvider {
  name = 'EnvProvider';
  async get(key: string): Promise<SecretResult | null> {
    // In browser environment, we can't access process.env directly
    // Instead we get values from runtime config or build-time injection
    const envValue = this.getBrowserEnvValue(key);
    if (!envValue) return null;
    return { key, value: envValue, source: SecretSource.ENV, fetchedAt: Date.now() };
  }

  private getBrowserEnvValue(key: string): string | null {
    // Check if value was injected at build time (Vite env vars)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const viteKey = `VITE_${key}`;
      return import.meta.env[viteKey] || null;
    }
    
    // Check runtime config
    try {
      const runtimeConfig = (window as any).__RUNTIME_CONFIG__;
      return runtimeConfig?.[key] || null;
    } catch {
      return null;
    }
  }
}

// Placeholder provider for Cloudflare (Workers/Pages binding simulation)
class CloudflareProvider implements SecretProvider {
  name = 'CloudflareProvider';
  constructor(private bindings?: Record<string, string>) {}
  async get(key: string): Promise<SecretResult | null> {
    const v = this.bindings?.[key];
    if (!v) return null;
    return { key, value: v, source: SecretSource.CLOUDFLARE, fetchedAt: Date.now() };
  }
}

// External vault adapter placeholder (e.g., AWS SSM)
class ExternalVaultProvider implements SecretProvider {
  name = 'ExternalVaultProvider';
  async get(key: string): Promise<SecretResult | null> {
    // Implement actual SSM / Vault / GCP Secret Manager integration as needed.
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

export interface UnifiedSecretOptions {
  cacheTTLms?: number;
  encryptionKey?: string; // 32 bytes base64
  metrics?: {
    onResolve?(key: string, source: SecretSource, depth: number, ms: number): void;
    onMiss?(key: string): void;
  };
}

export class UnifiedSecretResolver {
  private providers: SecretProvider[] = [];
  private cache = new Map<string, CacheEntry>();
  private encKey: string;
  
  constructor(private opts: UnifiedSecretOptions = {}) {
    if (!opts.encryptionKey) {
      throw new Error('Encryption key must be provided externally and cannot have a default value.');
    }
    this.encKey = opts.encryptionKey;
    this.providers = [
      new EnvProvider(),
      // GitHub Actions secrets already appear in env (covered above, but keep placeholder if extended)
      new CloudflareProvider(),
      new ExternalVaultProvider()
    ];
  }

  registerProvider(provider: SecretProvider, priority = this.providers.length) {
    this.providers.splice(priority, 0, provider);
  }

  private encrypt(plain: string): { cipher: string; iv: string } {
    // Simple browser-compatible encryption using Web Crypto API would be better
    // For now, use base64 encoding as placeholder (not secure for production)
    const encoded = btoa(plain);
    const iv = Math.random().toString(36);
    return { cipher: encoded, iv };
  }

  private decrypt(entry: CacheEntry): string {
    // Simple base64 decoding as placeholder
    try {
      return atob(entry.cipher);
    } catch {
      return '';
    }
  }

  private isExpired(entry: CacheEntry): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.ts > entry.ttl;
  }

  async getSecret(key: SecretKey, explicitTTLms?: number): Promise<SecretResult> {
    const cached = this.cache.get(key);
    if (cached && !this.isExpired(cached)) {
      const start = performance.now();
      const value = this.decrypt(cached);
      this.opts.metrics?.onResolve?.(key, SecretSource.CACHE, 0, performance.now() - start);
      return {
        key,
        value,
        source: SecretSource.CACHE,
        fetchedAt: cached.ts,
        ttl: cached.ttl
      };
    }

    const start = performance.now();
    for (let i = 0; i < this.providers.length; i++) {
      const provider = this.providers[i];
      const res = await provider.get(key);
      if (res) {
        const ttl = explicitTTLms ?? this.opts.cacheTTLms ?? 5 * 60_000;
        const { cipher, iv } = this.encrypt(res.value);
        this.cache.set(key, {
          cipher,
          iv,
          source: res.source,
          ts: Date.now(),
          ttl
        });
        this.opts.metrics?.onResolve?.(key, res.source, i + 1, performance.now() - start);
        return { ...res, ttl };
      }
    }

    this.opts.metrics?.onMiss?.(key);
    throw new SecretNotFoundError(key);
  }
}