"""Tests for BigQuery connector."""

import pytest
from unittest.mock import patch, Mock
from royal_mcp.connectors.bigquery import BigQueryConnector


@pytest.mark.asyncio
class TestBigQueryConnector:
    """Test cases for BigQuery connector."""
    
    def test_initialization(self, mock_env_vars):
        """Test connector initialization."""
        with patch('google.cloud.bigquery.Client'):
            connector = BigQueryConnector()
            assert connector.config.project_id == mock_env_vars["BIGQUERY_PROJECT_ID"]
    
    def test_get_tools(self, mock_env_vars):
        """Test tool registration."""
        with patch('google.cloud.bigquery.Client'):
            connector = BigQueryConnector()
            tools = connector.get_tools()
            
            assert len(tools) == 4
            tool_names = [tool.name for tool in tools]
            assert "bigquery_query" in tool_names
            assert "bigquery_schema" in tool_names
            assert "bigquery_datasets" in tool_names
            assert "bigquery_tables" in tool_names
    
    def test_validate_query_valid(self, mock_env_vars):
        """Test query validation for valid SELECT queries."""
        with patch('google.cloud.bigquery.Client'):
            connector = BigQueryConnector()
            
            valid_queries = [
                "SELECT * FROM table",
                "select id, name from users where active = true",
                "SELECT COUNT(*) FROM orders GROUP BY status"
            ]
            
            for query in valid_queries:
                assert connector._validate_query(query)
    
    def test_validate_query_invalid(self, mock_env_vars):
        """Test query validation for invalid queries."""
        with patch('google.cloud.bigquery.Client'):
            connector = BigQueryConnector()
            
            invalid_queries = [
                "INSERT INTO table VALUES (1, 2, 3)",
                "UPDATE users SET active = false",
                "DELETE FROM orders WHERE id = 1",
                "DROP TABLE users",
                "CREATE TABLE test (id INT)",
                "ALTER TABLE users ADD COLUMN email STRING"
            ]
            
            for query in invalid_queries:
                assert not connector._validate_query(query)
    
    async def test_handle_bigquery_query_success(self, mock_env_vars, mock_bigquery_client):
        """Test successful query execution."""
        with patch('google.cloud.bigquery.Client', return_value=mock_bigquery_client):
            connector = BigQueryConnector()
            
            arguments = {"query": "SELECT * FROM test_table", "use_cache": False}
            result = await connector.handle_bigquery_query(arguments)
            
            assert len(result) == 1
            assert "BigQuery Query Result" in result[0].text
            mock_bigquery_client.query.assert_called_once()
    
    async def test_handle_bigquery_query_invalid(self, mock_env_vars):
        """Test invalid query handling."""
        with patch('google.cloud.bigquery.Client'):
            connector = BigQueryConnector()
            
            arguments = {"query": "DROP TABLE users"}
            result = await connector.handle_bigquery_query(arguments)
            
            assert len(result) == 1
            assert "Only SELECT queries are allowed" in result[0].text
    
    async def test_handle_bigquery_query_empty(self, mock_env_vars):
        """Test empty query handling."""
        with patch('google.cloud.bigquery.Client'):
            connector = BigQueryConnector()
            
            arguments = {"query": ""}
            result = await connector.handle_bigquery_query(arguments)
            
            assert len(result) == 1
            assert "Query cannot be empty" in result[0].text
    
    def test_query_cache_functionality(self, mock_env_vars):
        """Test query caching."""
        with patch('google.cloud.bigquery.Client'):
            connector = BigQueryConnector()
            cache = connector.cache
            
            # Test cache set and get
            test_data = {"test": "data"}
            cache.set("test_key", test_data)
            
            cached_result = cache.get("test_key")
            assert cached_result == test_data
            
            # Test cache miss
            missing_result = cache.get("nonexistent_key")
            assert missing_result is None
    
    async def test_handle_bigquery_schema_dataset(self, mock_env_vars):
        """Test dataset schema retrieval."""
        with patch('google.cloud.bigquery.Client') as mock_client_class:
            mock_client = Mock()
            mock_dataset = Mock()
            mock_dataset.dataset_id = "test_dataset"
            mock_dataset.project = "test_project"
            mock_dataset.location = "US"
            mock_dataset.created = None
            mock_dataset.modified = None
            mock_dataset.description = "Test dataset"
            
            mock_client.get_dataset.return_value = mock_dataset
            mock_client.list_tables.return_value = []
            mock_client_class.return_value = mock_client
            
            connector = BigQueryConnector()
            arguments = {"dataset_id": "test_dataset"}
            result = await connector.handle_bigquery_schema(arguments)
            
            assert len(result) == 1
            assert "BigQuery Schema Information" in result[0].text
    
    async def test_handle_bigquery_datasets(self, mock_env_vars):
        """Test dataset listing."""
        with patch('google.cloud.bigquery.Client') as mock_client_class:
            mock_client = Mock()
            mock_dataset = Mock()
            mock_dataset.dataset_id = "test_dataset"
            mock_dataset.project = "test_project"
            mock_dataset.location = "US"
            mock_dataset.created = None
            mock_dataset.modified = None
            mock_dataset.description = "Test dataset"
            mock_dataset.full_dataset_id = "test_project.test_dataset"
            
            mock_client.list_datasets.return_value = [mock_dataset]
            mock_client_class.return_value = mock_client
            
            connector = BigQueryConnector()
            result = await connector.handle_bigquery_datasets({})
            
            assert len(result) == 1
            assert "BigQuery Datasets" in result[0].text
    
    async def test_error_handling(self, mock_env_vars):
        """Test error handling in tool handlers."""
        with patch('google.cloud.bigquery.Client') as mock_client_class:
            mock_client_class.side_effect = Exception("BigQuery client error")
            
            with pytest.raises(Exception):
                BigQueryConnector()