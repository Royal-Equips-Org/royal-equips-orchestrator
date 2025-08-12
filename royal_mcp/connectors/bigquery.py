"""BigQuery connector for Royal EQ MCP.

Provides secure read-only access to BigQuery project with optimized query execution,
caching, and comprehensive error handling.
"""

import logging
import os
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from google.cloud import bigquery
from google.cloud.exceptions import GoogleCloudError
from mcp.types import TextContent, Tool
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class BigQueryConfig(BaseModel):
    """Configuration for BigQuery connector."""

    project_id: str = Field(..., description="BigQuery project ID")
    location: str = Field(default="US", description="BigQuery location")
    max_results: int = Field(default=1000, description="Maximum query results")
    timeout: int = Field(default=60, description="Query timeout in seconds")


class QueryCache:
    """Simple in-memory cache for BigQuery results."""

    def __init__(self, ttl_seconds: int = 300):  # 5 minutes default
        self.cache: Dict[str, tuple[Any, datetime]] = {}
        self.ttl = timedelta(seconds=ttl_seconds)

    def get(self, key: str) -> Optional[Any]:
        """Get cached result if not expired."""
        if key in self.cache:
            result, timestamp = self.cache[key]
            if datetime.now() - timestamp < self.ttl:
                return result
            else:
                del self.cache[key]
        return None

    def set(self, key: str, value: Any) -> None:
        """Cache a result."""
        self.cache[key] = (value, datetime.now())

    def clear(self) -> None:
        """Clear all cached results."""
        self.cache.clear()


