"""
Memory Monitor Utility for LENR_Sim_App

Provides functions to monitor and manage memory usage
"""

import os
import gc
import psutil
import threading
import time
from typing import Callable, Optional, Dict, Any, List
import tracemalloc
import sys

from app.utils.logging import setup_logger

# Set up logger
memory_logger = setup_logger("memory", "logs/memory.log")

# Storage for tracemalloc snapshots for leak detection
_snapshots = []
_MAX_SNAPSHOTS = 5

class MemoryThresholdExceeded(Exception):
    """Exception raised when memory usage exceeds a threshold"""
    pass

class MemoryMonitor:
    """
    Memory monitoring utility that can track memory usage
    and trigger actions when thresholds are exceeded
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
        Initialize the memory monitor
        
        Args:
            warning_threshold: Percentage of memory usage to trigger warnings
            critical_threshold: Percentage of memory usage to trigger critical actions
            check_interval: Interval in seconds between memory checks
            enable_tracemalloc: Whether to enable tracemalloc for detailed memory tracking
            auto_gc_enabled: Whether to automatically run garbage collection when thresholds are exceeded
        """
        self.warning_threshold = warning_threshold
        self.critical_threshold = critical_threshold
        self.check_interval = check_interval
        self.monitoring_thread = None
        self.stop_monitoring = threading.Event()
        self.process = psutil.Process(os.getpid())
        self.warning_callbacks: List[Callable[[float], None]] = []
        self.critical_callbacks: List[Callable[[float], None]] = []
        self.enable_tracemalloc = enable_tracemalloc
        self.auto_gc_enabled = auto_gc_enabled
        
        if enable_tracemalloc:
            tracemalloc.start()
            memory_logger.info("Tracemalloc enabled for detailed memory tracking")
        
        memory_logger.info(
            f"MemoryMonitor initialized with warning threshold {warning_threshold}% "
            f"and critical threshold {critical_threshold}%"
        )
    
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
        global _snapshots
        
        # Take initial snapshot if tracemalloc is enabled
        if self.enable_tracemalloc and tracemalloc.is_tracing():
            snapshot = tracemalloc.take_snapshot()
            _snapshots.append(snapshot)
        
        consecutive_warnings = 0
        
        while not self.stop_monitoring.is_set():
            try:
                memory_percent = self.get_memory_usage()
                
                # Take tracemalloc snapshot if enabled
                if self.enable_tracemalloc and tracemalloc.is_tracing():
                    snapshot = tracemalloc.take_snapshot()
                    _snapshots.append(snapshot)
                    
                    # Keep only the last few snapshots
                    if len(_snapshots) > _MAX_SNAPSHOTS:
                        _snapshots.pop(0)
                
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
    
    def get_process_memory(self) -> Dict[str, Any]:
        """
        Get detailed memory usage for the current process
        
        Returns:
            Dictionary with memory usage details
        """
        memory_info = self.process.memory_info()
        return {
            "rss": memory_info.rss,  # Resident set size
            "rss_mb": memory_info.rss / (1024 * 1024),  # RSS in MB
            "vms": memory_info.vms,  # Virtual memory size
            "vms_mb": memory_info.vms / (1024 * 1024),  # VMS in MB
            "shared": getattr(memory_info, "shared", 0),  # Shared memory
            "text": getattr(memory_info, "text", 0),  # Text segment memory
            "data": getattr(memory_info, "data", 0),  # Data segment memory
            "lib": getattr(memory_info, "lib", 0),  # Libs memory
            "percent": self.process.memory_percent()
        }
    
    def _trigger_warning_actions(self, memory_percent: float):
        """
        Trigger actions when warning threshold is exceeded
        
        Args:
            memory_percent: Current memory usage percentage
        """
        # Execute all warning callbacks
        for callback in self.warning_callbacks:
            try:
                callback(memory_percent)
            except Exception as e:
                memory_logger.error(f"Error in warning callback: {str(e)}")
        
        # Default action: collect garbage if auto GC is enabled
        if self.auto_gc_enabled:
            collected = gc.collect()
            memory_logger.info(f"Garbage collection performed, {collected} objects collected")
            
            # Try to clear caches
            try:
                from app.utils.simulation_cache import remove_expired_items
                removed = remove_expired_items()
                if removed > 0:
                    memory_logger.info(f"Removed {removed} expired items from caches")
            except (ImportError, AttributeError):
                pass
    
    def _trigger_critical_actions(self, memory_percent: float):
        """
        Trigger actions when critical threshold is exceeded
        
        Args:
            memory_percent: Current memory usage percentage
        """
        # Execute all critical callbacks
        for callback in self.critical_callbacks:
            try:
                callback(memory_percent)
            except Exception as e:
                memory_logger.error(f"Error in critical callback: {str(e)}")
        
        # Default actions: collect garbage and log memory traceback
        if self.auto_gc_enabled:
            collected = gc.collect()
            memory_logger.critical(f"Emergency garbage collection performed, {collected} objects collected")
            
            # Try to clear all caches
            try:
                from app.utils.simulation_cache import clear_cache
                cleared = clear_cache()
                memory_logger.critical(f"Cleared {cleared} items from simulation caches")
            except (ImportError, AttributeError):
                pass
        
        # Log memory usage details
        process_memory = self.get_process_memory()
        memory_logger.critical(f"Process memory usage: {process_memory}")
        
        # Log memory traceback if tracemalloc is enabled
        if self.enable_tracemalloc and tracemalloc.is_tracing():
            snapshot = tracemalloc.take_snapshot()
            top_stats = snapshot.statistics('lineno')
            memory_logger.critical("Top 10 memory allocations:")
            for i, stat in enumerate(top_stats[:10]):
                memory_logger.critical(f"{i+1}. {stat.size / 1024:.1f} KB - {stat.traceback.format()[0]}")
            
            # Compare with previous snapshot if available
            if len(_snapshots) >= 2:
                current = snapshot
                previous = _snapshots[-2]
                diff_stats = current.compare_to(previous, 'lineno')
                memory_logger.critical("Top 5 memory increases since last check:")
                for i, stat in enumerate(diff_stats[:5]):
                    if stat.size_diff > 0:  # Only show increases
                        memory_logger.critical(f"{i+1}. +{stat.size_diff / 1024:.1f} KB - {stat.traceback.format()[0]}")
    
    def _perform_aggressive_cleanup(self):
        """Perform aggressive memory cleanup when memory usage remains high"""
        memory_logger.critical("Performing aggressive memory cleanup")
        
        # Multiple garbage collection passes
        for i in range(3):
            collected = gc.collect()
            memory_logger.critical(f"Garbage collection pass {i+1}: {collected} objects collected")
        
        # Clear all module-level caches that might be holding references
        self._clear_module_caches()
        
        # Log objects that can't be collected
        self._log_uncollectable_objects()
        
        # Force Python to release unused memory back to the OS
        if hasattr(gc, 'collect'):
            try:
                if sys.platform == 'linux':
                    # On Linux, try to release memory to the OS
                    import ctypes
                    libc = ctypes.CDLL('libc.so.6')
                    libc.malloc_trim(0)
                    memory_logger.info("Released memory back to OS using malloc_trim")
            except Exception as e:
                memory_logger.error(f"Error releasing memory to OS: {str(e)}")
    
    def _clear_module_caches(self):
        """Clear various module-level caches to free up memory"""
        memory_logger.info("Clearing module-level caches")
        
        # Try to clear numpy cache if being used
        try:
            import numpy as np
            np.clear_cache()
            memory_logger.info("Cleared numpy cache")
        except (ImportError, AttributeError):
            pass
        
        # Try to close matplotlib figures if being used
        try:
            import matplotlib.pyplot as plt
            plt.close('all')
            memory_logger.info("Closed all matplotlib figures")
        except ImportError:
            pass
        
        # Clear application-specific caches
        try:
            from app.utils.simulation_cache import clear_cache, clear_function_caches
            items_cleared = clear_cache()
            clear_function_caches()
            memory_logger.info(f"Cleared application caches ({items_cleared} items)")
        except (ImportError, AttributeError):
            pass
    
    def _log_uncollectable_objects(self):
        """Log information about objects that can't be collected by the garbage collector"""
        uncollectable = gc.get_objects()
        obj_count = len(uncollectable)
        memory_logger.info(f"Found {obj_count} objects in garbage collector")
        
        # Log the most common types
        type_counts = {}
        for obj in uncollectable[:1000]:  # Limit to first 1000 to avoid excessive processing
            obj_type = type(obj).__name__
            type_counts[obj_type] = type_counts.get(obj_type, 0) + 1
        
        # Sort and log the top 10 most common types
        sorted_types = sorted(type_counts.items(), key=lambda x: x[1], reverse=True)
        memory_logger.info("Top 10 most common object types in memory:")
        for i, (obj_type, count) in enumerate(sorted_types[:10]):
            memory_logger.info(f"{i+1}. {obj_type}: {count} instances")
    
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


