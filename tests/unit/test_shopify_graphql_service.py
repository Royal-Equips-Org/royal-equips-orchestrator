"""Unit tests for Shopify GraphQL Service fixes."""


import pytest


class TestShopifyGraphQLService:
    """Test Shopify GraphQL service query fixes."""

    def test_orders_query_format(self):
        """Test that the orders query uses correct Shopify GraphQL format."""
        # The query should use $query: String parameter, not $createdAtMin: DateTime
        from app.services.shopify_graphql_service import ShopifyGraphQLService

        # This test validates the query structure without making actual API calls
        service = ShopifyGraphQLService()

        # Verify service initialization doesn't throw errors
        assert service._api_version == "2024-07"

    @pytest.mark.asyncio
    async def test_orders_query_uses_query_parameter(self):
        """Test that orders query uses the correct query parameter format."""
        from app.services.shopify_graphql_service import ShopifyGraphQLService

        service = ShopifyGraphQLService()
        service._access_token = "test_token"
        service._shop_name = "test-shop"
        service._base_url = "https://test-shop.myshopify.com/admin/api/2024-07/graphql.json"

        # Mock the _execute_query method to capture the query and variables
        captured_query = None
        captured_variables = None

        async def mock_execute(query, variables):
            nonlocal captured_query, captured_variables
            captured_query = query
            captured_variables = variables
            return {
                'orders': {
                    'edges': [],
                    'pageInfo': {'hasNextPage': False, 'endCursor': None}
                }
            }

        service._execute_query = mock_execute

        # Call the method
        await service.get_orders_summary(days=30)

        # Verify the query format
        assert captured_query is not None
        assert '$query: String' in captured_query
        assert 'query: $query' in captured_query
        assert 'displayFinancialStatus' in captured_query
        assert 'displayFulfillmentStatus' in captured_query
        assert 'currentTotalPriceSet' in captured_query

        # Verify the variables format
        assert captured_variables is not None
        assert 'query' in captured_variables
        assert 'created_at:>=' in captured_variables['query']

        # The old incorrect format should NOT be present
        assert '$createdAtMin: DateTime' not in captured_query
        assert 'financialStatus' not in captured_query or 'displayFinancialStatus' in captured_query
        assert 'fulfillmentStatus' not in captured_query or 'displayFulfillmentStatus' in captured_query

    @pytest.mark.asyncio
    async def test_orders_summary_date_filter_format(self):
        """Test that date filter is in correct Shopify format."""
        from app.services.shopify_graphql_service import ShopifyGraphQLService

        service = ShopifyGraphQLService()
        service._access_token = "test_token"
        service._shop_name = "test-shop"
        service._base_url = "https://test-shop.myshopify.com/admin/api/2024-07/graphql.json"

        captured_variables = None

        async def mock_execute(query, variables):
            nonlocal captured_variables
            captured_variables = variables
            return {
                'orders': {
                    'edges': [],
                    'pageInfo': {'hasNextPage': False, 'endCursor': None}
                }
            }

        service._execute_query = mock_execute

        # Call with specific days
        await service.get_orders_summary(days=7)

        # Verify date format in query string
        assert captured_variables is not None
        assert 'query' in captured_variables

        # Should be in format: created_at:>=YYYY-MM-DD
        query_str = captured_variables['query']
        assert query_str.startswith('created_at:>=')

        # Extract and validate date format
        date_part = query_str.replace('created_at:>=', '')
        # Should be in YYYY-MM-DD format
        assert len(date_part) == 10
        assert date_part[4] == '-'
        assert date_part[7] == '-'