class BigQueryConnector:
    """Enterprise-grade BigQuery connector with caching and error resilience."""

    def __init__(self):
        """Initialize the BigQuery connector."""
        self.config = BigQueryConfig(project_id=os.environ["BIGQUERY_PROJECT_ID"])

        # Initialize BigQuery client with automatic credential detection
        try:
            self.client = bigquery.Client(project=self.config.project_id)
            logger.info(
                f"BigQuery connector initialized for project: {self.config.project_id}"
            )
        except Exception as e:
            logger.error(f"Failed to initialize BigQuery client: {e}")
            raise

        self.cache = QueryCache()

    def get_tools(self) -> List[Tool]:
        """Get all available BigQuery tools."""
        return [
            Tool(
                name="bigquery_query",
                description="Execute read-only SELECT query on BigQuery",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "SQL SELECT query to execute",
                        },
                        "use_cache": {
                            "type": "boolean",
                            "description": "Whether to use cached results",
                            "default": True,
                        },
                        "max_results": {
                            "type": "integer",
                            "description": "Maximum number of results to return",
                            "default": 1000,
                        },
                    },
                    "required": ["query"],
                },
            ),
            Tool(
                name="bigquery_schema",
                description="Get schema information for BigQuery dataset/table",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "dataset_id": {
                            "type": "string",
                            "description": "Dataset ID to inspect",
                        },
                        "table_id": {
                            "type": "string",
                            "description": "Optional table ID to get specific table schema",
                        },
                    },
                    "required": ["dataset_id"],
                },
            ),
            Tool(
                name="bigquery_datasets",
                description="List all datasets in the BigQuery project",
                inputSchema={
                    "type": "object",
                    "properties": {},
                    "additionalProperties": False,
                },
            ),
            Tool(
                name="bigquery_tables",
                description="List all tables in a BigQuery dataset",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "dataset_id": {
                            "type": "string",
                            "description": "Dataset ID to list tables from",
                        }
                    },
                    "required": ["dataset_id"],
                },
            ),
        ]

    def _validate_query(self, query: str) -> bool:
        """Validate that query is read-only (SELECT only)."""
        # Remove comments and normalize whitespace
        clean_query = " ".join(query.strip().split())

        # Check if query starts with SELECT (case-insensitive)
        if not clean_query.upper().startswith("SELECT"):
            return False

        # Check for forbidden keywords (DDL/DML operations)
        forbidden_keywords = [
            "INSERT",
            "UPDATE",
            "DELETE",
            "DROP",
            "CREATE",
            "ALTER",
            "TRUNCATE",
            "MERGE",
            "CALL",
            "EXECUTE",
        ]

        upper_query = clean_query.upper()
        for keyword in forbidden_keywords:
            if keyword in upper_query:
                return False

        return True

    async def handle_bigquery_query(
        self, arguments: Dict[str, Any]
    ) -> List[TextContent]:
        """Handle BigQuery SELECT queries."""
        try:
            query = arguments.get("query", "").strip()
            use_cache = arguments.get("use_cache", True)
            max_results = arguments.get("max_results", self.config.max_results)

            if not query:
                return [TextContent(type="text", text="Error: Query cannot be empty")]

            # Validate query is read-only
            if not self._validate_query(query):
                return [
                    TextContent(
                        type="text",
                        text="Error: Only SELECT queries are allowed. Write operations are forbidden.",
                    )
                ]

            # Check cache first
            cache_key = f"{query}:{max_results}"
            if use_cache:
                cached_result = self.cache.get(cache_key)
                if cached_result:
                    logger.info("Returning cached BigQuery result")
                    return [
                        TextContent(
                            type="text",
                            text=f"BigQuery Query Result (cached):\n{cached_result}",
                        )
                    ]

            # Configure query job
            job_config = bigquery.QueryJobConfig(
                maximum_bytes_billed=100 * 1024 * 1024,  # 100MB limit
                use_query_cache=True,
                dry_run=False,
            )

            # Execute query
            logger.info(f"Executing BigQuery query: {query[:100]}...")
            query_job = self.client.query(query, job_config=job_config)

            # Get results with timeout
            results = query_job.result(
                timeout=self.config.timeout, max_results=max_results
            )

            # Convert results to JSON-serializable format
            rows = []
            for row in results:
                row_dict = {}
                for key, value in row.items():
                    # Handle BigQuery data types
                    if isinstance(value, datetime):
                        row_dict[key] = value.isoformat()
                    elif hasattr(value, "total_seconds"):  # timedelta
                        row_dict[key] = value.total_seconds()
                    else:
                        row_dict[key] = value
                rows.append(row_dict)

            result_data = {
                "rows": rows,
                "total_rows": results.total_rows,
                "schema": [
                    {"name": field.name, "type": field.field_type}
                    for field in results.schema
                ],
                "job_id": query_job.job_id,
                "bytes_processed": query_job.total_bytes_processed,
                "slot_millis": query_job.slot_millis,
            }

            # Cache the result
            if use_cache:
                self.cache.set(cache_key, result_data)

            return [
                TextContent(type="text", text=f"BigQuery Query Result:\n{result_data}")
            ]

        except GoogleCloudError as e:
            logger.error(f"BigQuery error: {e}")
            return [TextContent(type="text", text=f"BigQuery error: {str(e)}")]
        except Exception as e:
            logger.error(f"Error executing BigQuery query: {e}")
            return [
                TextContent(
                    type="text", text=f"Error executing BigQuery query: {str(e)}"
                )
            ]

    async def handle_bigquery_schema(
        self, arguments: Dict[str, Any]
    ) -> List[TextContent]:
        """Handle schema information requests."""
        try:
            dataset_id = arguments.get("dataset_id")
            table_id = arguments.get("table_id")

            if not dataset_id:
                return [TextContent(type="text", text="Error: dataset_id is required")]

            if table_id:
                # Get specific table schema
                table_ref = self.client.dataset(dataset_id).table(table_id)
                table = self.client.get_table(table_ref)

                schema_info = {
                    "table_id": table.table_id,
                    "dataset_id": table.dataset_id,
                    "project_id": table.project,
                    "table_type": table.table_type,
                    "num_rows": table.num_rows,
                    "num_bytes": table.num_bytes,
                    "created": table.created.isoformat() if table.created else None,
                    "modified": table.modified.isoformat() if table.modified else None,
                    "schema": [
                        {
                            "name": field.name,
                            "field_type": field.field_type,
                            "mode": field.mode,
                            "description": field.description,
                        }
                        for field in table.schema
                    ],
                }
            else:
                # Get dataset schema
                dataset_ref = self.client.dataset(dataset_id)
                dataset = self.client.get_dataset(dataset_ref)

                # List tables in dataset
                tables = list(self.client.list_tables(dataset))

                schema_info = {
                    "dataset_id": dataset.dataset_id,
                    "project_id": dataset.project,
                    "location": dataset.location,
                    "created": dataset.created.isoformat() if dataset.created else None,
                    "modified": (
                        dataset.modified.isoformat() if dataset.modified else None
                    ),
                    "description": dataset.description,
                    "tables": [
                        {
                            "table_id": table.table_id,
                            "table_type": table.table_type,
                            "num_rows": table.num_rows,
                            "num_bytes": table.num_bytes,
                        }
                        for table in tables
                    ],
                }

            return [
                TextContent(
                    type="text", text=f"BigQuery Schema Information:\n{schema_info}"
                )
            ]

        except GoogleCloudError as e:
            logger.error(f"BigQuery error getting schema: {e}")
            return [
                TextContent(
                    type="text", text=f"BigQuery error getting schema: {str(e)}"
                )
            ]
        except Exception as e:
            logger.error(f"Error getting BigQuery schema: {e}")
            return [
                TextContent(
                    type="text", text=f"Error getting BigQuery schema: {str(e)}"
                )
            ]

    async def handle_bigquery_datasets(
        self, arguments: Dict[str, Any]
    ) -> List[TextContent]:
        """Handle dataset listing requests."""
        try:
            datasets = list(self.client.list_datasets())

            dataset_info = [
                {
                    "dataset_id": dataset.dataset_id,
                    "project_id": dataset.project,
                    "location": dataset.location,
                    "created": dataset.created.isoformat() if dataset.created else None,
                    "modified": (
                        dataset.modified.isoformat() if dataset.modified else None
                    ),
                    "description": dataset.description,
                    "full_dataset_id": dataset.full_dataset_id,
                }
                for dataset in datasets
            ]

            return [
                TextContent(type="text", text=f"BigQuery Datasets:\n{dataset_info}")
            ]

        except GoogleCloudError as e:
            logger.error(f"BigQuery error listing datasets: {e}")
            return [
                TextContent(
                    type="text", text=f"BigQuery error listing datasets: {str(e)}"
                )
            ]
        except Exception as e:
            logger.error(f"Error listing BigQuery datasets: {e}")
            return [
                TextContent(
                    type="text", text=f"Error listing BigQuery datasets: {str(e)}"
                )
            ]

    async def handle_bigquery_tables(
        self, arguments: Dict[str, Any]
    ) -> List[TextContent]:
        """Handle table listing requests."""
        try:
            dataset_id = arguments.get("dataset_id")

            if not dataset_id:
                return [TextContent(type="text", text="Error: dataset_id is required")]

            dataset_ref = self.client.dataset(dataset_id)
            tables = list(self.client.list_tables(dataset_ref))

            table_info = [
                {
                    "table_id": table.table_id,
                    "dataset_id": table.dataset_id,
                    "project_id": table.project,
                    "table_type": table.table_type,
                    "num_rows": table.num_rows,
                    "num_bytes": table.num_bytes,
                    "created": table.created.isoformat() if table.created else None,
                    "modified": table.modified.isoformat() if table.modified else None,
                    "full_table_id": table.full_table_id,
                }
                for table in tables
            ]

            return [
                TextContent(
                    type="text", text=f"BigQuery Tables in {dataset_id}:\n{table_info}"
                )
            ]

        except GoogleCloudError as e:
            logger.error(f"BigQuery error listing tables: {e}")
            return [
                TextContent(
                    type="text", text=f"BigQuery error listing tables: {str(e)}"
                )
            ]
        except Exception as e:
            logger.error(f"Error listing BigQuery tables: {e}")
            return [
                TextContent(
                    type="text", text=f"Error listing BigQuery tables: {str(e)}"
                )
            ]
