"""
Multi-layer secret resolution system for Royal Equips Orchestrator.

Provides encrypted caching and fallback resolution across multiple secret sources:
ENV → GitHub Actions → Cloudflare → External Vault → Cache
"""

from __future__ import annotations
import os
import time
import base64
import secrets
import hashlib
import asyncio
from typing import Optional, Dict, List, Protocol, Any, Callable
from dataclasses import dataclass
from enum import Enum
import json
import warnings

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:
    # Fallback if cryptography not available
    AESGCM = None
    warnings.warn("cryptography package not available - encryption disabled")


class SecretSource(Enum):
    ENV = "env"
    GITHUB = "github-actions-env"
    CLOUDFLARE = "cloudflare"
    EXTERNAL = "external-vault"
    CACHE = "cache"


class SecretNotFoundError(Exception):
    """Secret not found in any provider."""
    def __init__(self, key: str):
        super().__init__(f"Secret '{key}' not found in any provider")
        self.key = key


class SecretExpiredError(Exception):
    """Secret has expired in cache."""
    def __init__(self, key: str):
        super().__init__(f"Secret '{key}' has expired")
        self.key = key


@dataclass
class SecretResult:
    key: str
    value: str
    source: SecretSource
    fetched_at: float
    ttl: Optional[int] = None


class SecretProvider(Protocol):
    """Protocol for secret providers."""
    name: str
    
    async def get(self, key: str) -> Optional[SecretResult]:
        """Get secret value for key, return None if not found."""
        ...


class EnvProvider:
    """Environment variable provider."""
    name = "EnvProvider"
    
    async def get(self, key: str) -> Optional[SecretResult]:
        v = os.getenv(key)
        if not v:
            return None
        return SecretResult(
            key=key, 
            value=v, 
            source=SecretSource.ENV, 
            fetched_at=time.time()
        )


class GitHubActionsProvider:
    """GitHub Actions secrets provider (reads from environment)."""
    name = "GitHubActionsProvider"
    
    async def get(self, key: str) -> Optional[SecretResult]:
        # Only active in GitHub Actions environment
        if not os.getenv("GITHUB_ACTIONS"):
            return None
            
        v = os.getenv(key)
        if not v:
            return None
            
        return SecretResult(
            key=key,
            value=v,
            source=SecretSource.GITHUB,
            fetched_at=time.time()
        )


class CloudflareProvider:
    """Cloudflare Workers/Pages environment provider."""
    name = "CloudflareProvider"
    
    def __init__(self, bindings: Optional[Dict[str, str]] = None):
        self.bindings = bindings or {}
    
    async def get(self, key: str) -> Optional[SecretResult]:
        v = self.bindings.get(key)
        if not v:
            return None
        return SecretResult(
            key=key,
            value=v,
            source=SecretSource.CLOUDFLARE,
            fetched_at=time.time()
        )


class ExternalVaultProvider:
    """External vault provider (AWS SSM, HashiCorp Vault, etc.)."""
    name = "ExternalVaultProvider"
    
    async def get(self, key: str) -> Optional[SecretResult]:
        # TODO: Implement actual SSM / Vault / GCP Secret Manager integration
        # This is a placeholder interface to avoid vendor lock-in
        return None


@dataclass
class SecretMetrics:
    """Metrics callbacks for secret resolution."""
    on_resolve: Optional[Callable[[str, str, int, float], None]] = None
    on_miss: Optional[Callable[[str], None]] = None
    on_cache_hit: Optional[Callable[[str, float], None]] = None
    on_cache_miss: Optional[Callable[[str], None]] = None


