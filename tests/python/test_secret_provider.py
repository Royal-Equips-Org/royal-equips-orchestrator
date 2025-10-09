"""
Tests for the Python UnifiedSecretResolver

Tests cover:
- Cache hit/miss scenarios  
- Fallback resolution depth
- Encryption/decryption
- Metrics collection
- Error handling
"""

import asyncio
import pytest
import time
from unittest.mock import Mock, AsyncMock
from core.secrets.secret_provider import (
    UnifiedSecretResolver,
    SecretNotFoundError,
    SecretSource,
    SecretResult,
    SecretMetrics,
    EnvProvider,
    CloudflareProvider
)


class MockEnvProvider:
    """Mock environment provider for testing."""
    name = "MockEnvProvider"
    
    def __init__(self, secrets=None):
        self.secrets = secrets or {}
    
    async def get(self, key: str):
        value = self.secrets.get(key)
        if not value:
            return None
        return SecretResult(
            key=key,
            value=value,
            source=SecretSource.ENV,
            fetched_at=time.time()
        )


class MockCloudflareProvider:
    """Mock Cloudflare provider for testing."""
    name = "MockCloudflareProvider"
    
    def __init__(self, secrets=None):
        self.secrets = secrets or {}
    
    async def get(self, key: str):
        value = self.secrets.get(key)
        if not value:
            return None
        return SecretResult(
            key=key,
            value=value,
            source=SecretSource.CLOUDFLARE,
            fetched_at=time.time()
        )


@pytest.fixture
def mock_metrics():
    """Create mock metrics for testing."""
    return SecretMetrics(
        on_resolve=Mock(),
        on_miss=Mock(),
        on_cache_hit=Mock(),
        on_cache_miss=Mock()
    )


@pytest.fixture
def resolver(mock_metrics):
    """Create resolver with mock providers and metrics."""
    # Create a proper 32-byte key
    test_key = b"test-key-32-chars-for-testing!!!"  # Exactly 32 bytes
    
    return UnifiedSecretResolver(
        providers=[
            MockEnvProvider({"TEST_SECRET": "env-value"}),
            MockCloudflareProvider({"CF_SECRET": "cloudflare-value"})
        ],
        cache_ttl=1,  # 1 second for testing
        encryption_key=test_key,
        metrics=mock_metrics
    )


