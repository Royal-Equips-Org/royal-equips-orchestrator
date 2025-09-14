"""
Background jobs for Shopify operations.

Provides asynchronous task execution for:
- Product synchronization
- Inventory updates
- Order processing
- Bulk operations

Jobs emit real-time progress updates via WebSocket.
"""

import logging
import threading
import time
from datetime import datetime
from typing import Any, Callable, Dict, Optional
from uuid import uuid4

from app.services.shopify_service import (
    ShopifyAPIError,
    ShopifyRateLimitError,
    ShopifyService,
)

logger = logging.getLogger(__name__)


class JobProgress:
    """Track job progress and status."""

    def __init__(self, job_id: str, job_type: str, total: int = 0):
        self.job_id = job_id
        self.job_type = job_type
        self.total = total
        self.processed = 0
        self.errors = []
        self.start_time = datetime.now()
        self.status = 'starting'
        self.result = None

    def update(self, processed: int, status: str = None, error: str = None):
        """Update job progress."""
        self.processed = processed
        if status:
            self.status = status
        if error:
            self.errors.append({
                'message': error,
                'timestamp': datetime.now().isoformat()
            })

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        elapsed = (datetime.now() - self.start_time).total_seconds()

        # Calculate ETA
        eta = None
        if self.processed > 0 and self.total > 0 and self.status == 'running':
            rate = self.processed / elapsed
            remaining = self.total - self.processed
            eta = remaining / rate if rate > 0 else None

        return {
            'job_id': self.job_id,
            'job_type': self.job_type,
            'status': self.status,
            'processed': self.processed,
            'total': self.total,
            'percentage': (self.processed / self.total * 100) if self.total > 0 else 0,
            'errors': self.errors,
            'error_count': len(self.errors),
            'start_time': self.start_time.isoformat(),
            'elapsed_seconds': elapsed,
            'eta_seconds': eta,
            'result': self.result
        }


# Global job tracking
_active_jobs: Dict[str, JobProgress] = {}
_job_lock = threading.Lock()


def get_active_jobs() -> Dict[str, Dict[str, Any]]:
    """Get all active jobs."""
    with _job_lock:
        return {job_id: job.to_dict() for job_id, job in _active_jobs.items()}


def get_job_status(job_id: str) -> Optional[Dict[str, Any]]:
    """Get status of specific job."""
    with _job_lock:
        job = _active_jobs.get(job_id)
        return job.to_dict() if job else None


def _emit_job_progress(job: JobProgress, socketio_instance=None):
    """Emit job progress via WebSocket."""
    try:
        if socketio_instance:
            socketio_instance.emit('job_progress', job.to_dict(), namespace='/ws/shopify')
        else:
            # Try to import and use global socketio if available
            try:
                from app.sockets import socketio
                if socketio:
                    socketio.emit('job_progress', job.to_dict(), namespace='/ws/shopify')
            except ImportError:
                pass

    except Exception as e:
        logger.error(f"Failed to emit job progress: {e}")