class UnifiedSecretResolver:
    """
    Unified secret resolver with multi-layer fallback and encrypted caching.
    
    Resolution order: ENV → GitHub Actions → Cloudflare → External Vault → Cache
    """
    
    def __init__(
        self,
        providers: Optional[List[SecretProvider]] = None,
        cache_ttl: int = 300,  # 5 minutes default
        encryption_key: Optional[bytes] = None,
        metrics: Optional[SecretMetrics] = None
    ):
        self.providers = providers or [
            EnvProvider(),
            GitHubActionsProvider(),
            CloudflareProvider(),
            ExternalVaultProvider()
        ]
        self.cache_ttl = cache_ttl
        self.metrics = metrics
        self.cache: Dict[str, Dict] = {}
        self.key = encryption_key or self._derive_key()

    def _derive_key(self) -> bytes:
        """Derive encryption key from environment or use default."""
        seed = os.getenv("SECRET_ENCRYPTION_KEY") or "royal-equips-default-dev-key-change-in-prod"
        
        if seed == "royal-equips-default-dev-key-change-in-prod":
            print(json.dumps({
                "level": "warn",
                "event": "secret_encryption_key_default",
                "message": "Using default encryption key - set SECRET_ENCRYPTION_KEY in production"
            }))
        
        # Use SHA-256 to derive 32-byte key
        return hashlib.sha256(seed.encode()).digest()

    def _encrypt(self, plaintext: str) -> Dict[str, str]:
        """Encrypt plaintext using AES-256-GCM."""
        if not AESGCM:
            # Fallback: base64 encoding (not secure, for testing only)
            return {
                "nonce": base64.b64encode(b"no-crypto-fallback").decode(),
                "cipher": base64.b64encode(plaintext.encode()).decode()
            }
        
        aes = AESGCM(self.key)
        nonce = secrets.token_bytes(12)
        ct = aes.encrypt(nonce, plaintext.encode(), None)
        
        return {
            "nonce": base64.b64encode(nonce).decode(),
            "cipher": base64.b64encode(ct).decode()
        }

    def _decrypt(self, enc: Dict[str, str]) -> str:
        """Decrypt ciphertext using AES-256-GCM."""
        if not AESGCM:
            # Fallback: base64 decoding (not secure, for testing only)
            return base64.b64decode(enc["cipher"]).decode()
        
        aes = AESGCM(self.key)
        nonce = base64.b64decode(enc["nonce"])
        ct = base64.b64decode(enc["cipher"])
        pt = aes.decrypt(nonce, ct, None)
        return pt.decode()

    def _expired(self, entry: Dict) -> bool:
        """Check if cache entry is expired."""
        ttl = entry.get("ttl")
        if ttl is None:
            return False
        return (time.time() - entry["ts"]) > ttl

    def _create_key_hash(self, key: str) -> str:
        """Create hash of key for logging (never log actual key)."""
        return hashlib.sha256(key.encode()).hexdigest()[:8]

    async def get_secret(self, key: str, ttl: Optional[int] = None) -> SecretResult:
        """
        Get secret with caching and fallback.
        
        Args:
            key: Secret key to resolve
            ttl: Cache TTL override in seconds
            
        Returns:
            SecretResult with value and metadata
            
        Raises:
            SecretNotFoundError: If secret not found in any provider
        """
        cached = self.cache.get(key)
        
        # Check cache first
        if cached and not self._expired(cached):
            start = time.time()
            value = self._decrypt(cached["data"])
            latency_ms = (time.time() - start) * 1000
            
            key_hash = self._create_key_hash(key)
            if self.metrics:
                if self.metrics.on_cache_hit:
                    self.metrics.on_cache_hit(key_hash, latency_ms)
                if self.metrics.on_resolve:
                    self.metrics.on_resolve(key_hash, SecretSource.CACHE.value, 0, latency_ms)
            
            return SecretResult(
                key=key,
                value=value,
                source=SecretSource.CACHE,
                fetched_at=cached["ts"],
                ttl=cached["ttl"]
            )

        # Remove expired entry
        if cached:
            del self.cache[key]

        key_hash = self._create_key_hash(key)
        if self.metrics and self.metrics.on_cache_miss:
            self.metrics.on_cache_miss(key_hash)

        start = time.time()
        
        # Try each provider in order
        for depth, provider in enumerate(self.providers, start=1):
            res = await provider.get(key)
            if res:
                effective_ttl = ttl or self.cache_ttl
                enc = self._encrypt(res.value)
                
                # Cache encrypted result
                self.cache[key] = {
                    "data": enc,
                    "ttl": effective_ttl,
                    "source": res.source.value,
                    "ts": time.time()
                }
                
                latency_ms = (time.time() - start) * 1000
                if self.metrics and self.metrics.on_resolve:
                    self.metrics.on_resolve(key_hash, res.source.value, depth, latency_ms)
                
                return res

        # Not found in any provider
        if self.metrics and self.metrics.on_miss:
            self.metrics.on_miss(key_hash)
        raise SecretNotFoundError(key)

    async def get_secret_with_fallback(self, key: str, fallback: Optional[str] = None) -> str:
        """Get secret with optional fallback value for graceful degradation."""
        try:
            result = await self.get_secret(key)
            return result.value
        except SecretNotFoundError:
            if fallback is not None:
                return fallback
            raise

    def clear_cache(self) -> None:
        """Clear all cached secrets."""
        self.cache.clear()

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics for monitoring."""
        entries = []
        for key, entry in self.cache.items():
            entries.append({
                "key": self._create_key_hash(key),
                "source": entry["source"],
                "age": time.time() - entry["ts"]
            })

        return {
            "size": len(self.cache),
            "entries": entries
        }

    def register_provider(self, provider: SecretProvider, priority: int = None) -> None:
        """Register a new secret provider."""
        if priority is None:
            self.providers.append(provider)
        else:
            self.providers.insert(priority, provider)


# Default metrics that log to stdout
def _default_on_resolve(key_hash: str, source: str, depth: int, latency_ms: float) -> None:
    print(json.dumps({
        "level": "info",
        "event": "secret_resolve",
        "key_hash": key_hash,
        "source": source,
        "depth": depth,
        "latency_ms": latency_ms,
        "cache": source == SecretSource.CACHE.value
    }))


def _default_on_miss(key_hash: str) -> None:
    print(json.dumps({
        "level": "warn",
        "event": "secret_miss",
        "key_hash": key_hash
    }))


def _default_on_cache_hit(key_hash: str, latency_ms: float) -> None:
    print(json.dumps({
        "level": "debug",
        "event": "secret_cache_hit",
        "key_hash": key_hash,
        "latency_ms": latency_ms
    }))


def _default_on_cache_miss(key_hash: str) -> None:
    print(json.dumps({
        "level": "debug",
        "event": "secret_cache_miss",
        "key_hash": key_hash
    }))


# Create default instance
secrets = UnifiedSecretResolver(
    metrics=SecretMetrics(
        on_resolve=_default_on_resolve,
        on_miss=_default_on_miss,
        on_cache_hit=_default_on_cache_hit,
        on_cache_miss=_default_on_cache_miss
    )
)


# Example usage
async def example():
    """Example usage of the secret resolver."""
    try:
        # Get a secret with fallback
        stripe_key = await secrets.get_secret_with_fallback("STRIPE_API_KEY", "test_key")
        print(f"Stripe key resolved (first 8 chars): {stripe_key[:8]}...")
        
        # Get cache stats
        stats = secrets.get_cache_stats()
        print(f"Cache stats: {stats}")
        
    except SecretNotFoundError as e:
        print(f"Secret not found: {e}")


if __name__ == "__main__":
    asyncio.run(example())