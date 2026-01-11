"""
Memory monitoring utilities for the LENR_Sim_App

This module provides functions and classes for monitoring memory usage
and taking actions when thresholds are exceeded.
"""

import gc
import threading
import time
import logging
import tracemalloc
import psutil
from typing import List, Dict, Any, Optional, Callable, Tuple, Union
import sys

from app.utils.logging import setup_logger

# Set up logger
memory_logger = setup_logger("memory_monitor", "logs/memory.log")

class MemoryMonitor:
    """
    Class for monitoring memory usage and taking actions when thresholds are exceeded.
    """
    
    def __init__(
        self,
        warning_threshold: float = 75.0,
        critical_threshold: float = 90.0,
        check_interval: float = 5.0,
        enable_tracemalloc: bool = False,
        auto_gc_enabled: bool = True
    ):
        """
        Initialize the memory monitor.
        
        Args:
            warning_threshold: Percentage memory usage to trigger warning
            critical_threshold: Percentage memory usage to trigger critical actions
            check_interval: Time between checks in seconds
            enable_tracemalloc: Whether to enable tracemalloc for memory snapshots
            auto_gc_enabled: Whether to automatically run garbage collection
        """
        # Configuration
        self.warning_threshold = warning_threshold
        self.critical_threshold = critical_threshold
        self.check_interval = check_interval
        self.enable_tracemalloc = enable_tracemalloc
        self.auto_gc_enabled = auto_gc_enabled
        
        # State
        self.monitoring_thread = None
        self.stop_monitoring = threading.Event()
        self.snapshots = []
        
        # Callbacks
        self.warning_callbacks = []
        self.critical_callbacks = []
        
        # Initialize tracemalloc if enabled
        if self.enable_tracemalloc:
            tracemalloc.start()
            memory_logger.info("Tracemalloc enabled")
    
    def start_monitoring(self):
        """Start the memory monitoring thread"""
        if self.monitoring_thread is not None and self.monitoring_thread.is_alive():
            memory_logger.warning("Memory monitoring thread already running")
            return
        
        self.stop_monitoring.clear()
        self.monitoring_thread = threading.Thread(
            target=self._monitor_memory,
            daemon=True
        )
        self.monitoring_thread.start()
        memory_logger.info("Memory monitoring started")
    
    def stop_monitoring_thread(self):
        """Stop the memory monitoring thread"""
        if self.monitoring_thread is None or not self.monitoring_thread.is_alive():
            memory_logger.warning("Memory monitoring thread not running")
            return
        
        self.stop_monitoring.set()
        self.monitoring_thread.join(timeout=2.0)
        memory_logger.info("Memory monitoring stopped")
        
        if self.enable_tracemalloc:
            tracemalloc.stop()
    
    def _monitor_memory(self):
        """Monitor memory usage in a loop"""
        consecutive_warnings = 0
        
        while not self.stop_monitoring.is_set():
            try:
                # Get memory usage
                memory_percent = self.get_memory_usage()
                
                if memory_percent >= self.critical_threshold:
                    memory_logger.critical(
                        f"Critical memory threshold exceeded: {memory_percent:.2f}% "
                        f"(threshold: {self.critical_threshold}%)"
                    )
                    self._trigger_critical_actions(memory_percent)
                    consecutive_warnings += 1
                    
                    # If we've had too many consecutive warnings, try aggressive memory cleanup
                    if consecutive_warnings >= 3:
                        self._perform_aggressive_cleanup()
                        consecutive_warnings = 0
                
                elif memory_percent >= self.warning_threshold:
                    memory_logger.warning(
                        f"Warning memory threshold exceeded: {memory_percent:.2f}% "
                        f"(threshold: {self.warning_threshold}%)"
                    )
                    self._trigger_warning_actions(memory_percent)
                    consecutive_warnings += 1
                else:
                    consecutive_warnings = 0
                
                # Sleep until next check
                time.sleep(self.check_interval)
                
            except Exception as e:
                memory_logger.error(f"Error in memory monitoring: {str(e)}")
                # Continue monitoring even if there's an error
                time.sleep(self.check_interval)
    
    def get_memory_usage(self) -> float:
        """
        Get current memory usage as a percentage
        
        Returns:
            Memory usage percentage
        """
        return psutil.virtual_memory().percent
    
    def get_memory_stats(self) -> Dict[str, Any]:
        """
        Get detailed memory statistics
        
        Returns:
            Dictionary with memory stats
        """
        mem = psutil.virtual_memory()
        
        stats = {
            "total": mem.total,
            "available": mem.available,
            "used": mem.used,
            "free": mem.free,
            "percent": mem.percent,
            "gc_count": gc.get_count(),
            "gc_threshold": gc.get_threshold(),
            "tracemalloc_enabled": tracemalloc.is_tracing() if "tracemalloc" in sys.modules else False
        }
        
        return stats
    
    def _trigger_warning_actions(self, memory_percent: float):
        """
        Trigger actions when warning threshold is exceeded
        
        Args:
            memory_percent: Current memory usage percentage
        """
        # Perform garbage collection if auto-gc is enabled
        if self.auto_gc_enabled:
            collected = gc.collect(0)  # Collect generation 0 only (less expensive)
            memory_logger.info(f"Warning threshold GC: collected {collected} objects")
        
        # Take memory snapshot if tracemalloc is enabled
        if self.enable_tracemalloc:
            snapshot = tracemalloc.take_snapshot()
            self.snapshots.append(("warning", memory_percent, snapshot))
            if len(self.snapshots) > 5:
                self.snapshots.pop(0)  # Keep only the 5 most recent snapshots
        
        # Call warning callbacks
        for callback in self.warning_callbacks:
            try:
                callback(memory_percent)
            except Exception as e:
                memory_logger.error(f"Error in warning callback: {str(e)}")
    
    def _trigger_critical_actions(self, memory_percent: float):
        """
        Trigger actions when critical threshold is exceeded
        
        Args:
            memory_percent: Current memory usage percentage
        """
        # Perform full garbage collection
        collected = gc.collect()
        memory_logger.info(f"Critical threshold GC: collected {collected} objects")
        
        # Take memory snapshot if tracemalloc is enabled
        if self.enable_tracemalloc:
            snapshot = tracemalloc.take_snapshot()
            self.snapshots.append(("critical", memory_percent, snapshot))
            
            # Log top memory consumers
            top_stats = snapshot.statistics("lineno")
            memory_logger.critical("Top 10 memory consumers:")
            for i, stat in enumerate(top_stats[:10]):
                memory_logger.critical(f"#{i}: {stat}")
        
        # Call critical callbacks
        for callback in self.critical_callbacks:
            try:
                callback(memory_percent)
            except Exception as e:
                memory_logger.error(f"Error in critical callback: {str(e)}")
    
    def _perform_aggressive_cleanup(self):
        """Perform aggressive memory cleanup actions"""
        memory_logger.warning("Performing aggressive memory cleanup")
        
        # Collect all generations
        collected = gc.collect()
        memory_logger.info(f"Aggressive GC: collected {collected} objects")
        
        # Disable automatic garbage collection temporarily
        gc_enabled = gc.isenabled()
        gc.disable()
        
        try:
            # Force collection of all generations multiple times
            total_collected = 0
            for _ in range(3):
                collected = gc.collect()
                total_collected += collected
                if collected == 0:
                    break
            
            memory_logger.info(f"Total objects collected in aggressive cleanup: {total_collected}")
            
        finally:
            # Restore automatic garbage collection if it was enabled
            if gc_enabled:
                gc.enable()
    
    def get_memory_snapshot(self) -> Optional[Dict[str, Any]]:
        """
        Get the most recent memory snapshot if tracemalloc is enabled
        
        Returns:
            Dictionary with snapshot information or None if tracemalloc is disabled
        """
        if not self.enable_tracemalloc or not tracemalloc.is_tracing():
            return None
        
        snapshot = tracemalloc.take_snapshot()
        top_stats = snapshot.statistics("lineno")
        
        result = {
            "timestamp": time.time(),
            "memory_percent": self.get_memory_usage(),
            "top_consumers": [
                {
                    "file": stat.traceback[0].filename,
                    "line": stat.traceback[0].lineno,
                    "size": stat.size,
                    "count": stat.count
                }
                for stat in top_stats[:20]  # Top 20 consumers
            ]
        }
        
        return result
    
    def register_warning_callback(self, callback: Callable[[float], None]):
        """
        Register a callback to be called when warning threshold is exceeded
        
        Args:
            callback: Function that takes memory percentage as argument
        """
        self.warning_callbacks.append(callback)
    
    def register_critical_callback(self, callback: Callable[[float], None]):
        """
        Register a callback to be called when critical threshold is exceeded
        
        Args:
            callback: Function that takes memory percentage as argument
        """
        self.critical_callbacks.append(callback)