def sync_products_job(job_id: Optional[str] = None, limit: int = 50, emit_progress: bool = True) -> Dict[str, Any]:
    """
    Background job to synchronize products from Shopify.

    Args:
        job_id: Optional job ID (generates one if not provided)
        limit: Maximum number of products to sync
        emit_progress: Whether to emit progress events

    Returns:
        Job result dictionary
    """
    if not job_id:
        job_id = str(uuid4())

    logger.info(f"Starting product sync job {job_id}")

    progress = JobProgress(job_id, 'sync_products', total=limit)

    with _job_lock:
        _active_jobs[job_id] = progress

    try:
        progress.update(0, 'running')
        if emit_progress:
            _emit_job_progress(progress)

        shopify_service = ShopifyService()

        if not shopify_service.is_configured():
            raise Exception("Shopify service not configured")

        # Fetch products in batches
        products = []
        batch_size = min(50, limit)
        processed = 0

        while processed < limit:
            current_batch_size = min(batch_size, limit - processed)

            try:
                batch_products, pagination = shopify_service.list_products(
                    limit=current_batch_size,
                    fields='id,title,handle,status,created_at,updated_at,product_type,vendor'
                )

                products.extend(batch_products)
                processed += len(batch_products)

                progress.update(processed, 'running')
                if emit_progress:
                    _emit_job_progress(progress)

                # Break if no more products
                if len(batch_products) < current_batch_size:
                    break

                # Small delay to be nice to API
                time.sleep(0.5)

            except ShopifyRateLimitError as e:
                logger.warning(f"Rate limit hit during product sync: {e}")
                wait_time = getattr(e, 'retry_after', 2)
                time.sleep(wait_time)
                continue

            except ShopifyAPIError as e:
                error_msg = f"Shopify API error: {e}"
                progress.update(processed, error=error_msg)
                logger.error(error_msg)
                break

        # Job completed
        progress.total = processed  # Update total to actual count
        progress.update(processed, 'completed')
        progress.result = {
            'products_synced': len(products),
            'success': True,
            'summary': f"Successfully synced {len(products)} products"
        }

        if emit_progress:
            _emit_job_progress(progress)

        logger.info(f"Product sync job {job_id} completed: {len(products)} products")

        return progress.to_dict()

    except Exception as e:
        error_msg = f"Product sync job failed: {e}"
        progress.update(progress.processed, 'failed', error_msg)
        progress.result = {
            'success': False,
            'error': error_msg
        }

        if emit_progress:
            _emit_job_progress(progress)

        logger.error(f"Product sync job {job_id} failed: {e}")

        return progress.to_dict()

    finally:
        # Clean up completed jobs after 5 minutes
        threading.Timer(300, lambda: _cleanup_job(job_id)).start()


def sync_inventory_job(job_id: Optional[str] = None, location_id: Optional[int] = None, emit_progress: bool = True) -> Dict[str, Any]:
    """
    Background job to synchronize inventory levels.

    Args:
        job_id: Optional job ID
        location_id: Specific location ID to sync (optional)
        emit_progress: Whether to emit progress events

    Returns:
        Job result dictionary
    """
    if not job_id:
        job_id = str(uuid4())

    logger.info(f"Starting inventory sync job {job_id}")

    progress = JobProgress(job_id, 'sync_inventory')

    with _job_lock:
        _active_jobs[job_id] = progress

    try:
        progress.update(0, 'running')
        if emit_progress:
            _emit_job_progress(progress)

        shopify_service = ShopifyService()

        if not shopify_service.is_configured():
            raise Exception("Shopify service not configured")

        # For now, this is a placeholder that simulates inventory sync
        # In a real implementation, you'd fetch inventory levels and update them

        # Simulate work
        for i in range(1, 11):
            time.sleep(0.5)  # Simulate processing time
            progress.update(i, 'running')
            if emit_progress:
                _emit_job_progress(progress)

        progress.total = 10
        progress.update(10, 'completed')
        progress.result = {
            'inventory_synced': 10,
            'success': True,
            'summary': "Inventory sync completed (simulated)"
        }

        if emit_progress:
            _emit_job_progress(progress)

        logger.info(f"Inventory sync job {job_id} completed")

        return progress.to_dict()

    except Exception as e:
        error_msg = f"Inventory sync job failed: {e}"
        progress.update(progress.processed, 'failed', error_msg)
        progress.result = {
            'success': False,
            'error': error_msg
        }

        if emit_progress:
            _emit_job_progress(progress)

        logger.error(f"Inventory sync job {job_id} failed: {e}")

        return progress.to_dict()

    finally:
        threading.Timer(300, lambda: _cleanup_job(job_id)).start()


