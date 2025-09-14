"""
Tests for Shopify service integration.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from app.services.shopify_service import (
    ShopifyService, 
    ShopifyAPIError, 
    ShopifyAuthError, 
    ShopifyRateLimitError
)
from app.utils.hmac import verify_shopify_webhook, get_shopify_webhook_topics


class TestShopifyService:
    """Test cases for ShopifyService."""

    def test_service_not_configured_without_credentials(self):
        """Test service reports not configured when credentials missing."""
        with patch.dict('os.environ', {}, clear=True):
            service = ShopifyService()
            assert not service.is_configured()

    def test_service_configured_with_credentials(self):
        """Test service reports configured when credentials present."""
        with patch.dict('os.environ', {
            'SHOPIFY_API_KEY': 'test_key',
            'SHOPIFY_API_SECRET': 'test_secret',
            'SHOP_NAME': 'test_shop'
        }):
            service = ShopifyService()
            assert service.is_configured()

    def test_get_rate_limit_status(self):
        """Test rate limit status retrieval."""
        with patch.dict('os.environ', {
            'SHOPIFY_API_KEY': 'test_key',
            'SHOPIFY_API_SECRET': 'test_secret',
            'SHOP_NAME': 'test_shop'
        }):
            service = ShopifyService()
            status = service.get_rate_limit_status()
            
            assert 'used' in status
            assert 'bucket' in status
            assert 'remaining' in status
            assert 'usage_percent' in status
            assert 'last_check' in status

    @patch('app.services.shopify_service.requests.Session.request')
    def test_make_request_handles_rate_limit(self, mock_request):
        """Test that rate limiting is handled properly."""
        with patch.dict('os.environ', {
            'SHOPIFY_API_KEY': 'test_key',
            'SHOPIFY_API_SECRET': 'test_secret',
            'SHOP_NAME': 'test_shop'
        }):
            service = ShopifyService()
            
            # Mock rate limit response
            mock_response = Mock()
            mock_response.status_code = 429
            mock_response.headers = {'Retry-After': '2'}
            mock_request.return_value = mock_response
            
            with pytest.raises(ShopifyRateLimitError) as exc_info:
                service._make_request('GET', '/test')
            
            assert exc_info.value.retry_after == 2

    @patch('app.services.shopify_service.requests.Session.request')
    def test_make_request_handles_auth_error(self, mock_request):
        """Test that authentication errors are handled."""
        with patch.dict('os.environ', {
            'SHOPIFY_API_KEY': 'test_key',
            'SHOPIFY_API_SECRET': 'test_secret',
            'SHOP_NAME': 'test_shop'
        }):
            service = ShopifyService()
            
            # Mock auth error response
            mock_response = Mock()
            mock_response.status_code = 401
            mock_response.headers = {}
            mock_request.return_value = mock_response
            
            with pytest.raises(ShopifyAuthError):
                service._make_request('GET', '/test')

    @patch('app.services.shopify_service.requests.Session.request')
    def test_list_products_success(self, mock_request):
        """Test successful product listing."""
        with patch.dict('os.environ', {
            'SHOPIFY_API_KEY': 'test_key',
            'SHOPIFY_API_SECRET': 'test_secret',
            'SHOP_NAME': 'test_shop'
        }):
            service = ShopifyService()
            
            # Mock successful response
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.headers = {'X-Shopify-Shop-Api-Call-Limit': '5/40'}
            mock_response.ok = True
            mock_response.json.return_value = {
                'products': [
                    {'id': 1, 'title': 'Test Product 1'},
                    {'id': 2, 'title': 'Test Product 2'}
                ]
            }
            mock_request.return_value = mock_response
            
            products, pagination = service.list_products(limit=10)
            
            assert len(products) == 2
            assert products[0]['title'] == 'Test Product 1'
            assert 'count' in pagination


class TestHMACUtils:
    """Test cases for HMAC utilities."""

    def test_verify_shopify_webhook_success(self):
        """Test successful webhook verification."""
        import base64
        import hmac
        import hashlib
        
        payload = b'{"test": "data"}'
        secret = 'test_secret'
        
        # Generate correct signature
        computed_hmac = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).digest()
        signature = base64.b64encode(computed_hmac).decode('utf-8')
        
        with patch.dict('os.environ', {'SHOPIFY_WEBHOOK_SECRET': secret}):
            assert verify_shopify_webhook(payload, signature) is True

    def test_verify_shopify_webhook_failure(self):
        """Test webhook verification failure."""
        payload = b'{"test": "data"}'
        signature = 'invalid_signature'
        
        with patch.dict('os.environ', {'SHOPIFY_WEBHOOK_SECRET': 'test_secret'}):
            assert verify_shopify_webhook(payload, signature) is False

    def test_verify_shopify_webhook_no_secret(self):
        """Test webhook verification without secret configured."""
        with patch.dict('os.environ', {}, clear=True):
            assert verify_shopify_webhook(b'test', 'signature') is False

    def test_get_webhook_topics(self):
        """Test webhook topics retrieval."""
        topics = get_shopify_webhook_topics()
        assert isinstance(topics, list)
        assert 'orders/create' in topics
        assert 'products/create' in topics


class TestShopifyJobs:
    """Test cases for Shopify background jobs."""

    def test_get_active_jobs_empty(self):
        """Test getting active jobs when none exist."""
        from app.jobs.shopify_jobs import get_active_jobs
        jobs = get_active_jobs()
        assert isinstance(jobs, dict)

    @patch('app.jobs.shopify_jobs.ShopifyService')
    def test_sync_products_job_not_configured(self, mock_service_class):
        """Test sync products job when Shopify not configured."""
        from app.jobs.shopify_jobs import sync_products_job
        
        mock_service = Mock()
        mock_service.is_configured.return_value = False
        mock_service_class.return_value = mock_service
        
        result = sync_products_job(job_id='test_job', emit_progress=False)
        
        assert result['status'] == 'failed'
        assert 'not configured' in result['result']['error']

    def test_job_progress_tracking(self):
        """Test JobProgress class."""
        from app.jobs.shopify_jobs import JobProgress
        
        job = JobProgress('test_id', 'test_type', total=100)
        
        assert job.job_id == 'test_id'
        assert job.job_type == 'test_type'
        assert job.total == 100
        assert job.processed == 0
        assert job.status == 'starting'
        
        job.update(50, 'running')
        assert job.processed == 50
        assert job.status == 'running'
        
        data = job.to_dict()
        assert data['percentage'] == 50.0
        assert data['processed'] == 50