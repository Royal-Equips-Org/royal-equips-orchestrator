"""
Database Service - Simple database abstraction for customer support and other services.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class DatabaseService:
    """Simple database service for storing and retrieving application data."""

    def __init__(self):
        """Initialize database service."""
        self._in_memory_store: Dict[str, List[Dict[str, Any]]] = {}
        self.logger = logger

    def save(self, collection: str, data: Dict[str, Any]) -> str:
        """Save data to a collection.
        
        Args:
            collection: Collection/table name
            data: Data to save
            
        Returns:
            Record ID
        """
        if collection not in self._in_memory_store:
            self._in_memory_store[collection] = []

        # Add timestamp and ID if not present
        if 'id' not in data:
            data['id'] = f"{collection}_{len(self._in_memory_store[collection])}"
        if 'created_at' not in data:
            data['created_at'] = datetime.now(timezone.utc).isoformat()

        self._in_memory_store[collection].append(data)
        self.logger.info(f"Saved record to {collection}: {data.get('id')}")
        return data['id']

    def find(self, collection: str, query: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Find records in a collection.
        
        Args:
            collection: Collection/table name
            query: Query filter (simplified - matches exact values)
            
        Returns:
            List of matching records
        """
        if collection not in self._in_memory_store:
            return []

        records = self._in_memory_store[collection]

        if not query:
            return records.copy()

        # Simple exact match filtering
        results = []
        for record in records:
            match = True
            for key, value in query.items():
                if record.get(key) != value:
                    match = False
                    break
            if match:
                results.append(record)

        return results

    def find_one(self, collection: str, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Find a single record in a collection.
        
        Args:
            collection: Collection/table name
            query: Query filter
            
        Returns:
            First matching record or None
        """
        results = self.find(collection, query)
        return results[0] if results else None

    def update(self, collection: str, query: Dict[str, Any], updates: Dict[str, Any]) -> int:
        """Update records in a collection.
        
        Args:
            collection: Collection/table name
            query: Query filter
            updates: Updates to apply
            
        Returns:
            Number of records updated
        """
        if collection not in self._in_memory_store:
            return 0

        records = self._in_memory_store[collection]
        updated_count = 0

        for record in records:
            match = True
            for key, value in query.items():
                if record.get(key) != value:
                    match = False
                    break

            if match:
                record.update(updates)
                record['updated_at'] = datetime.now(timezone.utc).isoformat()
                updated_count += 1

        self.logger.info(f"Updated {updated_count} records in {collection}")
        return updated_count

    def delete(self, collection: str, query: Dict[str, Any]) -> int:
        """Delete records from a collection.
        
        Args:
            collection: Collection/table name
            query: Query filter
            
        Returns:
            Number of records deleted
        """
        if collection not in self._in_memory_store:
            return 0

        records = self._in_memory_store[collection]
        to_delete = []

        for i, record in enumerate(records):
            match = True
            for key, value in query.items():
                if record.get(key) != value:
                    match = False
                    break
            if match:
                to_delete.append(i)

        # Delete in reverse order to maintain indices
        for i in reversed(to_delete):
            del records[i]

        deleted_count = len(to_delete)
        self.logger.info(f"Deleted {deleted_count} records from {collection}")
        return deleted_count

    def count(self, collection: str, query: Optional[Dict[str, Any]] = None) -> int:
        """Count records in a collection.
        
        Args:
            collection: Collection/table name
            query: Query filter
            
        Returns:
            Number of matching records
        """
        return len(self.find(collection, query))

    def clear_collection(self, collection: str) -> None:
        """Clear all records from a collection.
        
        Args:
            collection: Collection/table name
        """
        if collection in self._in_memory_store:
            self._in_memory_store[collection] = []
            self.logger.info(f"Cleared collection {collection}")
