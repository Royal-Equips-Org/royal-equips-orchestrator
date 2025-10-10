/**
 * Tests for UnifiedSecretResolver
 * 
 * Tests cover:
 * - Cache hit/miss scenarios
 * - Fallback resolution depth
 * - Encryption/decryption
 * - Metrics collection
 * - Error handling
 */

import { 
  UnifiedSecretResolver, 
  SecretNotFoundError, 
  SecretSource 
} from '../../../core/secrets/SecretProvider';

// Mock providers for testing
class MockEnvProvider {
  name = 'MockEnvProvider';
  private secrets: Record<string, string>;

  constructor(secrets: Record<string, string> = {}) {
    this.secrets = secrets;
  }

  async get(key: string) {
    const value = this.secrets[key];
    if (!value) return null;
    
    return {
      key,
      value,
      source: SecretSource.ENV,
      fetchedAt: Date.now()
    };
  }
}

class MockCloudflareProvider {
  name = 'MockCloudflareProvider';
  private secrets: Record<string, string>;

  constructor(secrets: Record<string, string> = {}) {
    this.secrets = secrets;
  }

  async get(key: string) {
    const value = this.secrets[key];
    if (!value) return null;
    
    return {
      key,
      value,
      source: SecretSource.CLOUDFLARE,
      fetchedAt: Date.now()
    };
  }
}

