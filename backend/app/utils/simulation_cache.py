"""
Simulation Cache Module for LENR_Sim_App

This module provides functions for caching simulation results to improve performance
by avoiding redundant computations.
"""

import time
import threading
import sys
from typing import Dict, Any, Optional, List, Tuple, Callable
import hashlib
import json

from app.utils.logging import setup_logger

# Set up logger
cache_logger = setup_logger("cache", "logs/cache.log")

# Global cache dictionary
# Structure: {cache_key: (timestamp, value, metadata)}
_simulation_cache: Dict[str, Tuple[float, Any, Dict[str, Any]]] = {}

# Cache lock for thread safety
_cache_lock = threading.RLock()

# Default TTL (Time to Live) for cache items in seconds
DEFAULT_TTL = 3600  # 1 hour

def _generate_cache_key(data: Any) -> str:
    """
    Generate a unique cache key from input data
    
    Args:
        data: Input data to hash
        
    Returns:
        Cache key as string
    """
    # Convert to JSON and encode to bytes
    json_data = json.dumps(data, sort_keys=True)
    return hashlib.md5(json_data.encode('utf-8')).hexdigest()

def get_from_cache(key: str) -> Optional[Any]:
    """
    Get a value from the cache by key
    
    Args:
        key: Cache key
        
    Returns:
        Cached value if found and not expired, None otherwise
    """
    with _cache_lock:
        if key in _simulation_cache:
            timestamp, value, metadata = _simulation_cache[key]
            
            # Check if item has expired
            ttl = metadata.get('ttl', DEFAULT_TTL)
            if time.time() - timestamp > ttl:
                # Item expired
                del _simulation_cache[key]
                cache_logger.debug(f"Cache item expired: {key}")
                return None
            
            # Update access timestamp in metadata
            metadata['last_accessed'] = time.time()
            metadata['access_count'] = metadata.get('access_count', 0) + 1
            
            cache_logger.debug(f"Cache hit: {key}")
            return value
    
    cache_logger.debug(f"Cache miss: {key}")
    return None

def add_to_cache(key: str, value: Any, ttl: Optional[int] = None, 
                metadata: Optional[Dict[str, Any]] = None) -> None:
    """
    Add a value to the cache
    
    Args:
        key: Cache key
        value: Value to cache
        ttl: Time to live in seconds (None uses default)
        metadata: Additional metadata to store with the value
    """
    metadata = metadata or {}
    
    # Set TTL if provided
    if ttl is not None:
        metadata['ttl'] = ttl
    
    # Add creation metadata
    metadata['created'] = time.time()
    metadata['last_accessed'] = time.time()
    metadata['access_count'] = 0
    
    with _cache_lock:
        _simulation_cache[key] = (time.time(), value, metadata)
    
    cache_logger.debug(f"Added to cache: {key}")

def cached_simulation(ttl: Optional[int] = None) -> Callable:
    """
    Decorator for caching simulation function results
    
    Args:
        ttl: Optional time to live in seconds
        
    Returns:
        Decorator function
    """
    def decorator(func: Callable) -> Callable:
        def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_data = {
                'func': func.__name__,
                'args': args,
                'kwargs': kwargs
            }
            key = _generate_cache_key(cache_data)
            
            # Try to get from cache
            cached_result = get_from_cache(key)
            if cached_result is not None:
                return cached_result
            
            # Not in cache, execute function
            result = func(*args, **kwargs)
            
            # Store in cache
            add_to_cache(key, result, ttl=ttl, metadata={'function': func.__name__})
            
            return result
        
        return wrapper
    
    return decorator

def clear_cache() -> int:
    """
    Clear all items from the cache
    
    Returns:
        Number of items removed
    """
    with _cache_lock:
        count = len(_simulation_cache)
        _simulation_cache.clear()
    
    cache_logger.info(f"Cache cleared: {count} items removed")
    return count

def remove_expired_items() -> int:
    """
    Remove all expired items from the cache
    
    Returns:
        Number of expired items removed
    """
    current_time = time.time()
    removed_count = 0
    
    with _cache_lock:
        keys_to_remove = []
        
        for key, (timestamp, _, metadata) in _simulation_cache.items():
            ttl = metadata.get('ttl', DEFAULT_TTL)
            if current_time - timestamp > ttl:
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del _simulation_cache[key]
            removed_count += 1
    
    if removed_count > 0:
        cache_logger.info(f"Removed {removed_count} expired cache items")
    
    return removed_count

def get_cache_stats() -> Dict[str, Any]:
    """
    Get statistics about the cache
    
    Returns:
        Dictionary with cache statistics
    """
    with _cache_lock:
        total_items = len(_simulation_cache)
        
        # Calculate size (approximate)
        total_size = 0
        expired_items = 0
        current_time = time.time()
        
        for _, (timestamp, value, metadata) in _simulation_cache.items():
            ttl = metadata.get('ttl', DEFAULT_TTL)
            if current_time - timestamp > ttl:
                expired_items += 1
            
            # Get approximate size by converting to JSON
            try:
                value_json = json.dumps(value)
                total_size += len(value_json)
            except (TypeError, ValueError):
                # If not JSON serializable, make a best guess
                total_size += sys.getsizeof(str(value))
        
        stats = {
            "total_items": total_items,
            "total_size_bytes": total_size,
            "expired_items": expired_items,
            "creation_time": min([data[0] for data in _simulation_cache.values()]) if total_items > 0 else None,
            "newest_item_time": max([data[0] for data in _simulation_cache.values()]) if total_items > 0 else None,
        }
    
    return stats 