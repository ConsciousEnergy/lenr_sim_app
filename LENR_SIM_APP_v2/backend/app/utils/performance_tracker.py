"""
Performance tracking utilities for LENR_Sim_App

This module provides tools for tracking performance metrics of various
operations to help identify expensive operations and potential timeout risks.
"""

import time
import threading
import functools
import statistics
import json
from typing import Dict, List, Any, Callable, Optional
from .logging import setup_logger

# Set up performance logger
performance_logger = setup_logger("performance", "logs/performance.log")

class PerformanceMetric:
    """Stores performance metrics for a specific operation"""
    
    def __init__(self, name: str):
        """Initialize performance metric"""
        self.name = name
        self.call_count = 0
        self.total_time = 0.0
        self.times = []
        self.max_time = 0.0
        self.min_time = float('inf')
        self.cache_hits = 0
        self.cache_misses = 0
        self.failed_calls = 0
        self.last_error = None
    
    def record(self, duration: float, cache_hit: bool = False, error: Optional[Exception] = None) -> None:
        """Record a duration measurement"""
        self.call_count += 1
        
        if error:
            self.failed_calls += 1
            self.last_error = str(error)
            performance_logger.warning(f"Operation '{self.name}' failed: {str(error)}")
            return
            
        self.total_time += duration
        self.times.append(duration)
        self.max_time = max(self.max_time, duration)
        self.min_time = min(self.min_time, duration)
        
        if cache_hit:
            self.cache_hits += 1
        else:
            self.cache_misses += 1
        
        # Log slow operations based on thresholds
        if duration > 5.0:
            performance_logger.warning(f"Very slow operation: '{self.name}' took {duration:.2f}s")
        elif duration > 1.0:
            performance_logger.info(f"Slow operation: '{self.name}' took {duration:.2f}s")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get statistics for this metric"""
        if not self.times:
            return {
                "name": self.name,
                "call_count": self.call_count,
                "failed_calls": self.failed_calls,
                "last_error": self.last_error
            }
            
        return {
            "name": self.name,
            "call_count": self.call_count,
            "total_time": round(self.total_time, 3),
            "average_time": round(self.total_time / max(1, self.call_count), 3),
            "max_time": round(self.max_time, 3),
            "min_time": round(self.min_time, 3),
            "median_time": round(statistics.median(self.times) if self.times else 0, 3),
            "cache_hit_ratio": round(self.cache_hits / max(1, self.call_count), 2),
            "failed_calls": self.failed_calls,
            "last_error": self.last_error
        }

class PerformanceTracker:
    """Tracks performance metrics across the application with configurable thresholds"""
    
    _instances = {}
    _lock = threading.Lock()
    
    def __new__(cls, tracker_name="default"):
        """Ensure singleton instance per tracker name"""
        with cls._lock:
            if tracker_name not in cls._instances:
                instance = super(PerformanceTracker, cls).__new__(cls)
                instance._metrics = {}
                instance._tracker_name = tracker_name
                instance._thresholds = {
                    # Default thresholds for common operations (in seconds)
                    "enhancement_calculation": 2.0,
                    "tunneling_calculation": 3.0,
                    "fusion_rate_calculation": 1.0,
                    "visualization_rendering": 2.0,
                    "mesh_generation": 5.0,
                    "database_query": 1.0,
                    "file_io": 2.0
                }
                # New: Add timeout tracking
                instance._timeout_risks = {}
                instance._last_cleanup = time.time()
                cls._instances[tracker_name] = instance
            
        return cls._instances[tracker_name]
    
    def __init__(self, tracker_name="default"):
        """Initialize performance tracker"""
        # Already initialized by __new__
        pass
    
    def set_threshold(self, operation_type: str, threshold_seconds: float) -> None:
        """Set a custom threshold for a specific operation"""
        with self._lock:
            self._thresholds[operation_type] = threshold_seconds
    
    def track(self, name: str, duration: float, cache_hit: bool = False, error: Optional[Exception] = None) -> None:
        """Track a performance metric"""
        with self._lock:
            if name not in self._metrics:
                self._metrics[name] = PerformanceMetric(name)
            
            self._metrics[name].record(duration, cache_hit, error)
    
    def track_slow_operation(self, operation_type: str, duration: float, details: Optional[Dict[str, Any]] = None) -> None:
        """
        Track an operation that might be slow and log detailed information
        
        Args:
            operation_type: Type of operation (used for threshold lookup)
            duration: Duration in seconds
            details: Optional details about the operation
        """
        threshold = self._thresholds.get(operation_type, 1.0)
        
        # Track the metric
        self.track(operation_type, duration)
        
        # New: Calculate timeout risk score based on duration relative to threshold
        with self._lock:
            if duration > threshold:
                risk_score = duration / threshold
                
                # Store in timeout risks with timestamp
                self._timeout_risks[f"{operation_type}_{time.time()}"] = {
                    "operation": operation_type,
                    "duration": duration,
                    "threshold": threshold,
                    "risk_score": risk_score,
                    "timestamp": time.time(),
                    "details": details or {}
                }
                
                # Clean up old entries (older than 1 hour)
                current_time = time.time()
                if current_time - self._last_cleanup > 600:  # Every 10 minutes
                    self._timeout_risks = {
                        k: v for k, v in self._timeout_risks.items()
                        if current_time - v["timestamp"] < 3600  # Keep last hour
                    }
                    self._last_cleanup = current_time
        
        # Log slow operations based on thresholds
        if duration > threshold:
            details_str = f", details: {json.dumps(details)}" if details else ""
            
            # Use different log levels based on severity
            if duration > threshold * 3:
                # Extremely slow - could cause timeouts
                performance_logger.error(
                    f"CRITICAL PERFORMANCE: {operation_type} took {duration:.2f}s "
                    f"(threshold: {threshold:.2f}s){details_str}"
                )
            elif duration > threshold * 1.5:
                # Very slow - potential issue
                performance_logger.warning(
                    f"SLOW: {operation_type} took {duration:.2f}s "
                    f"(threshold: {threshold:.2f}s){details_str}"
                )
            else:
                # Somewhat slow - worth noting
                performance_logger.info(
                    f"PERFORMANCE: {operation_type} took {duration:.2f}s "
                    f"(threshold: {threshold:.2f}s){details_str}"
                )
    
    def get_all_metrics(self) -> Dict[str, Dict[str, Any]]:
        """Get all metrics"""
        with self._lock:
            return {name: metric.get_stats() for name, metric in self._metrics.items()}
    
    def get_metric(self, name: str) -> Optional[Dict[str, Any]]:
        """Get a specific metric"""
        with self._lock:
            if name in self._metrics:
                return self._metrics[name].get_stats()
            return None
    
    def reset_metrics(self) -> None:
        """Reset all metrics"""
        with self._lock:
            self._metrics = {}
            self._timeout_risks = {}
    
    def get_slow_operations(self, threshold: float = None) -> List[Dict[str, Any]]:
        """Get operations that exceed a time threshold"""
        with self._lock:
            slow_ops = []
            for name, metric in self._metrics.items():
                stats = metric.get_stats()
                operation_threshold = threshold or self._thresholds.get(name, 1.0)
                
                if stats.get("average_time", 0) > operation_threshold:
                    stats["threshold"] = operation_threshold
                    stats["threshold_exceeded"] = stats.get("average_time", 0) / operation_threshold
                    slow_ops.append(stats)
            
            # Sort by threshold_exceeded ratio (descending)
            slow_ops.sort(key=lambda x: x.get("threshold_exceeded", 0), reverse=True)
            return slow_ops
            
    def get_timeout_risks(self) -> List[Dict[str, Any]]:
        """Get operations with high timeout risk in the last hour"""
        with self._lock:
            # Sort by risk score (highest first)
            risks = list(self._timeout_risks.values())
            risks.sort(key=lambda x: x.get("risk_score", 0), reverse=True)
            return risks[:20]  # Return top 20 risks


# Singleton instance
tracker = PerformanceTracker()

def track_performance(name: Optional[str] = None):
    """
    Decorator to track function performance
    
    Args:
        name: Optional name for the metric (defaults to function name)
    """
    def decorator(func: Callable):
        metric_name = name or func.__name__
        
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            error = None
            try:
                result = func(*args, **kwargs)
                
                # Check if result has cache_hit metadata
                cache_hit = False
                if isinstance(result, dict) and "metadata" in result:
                    cache_hit = result.get("metadata", {}).get("cache_hit", False)
                
                return result
            except Exception as e:
                error = e
                raise
            finally:
                duration = time.time() - start_time
                tracker.track(metric_name, duration, cache_hit, error)
        
        return wrapper
    
    # Handle case where decorator is used without parentheses
    if callable(name):
        func = name
        name = func.__name__
        return decorator(func)
    
    return decorator

# Export the singleton instance
def get_tracker():
    """Get the global performance tracker instance"""
    return tracker 