# Singleton instance
_memory_monitor = None

def start_memory_monitoring(
    warning_threshold: float = 75.0,
    critical_threshold: float = 90.0,
    check_interval: float = 5.0,
    enable_tracemalloc: bool = False,
    auto_gc_enabled: bool = True
):
    """
    Start monitoring memory usage.
    
    Args:
        warning_threshold: Percentage memory usage to trigger warning
        critical_threshold: Percentage memory usage to trigger critical actions
        check_interval: Time between checks in seconds
        enable_tracemalloc: Whether to enable tracemalloc for memory snapshots
        auto_gc_enabled: Whether to automatically run garbage collection
    """
    global _memory_monitor
    
    if _memory_monitor is None:
        _memory_monitor = MemoryMonitor(
            warning_threshold=warning_threshold,
            critical_threshold=critical_threshold,
            check_interval=check_interval,
            enable_tracemalloc=enable_tracemalloc,
            auto_gc_enabled=auto_gc_enabled
        )
    else:
        # Update settings for existing monitor
        _memory_monitor.warning_threshold = warning_threshold
        _memory_monitor.critical_threshold = critical_threshold
        _memory_monitor.check_interval = check_interval
        
        # Cannot change tracemalloc setting for existing monitor
        if _memory_monitor.enable_tracemalloc != enable_tracemalloc:
            memory_logger.warning(
                "Cannot change tracemalloc setting for running monitor. "
                "Stop and restart monitoring to change this setting."
            )
        
        _memory_monitor.auto_gc_enabled = auto_gc_enabled
    
    _memory_monitor.start_monitoring()