# Global instance
memory_monitor = MemoryMonitor()

def check_memory_threshold(
    warning_threshold: float = 75.0,
    critical_threshold: float = 90.0,
    raise_exception: bool = False
) -> float:
    """
    Check if memory usage exceeds thresholds
    
    Args:
        warning_threshold: Percentage to trigger warning
        critical_threshold: Percentage to trigger critical action
        raise_exception: Whether to raise an exception on critical threshold
        
    Returns:
        Current memory usage percentage
        
    Raises:
        MemoryThresholdExceeded: If critical threshold is exceeded and raise_exception is True
    """
    memory_percent = psutil.virtual_memory().percent
    
    if memory_percent >= critical_threshold:
        memory_logger.critical(
            f"Critical memory threshold exceeded: {memory_percent:.2f}% "
            f"(threshold: {critical_threshold}%)"
        )
        
        # Force garbage collection
        collected = gc.collect()
        memory_logger.info(f"Emergency garbage collection performed, {collected} objects collected")
        
        if raise_exception:
            raise MemoryThresholdExceeded(
                f"Memory usage ({memory_percent:.2f}%) exceeds critical threshold "
                f"({critical_threshold}%)"
            )
    
    elif memory_percent >= warning_threshold:
        memory_logger.warning(
            f"Warning memory threshold exceeded: {memory_percent:.2f}% "
            f"(threshold: {warning_threshold}%)"
        )
        
        # Suggest garbage collection
        gc.collect()
    
    return memory_percent

