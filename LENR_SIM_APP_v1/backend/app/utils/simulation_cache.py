"""
Simulation cache management for the LENR application.

This module provides functions for caching simulation results
and clearing the cache when memory usage gets too high.
"""

import time
import threading
import logging
from typing import Dict, Any, Optional, Tuple, List
from functools import lru_cache
import gc

# Set up logger
logger = logging.getLogger("cache")

# Cache settings
MAX_CACHE_SIZE = 100  # Maximum number of items in the cache
CACHE_EXPIRY_TIME = 3600  # Cache expiry time in seconds (1 hour)

# Thread safety
_cache_lock = threading.RLock()

# Main cache store
_simulation_cache: Dict[str, Tuple[Any, float]] = {}  # (result, timestamp)
_heatmap_cache: Dict[str, Tuple[Any, float]] = {}     # (result, timestamp)
_visualization_cache: Dict[str, Tuple[Any, float]] = {}  # (result, timestamp)

def get_from_cache(cache_type: str, cache_key: str) -> Optional[Any]:
    """
    Get a cached simulation result if it exists and is not expired.
    
    Args:
        cache_type: Type of cache ('simulation', 'heatmap', 'visualization')
        cache_key: Unique key for the cached item
        
    Returns:
        Cached result or None if not found or expired
    """
    with _cache_lock:
        # Select the appropriate cache
        cache = _get_cache_by_type(cache_type)
        
        # Check if the key exists in cache
        if cache_key not in cache:
            logger.debug(f"Cache miss for {cache_type}/{cache_key}")
            return None
        
        # Get the cached item and its timestamp
        result, timestamp = cache[cache_key]
        
        # Check if the cached item has expired
        if time.time() - timestamp > CACHE_EXPIRY_TIME:
            logger.debug(f"Cache expired for {cache_type}/{cache_key}")
            del cache[cache_key]
            return None
        
        # Valid cache hit
        logger.debug(f"Cache hit for {cache_type}/{cache_key}")
        return result

def add_to_cache(cache_type: str, cache_key: str, result: Any) -> None:
    """
    Add a result to the cache with the current timestamp.
    
    Args:
        cache_type: Type of cache ('simulation', 'heatmap', 'visualization')
        cache_key: Unique key for the cached item
        result: Result to cache
    """
    with _cache_lock:
        # Select the appropriate cache
        cache = _get_cache_by_type(cache_type)
        
        # If the cache is full, remove the oldest entry
        if len(cache) >= MAX_CACHE_SIZE:
            oldest_key = None
            oldest_time = float('inf')
            
            # Find the oldest entry
            for key, (_, timestamp) in cache.items():
                if timestamp < oldest_time:
                    oldest_time = timestamp
                    oldest_key = key
            
            # Remove the oldest entry
            if oldest_key:
                logger.debug(f"Removing oldest cache entry {cache_type}/{oldest_key}")
                del cache[oldest_key]
        
        # Add the new entry
        cache[cache_key] = (result, time.time())
        logger.debug(f"Added to cache: {cache_type}/{cache_key}")

def clear_cache(cache_type: Optional[str] = None) -> int:
    """
    Clear all items from the cache or from a specific cache type.
    
    Args:
        cache_type: Optional type of cache to clear ('simulation', 'heatmap', 'visualization')
                   If None, all caches will be cleared
                   
    Returns:
        Number of items cleared from the cache
    """
    with _cache_lock:
        if cache_type:
            # Clear a specific cache
            cache = _get_cache_by_type(cache_type)
            count = len(cache)
            cache.clear()
            logger.info(f"Cleared {count} items from {cache_type} cache")
            return count
        else:
            # Clear all caches
            sim_count = len(_simulation_cache)
            heatmap_count = len(_heatmap_cache)
            viz_count = len(_visualization_cache)
            
            _simulation_cache.clear()
            _heatmap_cache.clear()
            _visualization_cache.clear()
            
            total = sim_count + heatmap_count + viz_count
            logger.info(f"Cleared all caches ({total} items)")
            
            # Run garbage collection to free up memory
            gc.collect()
            
            return total

def get_cache_stats() -> Dict[str, Any]:
    """
    Get statistics about the current cache state.
    
    Returns:
        Dictionary with cache statistics
    """
    with _cache_lock:
        return {
            "simulation": {
                "items": len(_simulation_cache),
                "size_limit": MAX_CACHE_SIZE,
                "expiry_time_seconds": CACHE_EXPIRY_TIME
            },
            "heatmap": {
                "items": len(_heatmap_cache),
                "size_limit": MAX_CACHE_SIZE,
                "expiry_time_seconds": CACHE_EXPIRY_TIME
            },
            "visualization": {
                "items": len(_visualization_cache),
                "size_limit": MAX_CACHE_SIZE,
                "expiry_time_seconds": CACHE_EXPIRY_TIME
            },
            "total_items": len(_simulation_cache) + len(_heatmap_cache) + len(_visualization_cache),
            "timestamp": time.time()
        }

def _get_cache_by_type(cache_type: str) -> Dict:
    """
    Helper function to get the appropriate cache dictionary based on type.
    
    Args:
        cache_type: Type of cache ('simulation', 'heatmap', 'visualization')
        
    Returns:
        The appropriate cache dictionary
        
    Raises:
        ValueError: If an invalid cache type is provided
    """
    if cache_type == 'simulation':
        return _simulation_cache
    elif cache_type == 'heatmap':
        return _heatmap_cache
    elif cache_type == 'visualization':
        return _visualization_cache
    else:
        raise ValueError(f"Invalid cache type: {cache_type}")

def remove_expired_items() -> int:
    """
    Remove all expired items from all caches.
    
    Returns:
        Number of expired items removed
    """
    with _cache_lock:
        current_time = time.time()
        expired_count = 0
        
        # Process each cache
        for cache_name, cache in [
            ('simulation', _simulation_cache),
            ('heatmap', _heatmap_cache),
            ('visualization', _visualization_cache)
        ]:
            # Find expired keys
            expired_keys = [
                key for key, (_, timestamp) in cache.items()
                if current_time - timestamp > CACHE_EXPIRY_TIME
            ]
            
            # Remove expired items
            for key in expired_keys:
                del cache[key]
                expired_count += 1
                
            if expired_keys:
                logger.debug(f"Removed {len(expired_keys)} expired items from {cache_name} cache")
        
        if expired_count > 0:
            logger.info(f"Removed {expired_count} total expired cache items")
            # Run garbage collection after removing expired items
            gc.collect()
        
        return expired_count 