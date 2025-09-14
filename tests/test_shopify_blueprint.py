"""
Tests for Flask Shopify blueprint endpoints.
"""

import pytest
import json
from unittest.mock import Mock, patch
from flask import Flask
from app import create_app


@pytest.fixture
def app():
    """Create Flask app for testing."""
    app = create_app('testing')
    app.config['TESTING'] = True
    return app


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


class TestShopifyBlueprint:
    """Test cases for Shopify API blueprint."""

    def test_shopify_status_not_configured(self, client):
        """Test Shopify status when not configured."""
        with patch.dict('os.environ', {}, clear=True):
            response = client.get('/api/shopify/status')
            
            assert response.status_code == 503
            data = json.loads(response.data)
            assert data['configured'] is False
            assert 'not configured' in data['error']

    def test_shopify_status_configured(self, client):
        """Test Shopify status when configured."""
        with patch.dict('os.environ', {
            'SHOPIFY_API_KEY': 'test_key',
            'SHOPIFY_API_SECRET': 'test_secret',
            'SHOP_NAME': 'test_shop'
        }):
            with patch('app.blueprints.shopify.ShopifyService') as mock_service_class:
                mock_service = Mock()
                mock_service.is_configured.return_value = True
                mock_service.get_shop_info.return_value = {
                    'shop_name': 'Test Shop',
                    'domain': 'test-shop.myshopify.com'
                }
                mock_service.get_rate_limit_status.return_value = {
                    'used': 5,
                    'bucket': 40,
                    'remaining': 35
                }
                mock_service_class.return_value = mock_service
                
                response = client.get('/api/shopify/status')
                
                assert response.status_code == 200
                data = json.loads(response.data)
                assert data['configured'] is True
                assert 'shop_info' in data
                assert 'rate_limit' in data

    def test_sync_products_not_configured(self, client):
        """Test sync products when not configured."""
        with patch.dict('os.environ', {}, clear=True):
            response = client.post('/api/shopify/sync-products')
            
            assert response.status_code == 503
            data = json.loads(response.data)
            assert 'not configured' in data['error']

    def test_sync_products_success(self, client):
        """Test successful product sync initiation."""
        with patch.dict('os.environ', {
            'SHOPIFY_API_KEY': 'test_key',
            'SHOPIFY_API_SECRET': 'test_secret',
            'SHOP_NAME': 'test_shop'
        }):
            with patch('app.blueprints.shopify.run_job_async') as mock_run_job:
                mock_run_job.return_value = 'test_job_id'
                
                response = client.post('/api/shopify/sync-products', 
                                     json={'limit': 25})
                
                assert response.status_code == 202
                data = json.loads(response.data)
                assert data['job_id'] == 'test_job_id'
                assert data['status'] == 'started'
                mock_run_job.assert_called_once()

    def test_sync_products_invalid_limit(self, client):
        """Test sync products with invalid limit."""
        with patch.dict('os.environ', {
            'SHOPIFY_API_KEY': 'test_key',
            'SHOPIFY_API_SECRET': 'test_secret',
            'SHOP_NAME': 'test_shop'
        }):
            response = client.post('/api/shopify/sync-products', 
                                 json={'limit': 500})  # Over max limit
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert 'Invalid limit' in data['error']

    def test_sync_inventory_success(self, client):
        """Test successful inventory sync initiation."""
        with patch.dict('os.environ', {
            'SHOPIFY_API_KEY': 'test_key',
            'SHOPIFY_API_SECRET': 'test_secret',
            'SHOP_NAME': 'test_shop'
        }):
            with patch('app.blueprints.shopify.run_job_async') as mock_run_job:
                mock_run_job.return_value = 'inventory_job_id'
                
                response = client.post('/api/shopify/sync-inventory')
                
                assert response.status_code == 202
                data = json.loads(response.data)
                assert data['job_id'] == 'inventory_job_id'
                mock_run_job.assert_called_once()

    def test_sync_orders_success(self, client):
        """Test successful orders sync initiation."""
        with patch.dict('os.environ', {
            'SHOPIFY_API_KEY': 'test_key',
            'SHOPIFY_API_SECRET': 'test_secret',
            'SHOP_NAME': 'test_shop'
        }):
            with patch('app.blueprints.shopify.run_job_async') as mock_run_job:
                mock_run_job.return_value = 'orders_job_id'
                
                response = client.post('/api/shopify/sync-orders', 
                                     json={'limit': 30, 'status': 'open'})
                
                assert response.status_code == 202
                data = json.loads(response.data)
                assert data['job_id'] == 'orders_job_id'
                mock_run_job.assert_called_once()

    def test_sync_orders_invalid_status(self, client):
        """Test sync orders with invalid status."""
        with patch.dict('os.environ', {
            'SHOPIFY_API_KEY': 'test_key',
            'SHOPIFY_API_SECRET': 'test_secret',
            'SHOP_NAME': 'test_shop'
        }):
            response = client.post('/api/shopify/sync-orders', 
                                 json={'status': 'invalid_status'})
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert 'Invalid status' in data['error']

    def test_bulk_operation_success(self, client):
        """Test successful bulk operation initiation."""
        with patch.dict('os.environ', {
            'SHOPIFY_API_KEY': 'test_key',
            'SHOPIFY_API_SECRET': 'test_secret',
            'SHOP_NAME': 'test_shop'
        }):
            with patch('app.blueprints.shopify.run_job_async') as mock_run_job:
                mock_run_job.return_value = 'bulk_job_id'
                
                response = client.post('/api/shopify/bulk', 
                                     json={'operation': 'test_op', 'data': {'key': 'value'}})
                
                assert response.status_code == 202
                data = json.loads(response.data)
                assert data['job_id'] == 'bulk_job_id'
                mock_run_job.assert_called_once()

    def test_bulk_operation_missing_operation(self, client):
        """Test bulk operation without operation parameter."""
        with patch.dict('os.environ', {
            'SHOPIFY_API_KEY': 'test_key',
            'SHOPIFY_API_SECRET': 'test_secret',
            'SHOP_NAME': 'test_shop'
        }):
            response = client.post('/api/shopify/bulk', json={})
            
            assert response.status_code == 400
            data = json.loads(response.data)
            assert 'Missing required' in data['error']

    def test_get_jobs(self, client):
        """Test getting jobs status."""
        with patch('app.blueprints.shopify.get_active_jobs') as mock_get_jobs:
            mock_get_jobs.return_value = {
                'job1': {'status': 'running'},
                'job2': {'status': 'completed'}
            }
            
            response = client.get('/api/shopify/jobs')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['count'] == 2
            assert 'jobs' in data

    def test_get_specific_job(self, client):
        """Test getting specific job status."""
        with patch('app.blueprints.shopify.get_job_status') as mock_get_job:
            mock_get_job.return_value = {'job_id': 'test_job', 'status': 'running'}
            
            response = client.get('/api/shopify/jobs/test_job')
            
            assert response.status_code == 200
            data = json.loads(response.data)
            assert data['job_id'] == 'test_job'

    def test_get_nonexistent_job(self, client):
        """Test getting non-existent job status."""
        with patch('app.blueprints.shopify.get_job_status') as mock_get_job:
            mock_get_job.return_value = None
            
            response = client.get('/api/shopify/jobs/nonexistent')
            
            assert response.status_code == 404
            data = json.loads(response.data)
            assert 'not found' in data['error']

    def test_webhook_missing_headers(self, client):
        """Test webhook with missing headers."""
        response = client.post('/api/shopify/webhooks/orders/create')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'Missing HMAC signature' in data['error']

    def test_webhook_invalid_hmac(self, client):
        """Test webhook with invalid HMAC."""
        with patch('app.blueprints.shopify.verify_shopify_webhook') as mock_verify:
            mock_verify.return_value = False
            
            response = client.post('/api/shopify/webhooks/orders/create',
                                 headers={
                                     'X-Shopify-Hmac-Sha256': 'invalid_signature',
                                     'X-Shopify-Topic': 'orders/create',
                                     'X-Shopify-Shop-Domain': 'test-shop.myshopify.com'
                                 },
                                 json={'id': 123})
            
            assert response.status_code == 401
            data = json.loads(response.data)
            assert 'Invalid HMAC signature' in data['error']

    def test_webhook_valid_hmac(self, client):
        """Test webhook with valid HMAC."""
        with patch('app.blueprints.shopify.verify_shopify_webhook') as mock_verify:
            mock_verify.return_value = True
            
            response = client.post('/api/shopify/webhooks/orders/create',
                                 headers={
                                     'X-Shopify-Hmac-Sha256': 'valid_signature',
                                     'X-Shopify-Topic': 'orders/create',
                                     'X-Shopify-Shop-Domain': 'test-shop.myshopify.com'
                                 },
                                 json={'id': 123, 'status': 'pending'})
            
            assert response.status_code == 202
            data = json.loads(response.data)
            assert data['status'] == 'received'
            assert data['verified'] is True