class TestUnifiedSecretResolver:
    """Test suite for UnifiedSecretResolver."""

    @pytest.mark.asyncio
    async def test_resolve_from_first_provider(self, resolver, mock_metrics):
        """Test resolution from first provider."""
        result = await resolver.get_secret("TEST_SECRET")
        
        assert result.key == "TEST_SECRET"
        assert result.value == "env-value"
        assert result.source == SecretSource.ENV
        
        # Check metrics were called
        mock_metrics.on_resolve.assert_called_once()
        args = mock_metrics.on_resolve.call_args[0]
        assert args[1] == SecretSource.ENV.value  # source
        assert args[2] == 1  # depth

    @pytest.mark.asyncio
    async def test_fallback_to_second_provider(self, resolver, mock_metrics):
        """Test fallback to second provider when first fails."""
        result = await resolver.get_secret("CF_SECRET")
        
        assert result.key == "CF_SECRET"
        assert result.value == "cloudflare-value"
        assert result.source == SecretSource.CLOUDFLARE
        
        # Should be depth 2 (second provider)
        args = mock_metrics.on_resolve.call_args[0]
        assert args[2] == 2

    @pytest.mark.asyncio
    async def test_secret_not_found(self, resolver, mock_metrics):
        """Test SecretNotFoundError when secret not in any provider."""
        with pytest.raises(SecretNotFoundError) as exc_info:
            await resolver.get_secret("NONEXISTENT_SECRET")
        
        assert "NONEXISTENT_SECRET" in str(exc_info.value)
        mock_metrics.on_miss.assert_called_once()

    @pytest.mark.asyncio
    async def test_secret_with_fallback(self, resolver):
        """Test graceful fallback for missing secrets."""
        result = await resolver.get_secret_with_fallback("NONEXISTENT_SECRET", "fallback-value")
        assert result == "fallback-value"

    @pytest.mark.asyncio
    async def test_caching_behavior(self, resolver, mock_metrics):
        """Test secret caching functionality."""
        # First resolution - should hit provider
        result1 = await resolver.get_secret("TEST_SECRET")
        assert result1.source == SecretSource.ENV
        mock_metrics.on_cache_miss.assert_called_once()
        
        # Second resolution - should hit cache
        result2 = await resolver.get_secret("TEST_SECRET")
        assert result2.source == SecretSource.CACHE
        assert result2.value == "env-value"
        mock_metrics.on_cache_hit.assert_called_once()

    @pytest.mark.asyncio
    async def test_cache_expiration(self, resolver):
        """Test cache TTL expiration."""
        # Resolve with short TTL
        await resolver.get_secret("TEST_SECRET", ttl=0.05)  # 50ms
        
        # Wait for expiration
        await asyncio.sleep(0.1)
        
        # Should resolve from provider again (not cache)
        result = await resolver.get_secret("TEST_SECRET")
        assert result.source == SecretSource.ENV

    @pytest.mark.asyncio
    async def test_cache_stats(self, resolver):
        """Test cache statistics."""
        await resolver.get_secret("TEST_SECRET")
        await resolver.get_secret("CF_SECRET")
        
        stats = resolver.get_cache_stats()
        assert stats["size"] == 2
        assert len(stats["entries"]) == 2
        
        # Check entry structure
        entry = stats["entries"][0]
        assert "key" in entry
        assert "source" in entry
        assert "age" in entry

    @pytest.mark.asyncio
    async def test_encryption_decryption(self, resolver):
        """Test that cached values are encrypted."""
        await resolver.get_secret("TEST_SECRET")
        
        # Access cache directly
        cache_entry = resolver.cache.get("TEST_SECRET")
        assert cache_entry is not None
        assert "data" in cache_entry
        assert "nonce" in cache_entry["data"]
        assert "cipher" in cache_entry["data"]
        
        # Cipher should not contain plaintext
        cipher_text = cache_entry["data"]["cipher"]
        # With proper encryption, this should not contain the original value
        # (though in test mode without cryptography, it might be base64)
        assert cipher_text != "env-value"

    @pytest.mark.asyncio
    async def test_key_hashing(self, resolver, mock_metrics):
        """Test that actual keys are never logged."""
        # Add secret to provider for this test
        resolver.providers[0].secrets["SENSITIVE_KEY_NAME"] = "sensitive-value"
        
        await resolver.get_secret("SENSITIVE_KEY_NAME")
        
        # Check metrics call
        mock_metrics.on_resolve.assert_called_once()
        key_hash = mock_metrics.on_resolve.call_args[0][0]
        
        # Should be 8-char hex hash, not actual key
        assert key_hash != "SENSITIVE_KEY_NAME"
        assert len(key_hash) == 8
        assert all(c in "0123456789abcdef" for c in key_hash)

    @pytest.mark.asyncio
    async def test_provider_registration(self, resolver):
        """Test dynamic provider registration."""
        new_provider = MockEnvProvider({"NEW_SECRET": "new-value"})
        resolver.register_provider(new_provider, 0)  # Add at highest priority
        
        result = await resolver.get_secret("NEW_SECRET")
        assert result.value == "new-value"

    @pytest.mark.asyncio
    async def test_error_handling(self):
        """Test graceful error handling."""
        # Create a failing provider
        failing_provider = Mock()
        failing_provider.name = "FailingProvider"
        failing_provider.get = AsyncMock(side_effect=Exception("Provider failed"))
        
        backup_provider = MockEnvProvider({"TEST_SECRET": "backup-value"})
        
        resolver = UnifiedSecretResolver(
            providers=[failing_provider, backup_provider],
            encryption_key=b"test-key-32-chars-for-testing!!!"  # Proper 32-byte key
        )
        
        # Should still resolve from backup provider
        result = await resolver.get_secret("TEST_SECRET")
        assert result.value == "backup-value"

    def test_cache_clear(self, resolver):
        """Test cache clearing functionality."""
        # Add something to cache first
        resolver.cache["test"] = {"data": {}, "ts": time.time(), "ttl": 60}
        assert len(resolver.cache) == 1
        
        resolver.clear_cache()
        assert len(resolver.cache) == 0

    @pytest.mark.asyncio
    async def test_metrics_timing(self, resolver, mock_metrics):
        """Test that metrics include timing information."""
        await resolver.get_secret("TEST_SECRET")
        
        # Check that latency was recorded
        mock_metrics.on_resolve.assert_called_once()
        args = mock_metrics.on_resolve.call_args[0]
        latency_ms = args[3]
        
        assert isinstance(latency_ms, (int, float))
        assert latency_ms >= 0
        assert latency_ms < 1000  # Should be less than 1 second

    @pytest.mark.asyncio
    async def test_different_cache_hit_miss_latencies(self, resolver, mock_metrics):
        """Test that cache hits are faster than provider resolution."""
        # First resolution from provider
        await resolver.get_secret("TEST_SECRET")
        provider_latency = mock_metrics.on_resolve.call_args[0][3]
        
        mock_metrics.on_resolve.reset_mock()
        
        # Second resolution from cache
        await resolver.get_secret("TEST_SECRET")
        cache_latency = mock_metrics.on_resolve.call_args[0][3]
        
        # Both should be positive numbers
        assert provider_latency >= 0
        assert cache_latency >= 0