def stop_memory_monitoring():
    """Stop monitoring memory usage."""
    global _memory_monitor
    
    if _memory_monitor is not None:
        _memory_monitor.stop_monitoring_thread()

def perform_gc_cleanup() -> int:
    """
    Perform garbage collection
    
    Returns:
        Number of objects collected
    """
    memory_logger.info("Manual garbage collection triggered")
    collected = gc.collect()
    memory_logger.info(f"GC: collected {collected} objects")
    return collected

def get_memory_usage() -> Dict[str, Any]:
    """
    Get detailed memory usage statistics
    
    Returns:
        Dictionary with memory usage information
    """
    global _memory_monitor
    
    if _memory_monitor is not None:
        stats = _memory_monitor.get_memory_stats()
    else:
        mem = psutil.virtual_memory()
        stats = {
            "total": mem.total,
            "available": mem.available,
            "used": mem.used,
            "free": mem.free,
            "percent": mem.percent
        }
    
    # Add human-readable sizes
    stats["total_human"] = _format_bytes(stats["total"])
    stats["available_human"] = _format_bytes(stats["available"])
    stats["used_human"] = _format_bytes(stats["used"])
    stats["free_human"] = _format_bytes(stats["free"])
    
    return stats

def get_memory_snapshot() -> Optional[Dict[str, Any]]:
    """
    Get the most recent memory snapshot if tracemalloc is enabled
    
    Returns:
        Dictionary with snapshot information or None if tracemalloc is disabled
    """
    global _memory_monitor
    
    if _memory_monitor is not None:
        return _memory_monitor.get_memory_snapshot()
    
    return None

def register_warning_callback(callback: Callable[[float], None]):
    """
    Register a callback to be called when warning threshold is exceeded
    
    Args:
        callback: Function that takes memory percentage as argument
    """
    global _memory_monitor
    
    if _memory_monitor is not None:
        _memory_monitor.register_warning_callback(callback)
    else:
        memory_logger.warning("Memory monitor not started, callback registration ignored")

def register_critical_callback(callback: Callable[[float], None]):
    """
    Register a callback to be called when critical threshold is exceeded
    
    Args:
        callback: Function that takes memory percentage as argument
    """
    global _memory_monitor
    
    if _memory_monitor is not None:
        _memory_monitor.register_critical_callback(callback)
    else:
        memory_logger.warning("Memory monitor not started, callback registration ignored")

def _format_bytes(size: int) -> str:
    """
    Format bytes to human-readable string
    
    Args:
        size: Size in bytes
        
    Returns:
        Human-readable string
    """
    for unit in ["B", "KB", "MB", "GB", "TB", "PB"]:
        if size < 1024.0:
            return f"{size:.2f} {unit}"
        size /= 1024.0
    
    return f"{size:.2f} EB" 