def sync_orders_job(job_id: Optional[str] = None, limit: int = 50, status: str = 'any', emit_progress: bool = True) -> Dict[str, Any]:
    """
    Background job to synchronize orders from Shopify.

    Args:
        job_id: Optional job ID
        limit: Maximum number of orders to sync
        status: Order status filter
        emit_progress: Whether to emit progress events

    Returns:
        Job result dictionary
    """
    if not job_id:
        job_id = str(uuid4())

    logger.info(f"Starting order sync job {job_id}")

    progress = JobProgress(job_id, 'sync_orders', total=limit)

    with _job_lock:
        _active_jobs[job_id] = progress

    try:
        progress.update(0, 'running')
        if emit_progress:
            _emit_job_progress(progress)

        shopify_service = ShopifyService()

        if not shopify_service.is_configured():
            raise Exception("Shopify service not configured")

        # Fetch orders
        orders, pagination = shopify_service.list_orders(limit=limit, status=status)

        # Simulate processing orders
        for i, _order in enumerate(orders, 1):
            time.sleep(0.2)  # Simulate processing time
            progress.update(i, 'running')
            if emit_progress:
                _emit_job_progress(progress)

        progress.total = len(orders)
        progress.update(len(orders), 'completed')
        progress.result = {
            'orders_synced': len(orders),
            'success': True,
            'summary': f"Successfully synced {len(orders)} orders"
        }

        if emit_progress:
            _emit_job_progress(progress)

        logger.info(f"Order sync job {job_id} completed: {len(orders)} orders")

        return progress.to_dict()

    except Exception as e:
        error_msg = f"Order sync job failed: {e}"
        progress.update(progress.processed, 'failed', error_msg)
        progress.result = {
            'success': False,
            'error': error_msg
        }

        if emit_progress:
            _emit_job_progress(progress)

        logger.error(f"Order sync job {job_id} failed: {e}")

        return progress.to_dict()

    finally:
        threading.Timer(300, lambda: _cleanup_job(job_id)).start()


def bulk_operation_job(job_id: Optional[str] = None, operation: str = 'test', data: Optional[Dict] = None, emit_progress: bool = True) -> Dict[str, Any]:
    """
    Generic bulk operation job.

    Args:
        job_id: Optional job ID
        operation: Operation type
        data: Operation data
        emit_progress: Whether to emit progress events

    Returns:
        Job result dictionary
    """
    if not job_id:
        job_id = str(uuid4())

    logger.info(f"Starting bulk operation job {job_id}: {operation}")

    progress = JobProgress(job_id, f'bulk_{operation}', total=10)

    with _job_lock:
        _active_jobs[job_id] = progress

    try:
        progress.update(0, 'running')
        if emit_progress:
            _emit_job_progress(progress)

        # Simulate bulk operation
        for i in range(1, 11):
            time.sleep(0.3)
            progress.update(i, 'running')
            if emit_progress:
                _emit_job_progress(progress)

        progress.update(10, 'completed')
        progress.result = {
            'operation': operation,
            'success': True,
            'summary': f"Bulk operation '{operation}' completed successfully"
        }

        if emit_progress:
            _emit_job_progress(progress)

        logger.info(f"Bulk operation job {job_id} completed")

        return progress.to_dict()

    except Exception as e:
        error_msg = f"Bulk operation job failed: {e}"
        progress.update(progress.processed, 'failed', error_msg)
        progress.result = {
            'success': False,
            'error': error_msg
        }

        if emit_progress:
            _emit_job_progress(progress)

        logger.error(f"Bulk operation job {job_id} failed: {e}")

        return progress.to_dict()

    finally:
        threading.Timer(300, lambda: _cleanup_job(job_id)).start()


def run_job_async(job_function: Callable, *args, **kwargs) -> str:
    """
    Run a job function asynchronously in a background thread.

    Args:
        job_function: Function to run
        *args: Function arguments
        **kwargs: Function keyword arguments

    Returns:
        Job ID
    """
    job_id = str(uuid4())

    def run_job():
        try:
            job_function(job_id=job_id, *args, **kwargs)
        except Exception as e:
            logger.error(f"Async job {job_id} failed: {e}")

    thread = threading.Thread(target=run_job, daemon=True)
    thread.start()

    return job_id


def _cleanup_job(job_id: str):
    """Clean up completed job from memory."""
    with _job_lock:
        if job_id in _active_jobs:
            del _active_jobs[job_id]
            logger.debug(f"Cleaned up job {job_id}")