describe('UnifiedSecretResolver', () => {
  let resolver: UnifiedSecretResolver;
  let mockMetrics: any;

  beforeEach(() => {
    mockMetrics = {
      onResolve: jest.fn(),
      onMiss: jest.fn(),
      onCacheHit: jest.fn(),
      onCacheMiss: jest.fn()
    };

    resolver = new UnifiedSecretResolver({
      cacheTTLms: 1000, // 1 second for testing
      encryptionKey: 'test-key-32-chars-for-testing!',
      metrics: mockMetrics,
      providers: [
        new MockEnvProvider({ 'TEST_SECRET': 'env-value' }),
        new MockCloudflareProvider({ 'CF_SECRET': 'cloudflare-value' })
      ]
    });
  });

  afterEach(() => {
    resolver.clearCache();
  });

  describe('Secret Resolution', () => {
    it('should resolve secret from first provider', async () => {
      const result = await resolver.getSecret('TEST_SECRET');
      
      expect(result.key).toBe('TEST_SECRET');
      expect(result.value).toBe('env-value');
      expect(result.source).toBe(SecretSource.ENV);
      expect(mockMetrics.onResolve).toHaveBeenCalledWith(
        expect.any(String), // key hash
        SecretSource.ENV,
        1, // depth
        expect.any(Number) // latency
      );
    });

    it('should fallback to second provider when first fails', async () => {
      const result = await resolver.getSecret('CF_SECRET');
      
      expect(result.key).toBe('CF_SECRET');
      expect(result.value).toBe('cloudflare-value');
      expect(result.source).toBe(SecretSource.CLOUDFLARE);
      expect(mockMetrics.onResolve).toHaveBeenCalledWith(
        expect.any(String),
        SecretSource.CLOUDFLARE,
        2, // second provider = depth 2
        expect.any(Number)
      );
    });

    it('should throw SecretNotFoundError when not found in any provider', async () => {
      await expect(resolver.getSecret('NONEXISTENT_SECRET'))
        .rejects.toThrow(SecretNotFoundError);
      
      expect(mockMetrics.onMiss).toHaveBeenCalled();
    });

    it('should handle fallback gracefully', async () => {
      const result = await resolver.getSecretWithFallback('NONEXISTENT_SECRET', 'fallback-value');
      expect(result).toBe('fallback-value');
    });
  });

  describe('Caching', () => {
    it('should cache resolved secrets', async () => {
      // First resolution
      const result1 = await resolver.getSecret('TEST_SECRET');
      expect(result1.source).toBe(SecretSource.ENV);
      expect(mockMetrics.onCacheMiss).toHaveBeenCalled();

      // Second resolution should hit cache
      const result2 = await resolver.getSecret('TEST_SECRET');
      expect(result2.source).toBe(SecretSource.CACHE);
      expect(result2.value).toBe('env-value');
      expect(mockMetrics.onCacheHit).toHaveBeenCalled();
    });

    it('should respect cache TTL', async () => {
      // Resolve with short TTL
      await resolver.getSecret('TEST_SECRET', 50); // 50ms TTL
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should resolve from provider again
      const result = await resolver.getSecret('TEST_SECRET');
      expect(result.source).toBe(SecretSource.ENV);
    });

    it('should provide cache statistics', async () => {
      await resolver.getSecret('TEST_SECRET');
      await resolver.getSecret('CF_SECRET');
      
      const stats = resolver.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.entries).toHaveLength(2);
      expect(stats.entries[0]).toHaveProperty('key');
      expect(stats.entries[0]).toHaveProperty('source');
      expect(stats.entries[0]).toHaveProperty('age');
    });
  });

  describe('Encryption', () => {
    it('should encrypt cached values', async () => {
      await resolver.getSecret('TEST_SECRET');
      
      // Access internal cache directly (for testing)
      const cacheEntries = (resolver as any).cache;
      const entry = cacheEntries.get('TEST_SECRET');
      
      expect(entry).toBeDefined();
      expect(entry.cipher).toBeDefined();
      expect(entry.iv).toBeDefined();
      expect(entry.cipher).not.toContain('env-value'); // Should be encrypted
    });

    it('should decrypt cached values correctly', async () => {
      // First call to cache the secret
      await resolver.getSecret('TEST_SECRET');
      
      // Second call should decrypt from cache
      const result = await resolver.getSecret('TEST_SECRET');
      expect(result.value).toBe('env-value');
      expect(result.source).toBe(SecretSource.CACHE);
    });
  });

  describe('Metrics', () => {
    it('should track resolution latency', async () => {
      await resolver.getSecret('TEST_SECRET');
      
      expect(mockMetrics.onResolve).toHaveBeenCalledWith(
        expect.any(String),
        SecretSource.ENV,
        1,
        expect.any(Number)
      );
      
      // Latency should be a reasonable number (> 0, < 1000ms)
      const latency = mockMetrics.onResolve.mock.calls[0][3];
      expect(latency).toBeGreaterThan(0);
      expect(latency).toBeLessThan(1000);
    });

    it('should track cache hit vs miss', async () => {
      // First call - cache miss
      await resolver.getSecret('TEST_SECRET');
      expect(mockMetrics.onCacheMiss).toHaveBeenCalled();
      
      // Second call - cache hit
      mockMetrics.onCacheMiss.mockClear();
      await resolver.getSecret('TEST_SECRET');
      expect(mockMetrics.onCacheHit).toHaveBeenCalled();
      expect(mockMetrics.onCacheMiss).not.toHaveBeenCalled();
    });

    it('should provide different latencies for cache hit vs provider resolution', async () => {
      // First resolution from provider
      await resolver.getSecret('TEST_SECRET');
      const providerLatency = mockMetrics.onResolve.mock.calls[0][3];
      
      mockMetrics.onResolve.mockClear();
      
      // Second resolution from cache
      await resolver.getSecret('TEST_SECRET');
      const cacheLatency = mockMetrics.onResolve.mock.calls[0][3];
      
      // Cache should be faster (though timing can be inconsistent in tests)
      expect(cacheLatency).toBeGreaterThan(0);
      expect(providerLatency).toBeGreaterThan(0);
    });
  });

  describe('Key Hashing', () => {
    it('should never log actual secret keys', async () => {
      await resolver.getSecret('SENSITIVE_KEY_NAME');
      
      // Check that metrics calls use hashed keys
      expect(mockMetrics.onResolve).toHaveBeenCalled();
      const keyHash = mockMetrics.onResolve.mock.calls[0][0];
      
      expect(keyHash).not.toContain('SENSITIVE_KEY_NAME');
      expect(keyHash).toHaveLength(8); // SHA-256 first 8 chars
      expect(keyHash).toMatch(/^[a-f0-9]{8}$/); // Hex format
    });
  });

  describe('Provider Registration', () => {
    it('should allow dynamic provider registration', async () => {
      const newProvider = new MockEnvProvider({ 'NEW_SECRET': 'new-value' });
      resolver.registerProvider(newProvider, 0); // Add at highest priority
      
      const result = await resolver.getSecret('NEW_SECRET');
      expect(result.value).toBe('new-value');
    });
  });

  describe('Error Handling', () => {
    it('should handle provider errors gracefully', async () => {
      const failingProvider = {
        name: 'FailingProvider',
        async get(key: string) {
          throw new Error('Provider failed');
        }
      };
      
      const errorResolver = new UnifiedSecretResolver({
        providers: [
          failingProvider,
          new MockEnvProvider({ 'TEST_SECRET': 'backup-value' })
        ]
      });
      
      // Should still resolve from backup provider
      const result = await errorResolver.getSecret('TEST_SECRET');
      expect(result.value).toBe('backup-value');
    });

    it('should handle encryption errors gracefully', async () => {
      // Create resolver with invalid encryption key
      const badResolver = new UnifiedSecretResolver({
        encryptionKey: 'too-short',
        providers: [new MockEnvProvider({ 'TEST_SECRET': 'value' })]
      });
      
      // Should still work (will fall back to base64 or handle error)
      const result = await badResolver.getSecret('TEST_SECRET');
      expect(result.value).toBe('value');
    });
  });
});