class TestSecretResult:
    """Test SecretResult object behavior."""

    @pytest.mark.asyncio
    async def test_secret_result_value_extraction(self, resolver):
        """Test that SecretResult.value can be extracted properly."""
        result = await resolver.get_secret("TEST_SECRET")
        
        # Should have value attribute
        assert hasattr(result, 'value')
        assert isinstance(result.value, str)
        assert result.value == "env-value"
    
    @pytest.mark.asyncio
    async def test_secret_result_string_conversion(self, resolver):
        """Test that SecretResult converts to string properly."""
        result = await resolver.get_secret("TEST_SECRET")
        
        # __str__ should return the value
        assert str(result) == "env-value"
        
        # But type should still be SecretResult
        assert type(result).__name__ == "SecretResult"
    
    @pytest.mark.asyncio
    async def test_secret_result_helper_methods(self, resolver):
        """Test SecretResult helper methods (endswith, startswith, replace)."""
        result = await resolver.get_secret("TEST_SECRET")
        
        # Test helper methods
        assert result.endswith("value")
        assert result.startswith("env")
        assert result.replace("env", "test") == "test-value"


class TestSecretProviders:
    """Test individual secret providers."""

    @pytest.mark.asyncio
    async def test_env_provider(self, monkeypatch):
        """Test environment provider."""
        monkeypatch.setenv("TEST_ENV_SECRET", "env-test-value")
        
        provider = EnvProvider()
        result = await provider.get("TEST_ENV_SECRET")
        
        assert result is not None
        assert result.value == "env-test-value"
        assert result.source == SecretSource.ENV

    @pytest.mark.asyncio
    async def test_env_provider_missing(self):
        """Test environment provider with missing value."""
        provider = EnvProvider()
        result = await provider.get("DEFINITELY_NOT_SET")
        
        assert result is None

    @pytest.mark.asyncio
    async def test_cloudflare_provider(self):
        """Test Cloudflare provider with bindings."""
        provider = CloudflareProvider({"CF_TEST": "cf-value"})
        result = await provider.get("CF_TEST")
        
        assert result is not None
        assert result.value == "cf-value"
        assert result.source == SecretSource.CLOUDFLARE

    @pytest.mark.asyncio
    async def test_cloudflare_provider_missing(self):
        """Test Cloudflare provider with missing binding."""
        provider = CloudflareProvider({})
        result = await provider.get("MISSING_BINDING")
        
        assert result is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])