def start_memory_monitoring(
    warning_threshold: float = 75.0,
    critical_threshold: float = 90.0,
    check_interval: float = 5.0,
    enable_tracemalloc: bool = False,
    auto_gc_enabled: bool = True
):
    """
    Start monitoring memory usage in a background thread
    
    Args:
        warning_threshold: Percentage to trigger warning
        critical_threshold: Percentage to trigger critical action
        check_interval: Interval in seconds between checks
        enable_tracemalloc: Whether to enable tracemalloc
        auto_gc_enabled: Whether to automatically run garbage collection when thresholds are exceeded
    """
    global memory_monitor
    memory_monitor = MemoryMonitor(
        warning_threshold=warning_threshold,
        critical_threshold=critical_threshold,
        check_interval=check_interval,
        enable_tracemalloc=enable_tracemalloc,
        auto_gc_enabled=auto_gc_enabled
    )
    memory_monitor.start_monitoring()

def stop_memory_monitoring():
    """Stop memory monitoring"""
    global memory_monitor
    if memory_monitor:
        memory_monitor.stop_monitoring_thread()

def get_memory_summary() -> Dict[str, Any]:
    """
    Get a summary of current memory usage
    
    Returns:
        Dictionary with memory usage information
    """
    virtual_memory = psutil.virtual_memory()
    process = psutil.Process(os.getpid())
    process_memory = process.memory_info()
    
    return {
        "system": {
            "total": virtual_memory.total,
            "total_gb": virtual_memory.total / (1024**3),
            "available": virtual_memory.available,
            "available_gb": virtual_memory.available / (1024**3),
            "used": virtual_memory.used,
            "used_gb": virtual_memory.used / (1024**3),
            "percent": virtual_memory.percent
        },
        "process": {
            "rss": process_memory.rss,  # Resident set size
            "rss_mb": process_memory.rss / (1024**2),  # RSS in MB
            "vms": process_memory.vms,  # Virtual memory size
            "vms_mb": process_memory.vms / (1024**2),  # VMS in MB
            "percent": process.memory_percent()
        },
        "gc": {
            "garbage_objects": len(gc.get_objects()),
            "gc_enabled": gc.isenabled(),
            "generations": gc.get_count()
        }
    }

def perform_gc_cleanup() -> int:
    """
    Run garbage collection to free up memory.
    
    Returns:
        Number of objects collected
    """
    # Run a garbage collection cycle
    collected = gc.collect()
    memory_logger.info(f"Garbage collection performed, {collected} objects collected")
    return collected

def get_memory_usage() -> Dict[str, Any]:
    """
    Get the current memory usage of the system and process.
    
    Returns:
        Dictionary with memory usage information
    """
    return get_memory_summary() 