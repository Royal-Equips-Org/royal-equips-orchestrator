"""Unit tests for ProductResearchAgent."""

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from orchestrator.agents.product_research import ProductResearchAgent


class TestProductResearchAgent:
    """Test suite for ProductResearchAgent."""

    @pytest.fixture
    def agent(self):
        """Create a ProductResearchAgent instance for testing."""
        return ProductResearchAgent()

    @pytest.fixture
    def mock_autods_products(self):
        """Mock AutoDS API response data."""
        return [
            {
                'id': 'autods_test_001',
                'title': 'Test Wireless Charger',
                'source': 'AutoDS',
                'supplier_price': 10.00,
                'suggested_price': 25.00,
                'category': 'Electronics',
                'trend_score': 90
            },
            {
                'id': 'autods_test_002',
                'title': 'Test LED Light Strip', 
                'source': 'AutoDS',
                'supplier_price': 15.00,
                'suggested_price': 35.00,
                'category': 'Accessories',
                'trend_score': 85
            }
        ]

    @pytest.fixture
    def mock_spocket_products(self):
        """Mock Spocket API response data."""
        return [
            {
                'id': 'spocket_test_001',
                'title': 'Test Phone Mount',
                'source': 'Spocket',
                'supplier_price': 8.50,
                'suggested_price': 20.00,
                'category': 'Accessories',
                'trend_score': 88
            }
        ]

    def test_agent_initialization(self, agent):
        """Test agent is properly initialized."""
        assert agent.name == "product_research"
        assert agent.trending_products == []
        assert agent._last_run is None
        assert hasattr(agent, 'logger')

    def test_agent_initialization_with_custom_name(self):
        """Test agent can be initialized with custom name."""
        custom_agent = ProductResearchAgent("custom_research")
        assert custom_agent.name == "custom_research"

    @pytest.mark.asyncio
    async def test_fetch_autods_products(self, agent, mock_autods_products):
        """Test AutoDS products fetching stub function."""
        with patch.object(agent, '_fetch_autods_products', return_value=mock_autods_products):
            products = await agent._fetch_autods_products()
            
            assert len(products) == 2
            assert products[0]['title'] == 'Test Wireless Charger'
            assert products[0]['source'] == 'AutoDS'
            assert products[1]['supplier_price'] == 15.00

    @pytest.mark.asyncio
    async def test_fetch_spocket_products(self, agent, mock_spocket_products):
        """Test Spocket products fetching stub function."""
        with patch.object(agent, '_fetch_spocket_products', return_value=mock_spocket_products):
            products = await agent._fetch_spocket_products()
            
            assert len(products) == 1
            assert products[0]['title'] == 'Test Phone Mount'
            assert products[0]['source'] == 'Spocket'
            assert products[0]['supplier_price'] == 8.50

    def test_process_products(self, agent):
        """Test product processing and margin calculation."""
        raw_products = [
            {
                'id': 'test_001',
                'title': 'Test Product',
                'source': 'Test',
                'supplier_price': 10.00,
                'suggested_price': 25.00,
                'category': 'Test Category',
                'trend_score': 90
            },
            {
                'id': 'test_002', 
                'title': 'Test Product 2',
                'source': 'Test',
                'supplier_price': 15.00,
                'suggested_price': 30.00,
                'category': 'Test Category',
                'trend_score': 95
            }
        ]

        processed = agent._process_products(raw_products)

        assert len(processed) == 2
        
        # Should be sorted by trend_score (highest first)
        assert processed[0]['trend_score'] == 95
        assert processed[1]['trend_score'] == 90
        
        # Check margin calculations for first product
        product1 = processed[1]  # trend_score 90 product
        assert product1['price'] == 25.00
        assert product1['cost'] == 10.00
        assert product1['margin'] == 15.00
        assert product1['margin_percent'] == 60.0
        assert 'processed_at' in product1

        # Check margin calculations for second product  
        product2 = processed[0]  # trend_score 95 product
        assert product2['margin_percent'] == 50.0

    @pytest.mark.asyncio
    async def test_run_success(self, agent, mock_autods_products, mock_spocket_products):
        """Test successful agent run."""
        with patch.object(agent, '_fetch_autods_products', return_value=mock_autods_products) as mock_autods, \
             patch.object(agent, '_fetch_spocket_products', return_value=mock_spocket_products) as mock_spocket:
            
            await agent.run()
            
            # Verify API methods were called
            mock_autods.assert_called_once()
            mock_spocket.assert_called_once()
            
            # Verify products were processed
            assert len(agent.trending_products) == 3
            assert agent._last_run is not None
            
            # Check that products are sorted by trend score
            assert agent.trending_products[0]['trend_score'] >= agent.trending_products[1]['trend_score']

    @pytest.mark.asyncio
    async def test_run_with_exception(self, agent):
        """Test agent run when API calls fail."""
        with patch.object(agent, '_fetch_autods_products', side_effect=Exception("API Error")):
            
            with pytest.raises(Exception, match="API Error"):
                await agent.run()

    @pytest.mark.asyncio 
    async def test_health_check_never_run(self, agent):
        """Test health check when agent has never run."""
        health = await agent.health_check()
        
        assert health['name'] == 'product_research'
        assert health['status'] == 'never_run'
        assert health['products_found'] == 0
        assert health['last_run_timestamp'] is None

    @pytest.mark.asyncio
    async def test_health_check_healthy(self, agent):
        """Test health check when agent is healthy."""
        # Set last run to recent time
        agent._last_run = asyncio.get_event_loop().time() - 100  # 100 seconds ago
        agent.trending_products = [{'test': 'product'}]
        
        health = await agent.health_check()
        
        assert health['name'] == 'product_research'
        assert health['status'] == 'healthy'
        assert health['products_found'] == 1
        assert health['last_run_timestamp'] is not None
        assert health['time_since_last_run_seconds'] < 200

    @pytest.mark.asyncio
    async def test_health_check_stale(self, agent):
        """Test health check when agent data is stale."""
        # Set last run to more than 2 hours ago
        agent._last_run = asyncio.get_event_loop().time() - 7300  # > 2 hours ago
        
        health = await agent.health_check()
        
        assert health['status'] == 'stale'
        assert health['time_since_last_run_seconds'] > 7200

    @pytest.mark.asyncio
    async def test_agent_logging(self, agent, caplog):
        """Test that agent logs appropriately."""
        import logging
        caplog.set_level(logging.INFO)
        
        with patch.object(agent, '_fetch_autods_products', return_value=[]), \
             patch.object(agent, '_fetch_spocket_products', return_value=[]):
            
            await agent.run()
            
            # Check that info level logs were created
            assert "Running product research agent" in caplog.text
            assert "Found 0 trending products" in caplog.text

    @pytest.mark.asyncio
    async def test_agent_with_realistic_delays(self, agent):
        """Test that the stub functions simulate realistic API delays."""
        start_time = time.time()
        
        # Test both API calls
        autods_products = await agent._fetch_autods_products()
        spocket_products = await agent._fetch_spocket_products()
        
        end_time = time.time()
        
        # Should take at least 0.8 seconds total (0.5 + 0.3)
        assert end_time - start_time >= 0.8
        assert len(autods_products) > 0
        assert len(spocket_products) > 0

    def test_agent_inherits_from_agent_base(self, agent):
        """Test that ProductResearchAgent properly inherits from AgentBase."""
        from orchestrator.core.agent_base import AgentBase
        assert isinstance(agent, AgentBase)
        assert hasattr(agent, 'run')
        assert hasattr(agent, 'health_check')
        assert hasattr(agent, 'shutdown')