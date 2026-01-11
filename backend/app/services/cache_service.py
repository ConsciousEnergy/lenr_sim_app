"""Cache service for storing computation results."""
from typing import Any, Dict, Optional
import time
from functools import wraps

class CacheService:
    def __init__(self, max_size: int = 1000, ttl: int = 3600):
        """Initialize cache service.
        
        Args:
            max_size: Maximum number of items in cache
            ttl: Time to live in seconds
        """
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._max_size = max_size
        self._ttl = ttl
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found/expired
        """
        if key not in self._cache:
            return None
            
        entry = self._cache[key]
        if time.time() - entry['timestamp'] > self._ttl:
            del self._cache[key]
            return None
            
        return entry['value']
    
    def set(self, key: str, value: Any) -> None:
        """Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
        """
        if len(self._cache) >= self._max_size:
            # Remove oldest entry
            oldest_key = min(
                self._cache.keys(),
                key=lambda k: self._cache[k]['timestamp']
            )
            del self._cache[oldest_key]
        
        self._cache[key] = {
            'value': value,
            'timestamp': time.time()
        }
    
    def delete(self, key: str) -> None:
        """Delete value from cache.
        
        Args:
            key: Cache key
        """
        if key in self._cache:
            del self._cache[key]
    
    def clear(self) -> None:
        """Clear all entries from cache."""
        self._cache.clear()
    
    def cleanup_expired(self) -> None:
        """Remove expired entries from cache."""
        current_time = time.time()
        expired_keys = [
            key for key, entry in self._cache.items()
            if current_time - entry['timestamp'] > self._ttl
        ]
        for key in expired_keys:
            del self._cache[key]

def cache_result(ttl: Optional[int] = None):
    """Decorator for caching function results.
    
    Args:
        ttl: Optional custom TTL in seconds
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Create cache key from function name and arguments
            key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            
            # Get or create cache service instance
            cache = CacheService()
            
            # Try to get from cache
            result = cache.get(key)
            if result is not None:
                return result
            
            # Calculate result and cache it
            result = func(*args, **kwargs)
            cache.set(key, result)
            
            return result
        return wrapper
    return decorator

# Create global cache instance
cache = CacheService() 