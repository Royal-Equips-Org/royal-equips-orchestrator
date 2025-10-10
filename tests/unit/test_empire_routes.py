"""
Unit tests for Empire API routes
Tests the async OpenAI integration in the chat endpoint
"""

import pytest
import asyncio
from unittest.mock import patch, AsyncMock, MagicMock
from app import create_app


class TestEmpireChatEndpoint:
    """Test the empire chat endpoint with async OpenAI"""

    @pytest.fixture
    def app(self):
        """Create test app"""
        app = create_app()
        app.config['TESTING'] = True
        return app

    @pytest.fixture
    def client(self, app):
        """Create test client"""
        return app.test_client()

    def test_chat_endpoint_missing_content(self, client):
        """Test chat endpoint with missing content field"""
        response = client.post('/api/empire/chat', json={})
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data
        assert 'content' in data['error'].lower()

    def test_chat_endpoint_empty_content(self, client):
        """Test chat endpoint with empty content"""
        response = client.post('/api/empire/chat', json={'content': ''})
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    @patch('core.secrets.secret_provider.UnifiedSecretResolver')
    def test_chat_endpoint_missing_api_key(self, mock_resolver, client):
        """Test chat endpoint when API key is not configured"""
        # Mock the secret resolver to return None
        mock_instance = MagicMock()
        mock_instance.get_secret = AsyncMock(return_value=None)
        mock_resolver.return_value = mock_instance

        response = client.post('/api/empire/chat', json={'content': 'test message'})
        assert response.status_code == 503
        data = response.get_json()
        assert 'error' in data
        assert 'not configured' in data['error'].lower()

    @patch('openai.AsyncOpenAI')
    @patch('core.secrets.secret_provider.UnifiedSecretResolver')
    def test_chat_endpoint_successful_response(self, mock_resolver, mock_openai, client):
        """Test chat endpoint with successful OpenAI response"""
        # Mock the secret resolver
        mock_secret = MagicMock()
        mock_secret.value = 'test-api-key'
        mock_instance = MagicMock()
        mock_instance.get_secret = AsyncMock(return_value=mock_secret)
        mock_resolver.return_value = mock_instance

        # Mock the OpenAI client
        mock_completion = MagicMock()
        mock_completion.choices = [MagicMock()]
        mock_completion.choices[0].message.content = 'This is a test response from AIRA'
        mock_completion.model = 'gpt-4-turbo-preview'

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_completion)
        mock_openai.return_value = mock_client

        response = client.post('/api/empire/chat', json={'content': 'test message'})
        assert response.status_code == 200
        data = response.get_json()
        assert 'content' in data
        assert data['agent_name'] == 'AIRA'
        assert data['configured'] is True
        assert 'This is a test response from AIRA' in data['content']

    @patch('openai.AsyncOpenAI')
    @patch('core.secrets.secret_provider.UnifiedSecretResolver')
    def test_chat_endpoint_uses_async_client(self, mock_resolver, mock_openai, client):
        """Test that chat endpoint uses AsyncOpenAI instead of synchronous client"""
        # Mock the secret resolver
        mock_secret = MagicMock()
        mock_secret.value = 'test-api-key'
        mock_instance = MagicMock()
        mock_instance.get_secret = AsyncMock(return_value=mock_secret)
        mock_resolver.return_value = mock_instance

        # Mock the OpenAI client
        mock_completion = MagicMock()
        mock_completion.choices = [MagicMock()]
        mock_completion.choices[0].message.content = 'Test response'

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_completion)
        mock_openai.return_value = mock_client

        response = client.post('/api/empire/chat', json={'content': 'test'})

        # Verify AsyncOpenAI was instantiated
        mock_openai.assert_called_once_with(api_key='test-api-key')

        # Verify the async create method was awaited
        assert mock_client.chat.completions.create.call_count == 1

    @patch('openai.AsyncOpenAI')
    @patch('core.secrets.secret_provider.UnifiedSecretResolver')
    def test_chat_endpoint_handles_empty_response(self, mock_resolver, mock_openai, client):
        """Test chat endpoint handles empty OpenAI response"""
        # Mock the secret resolver
        mock_secret = MagicMock()
        mock_secret.value = 'test-api-key'
        mock_instance = MagicMock()
        mock_instance.get_secret = AsyncMock(return_value=mock_secret)
        mock_resolver.return_value = mock_instance

        # Mock empty response
        mock_completion = MagicMock()
        mock_completion.choices = [MagicMock()]
        mock_completion.choices[0].message.content = None

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_completion)
        mock_openai.return_value = mock_client

        response = client.post('/api/empire/chat', json={'content': 'test'})
        assert response.status_code == 500
        data = response.get_json()
        assert 'error' in data
