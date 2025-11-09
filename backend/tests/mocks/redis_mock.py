"""
Mock Redis implementation for testing.
"""
from typing import Any, Dict, Optional, Union
import time
import json

class MockRedis:
    """Mock Redis implementation with configurable latency."""
    
    def __init__(self, latency_ms: float = 0.0):
        """Initialize mock Redis.
        
        Args:
            latency_ms: Simulated latency in milliseconds
        """
        self._data: Dict[str, Any] = {}
        self._latency = latency_ms / 1000.0  # Convert to seconds
        
    def _simulate_latency(self):
        """Simulate network latency."""
        if self._latency > 0:
            time.sleep(self._latency)
            
    def get(self, key: str) -> Optional[bytes]:
        """Get value for key."""
        self._simulate_latency()
        value = self._data.get(key)
        if value is None:
            return None
        if isinstance(value, (dict, list)):
            return json.dumps(value).encode('utf-8')
        return str(value).encode('utf-8')
        
    def set(self, key: str, value: Union[str, bytes, dict, list], 
            ex: Optional[int] = None) -> bool:
        """Set key to value with optional expiration."""
        self._simulate_latency()
        if isinstance(value, bytes):
            try:
                # Try to decode JSON
                value = json.loads(value.decode('utf-8'))
            except json.JSONDecodeError:
                value = value.decode('utf-8')
        self._data[key] = value
        return True
        
    def delete(self, key: str) -> int:
        """Delete key."""
        self._simulate_latency()
        if key in self._data:
            del self._data[key]
            return 1
        return 0
        
    def exists(self, key: str) -> bool:
        """Check if key exists."""
        self._simulate_latency()
        return key in self._data
        
    def flushall(self) -> bool:
        """Clear all data."""
        self._simulate_latency()
        self._data.clear()
        return True
        
    def keys(self, pattern: str = "*") -> list:
        """Get all keys matching pattern."""
        self._simulate_latency()
        # Basic pattern matching support
        if pattern == "*":
            return list(self._data.keys())
        return [k for k in self._data.keys() if pattern.replace("*", "") in k]
        
    def hset(self, name: str, key: str, value: Any) -> int:
        """Set hash field to value."""
        self._simulate_latency()
        if name not in self._data:
            self._data[name] = {}
        self._data[name][key] = value
        return 1
        
    def hget(self, name: str, key: str) -> Optional[bytes]:
        """Get value of hash field."""
        self._simulate_latency()
        if name not in self._data:
            return None
        value = self._data[name].get(key)
        if value is None:
            return None
        if isinstance(value, (dict, list)):
            return json.dumps(value).encode('utf-8')
        return str(value).encode('utf-8')
        
    def hgetall(self, name: str) -> Dict[bytes, bytes]:
        """Get all fields and values in hash."""
        self._simulate_latency()
        if name not in self._data:
            return {}
        return {
            k.encode('utf-8'): (
                json.dumps(v).encode('utf-8') if isinstance(v, (dict, list))
                else str(v).encode('utf-8')
            )
            for k, v in self._data[name].items()
        } 