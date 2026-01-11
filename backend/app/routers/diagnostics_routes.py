"""
Diagnostics Routes for LENR_Sim_App

This module provides FastAPI routes for system diagnostics and monitoring.
"""

import os
import sys
import psutil
import platform
import gc
from datetime import datetime
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Path
from pydantic import BaseModel, Field

from app.core.config import settings
from app.utils.logging import setup_logger
from app.utils.memory_monitor import get_memory_usage, perform_gc_cleanup

# Set up logger
diagnostics_logger = setup_logger("diagnostics", "logs/diagnostics.log")

# Create router instance
router = APIRouter()

# --- Models ---

class SystemInfo(BaseModel):
    """Model for system information"""
    os: Dict[str, Any] = Field(..., description="Operating system information")
    python: Dict[str, Any] = Field(..., description="Python interpreter information")
    cpu: Dict[str, Any] = Field(..., description="CPU information")
    memory: Dict[str, Any] = Field(..., description="Memory information")
    disk: Dict[str, Any] = Field(..., description="Disk information")
    network: Dict[str, Any] = Field(..., description="Network information")

class MemoryUsage(BaseModel):
    """Model for memory usage information"""
    total: int = Field(..., description="Total physical memory in bytes")
    available: int = Field(..., description="Available memory in bytes")
    used: int = Field(..., description="Used memory in bytes")
    percent: float = Field(..., description="Percentage of memory used")
    app_usage: Optional[Dict[str, Any]] = Field(None, description="Application memory usage")

class ProcessInfo(BaseModel):
    """Model for process information"""
    pid: int = Field(..., description="Process ID")
    name: str = Field(..., description="Process name")
    status: str = Field(..., description="Process status")
    memory_percent: float = Field(..., description="Percentage of memory used by the process")
    cpu_percent: float = Field(..., description="Percentage of CPU used by the process")
    create_time: float = Field(..., description="Process creation time (Unix timestamp)")
    threads: int = Field(..., description="Number of threads")

# --- Endpoints ---

@router.get("/system", response_model=SystemInfo)
async def get_system_info():
    """
    Get detailed information about the system
    """
    try:
        # OS Information
        os_info = {
            "name": platform.system(),
            "version": platform.version(),
            "platform": platform.platform(),
            "architecture": platform.architecture(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "hostname": platform.node(),
            "uptime": int(datetime.now().timestamp() - psutil.boot_time())
        }
        
        # Python Information
        python_info = {
            "version": sys.version,
            "implementation": platform.python_implementation(),
            "compiler": platform.python_compiler(),
            "build": platform.python_build(),
            "executable": sys.executable,
            "version_info": {
                "major": sys.version_info.major,
                "minor": sys.version_info.minor,
                "micro": sys.version_info.micro
            }
        }
        
        # CPU Information
        cpu_count_physical = psutil.cpu_count(logical=False)
        cpu_count_logical = psutil.cpu_count(logical=True)
        cpu_info = {
            "physical_cores": cpu_count_physical,
            "logical_cores": cpu_count_logical,
            "frequency": {
                "current": psutil.cpu_freq().current if psutil.cpu_freq() else None,
                "min": psutil.cpu_freq().min if psutil.cpu_freq() else None,
                "max": psutil.cpu_freq().max if psutil.cpu_freq() else None
            },
            "usage_percent": psutil.cpu_percent(interval=0.1, percpu=False),
            "per_cpu_percent": psutil.cpu_percent(interval=0.1, percpu=True)
        }
        
        # Memory Information
        memory = psutil.virtual_memory()
        memory_info = {
            "total": memory.total,
            "available": memory.available,
            "used": memory.used,
            "free": memory.free,
            "percent": memory.percent,
            "swap": {
                "total": psutil.swap_memory().total,
                "used": psutil.swap_memory().used,
                "free": psutil.swap_memory().free,
                "percent": psutil.swap_memory().percent
            }
        }
        
        # Disk Information
        disk_info = {
            "partitions": [],
            "io_counters": {
                "read_count": psutil.disk_io_counters().read_count if psutil.disk_io_counters() else None,
                "write_count": psutil.disk_io_counters().write_count if psutil.disk_io_counters() else None,
                "read_bytes": psutil.disk_io_counters().read_bytes if psutil.disk_io_counters() else None,
                "write_bytes": psutil.disk_io_counters().write_bytes if psutil.disk_io_counters() else None
            }
        }
        
        for partition in psutil.disk_partitions():
            usage = psutil.disk_usage(partition.mountpoint)
            disk_info["partitions"].append({
                "device": partition.device,
                "mountpoint": partition.mountpoint,
                "fstype": partition.fstype,
                "opts": partition.opts,
                "usage": {
                    "total": usage.total,
                    "used": usage.used,
                    "free": usage.free,
                    "percent": usage.percent
                }
            })
        
        # Network Information
        network_info = {
            "interfaces": [],
            "connections": len(psutil.net_connections())
        }
        
        for interface, addresses in psutil.net_if_addrs().items():
            net_interface = {
                "name": interface,
                "addresses": [],
                "stats": {}
            }
            
            for address in addresses:
                addr_info = {
                    "family": str(address.family),
                    "address": address.address,
                    "netmask": address.netmask,
                    "broadcast": address.broadcast
                }
                net_interface["addresses"].append(addr_info)
            
            if interface in psutil.net_if_stats():
                stats = psutil.net_if_stats()[interface]
                net_interface["stats"] = {
                    "isup": stats.isup,
                    "duplex": str(stats.duplex),
                    "speed": stats.speed,
                    "mtu": stats.mtu
                }
            
            network_info["interfaces"].append(net_interface)
        
        # IO Counters
        if psutil.net_io_counters(pernic=True):
            net_io = {
                "interfaces": {}
            }
            for interface, counters in psutil.net_io_counters(pernic=True).items():
                net_io["interfaces"][interface] = {
                    "bytes_sent": counters.bytes_sent,
                    "bytes_recv": counters.bytes_recv,
                    "packets_sent": counters.packets_sent,
                    "packets_recv": counters.packets_recv,
                    "errin": counters.errin,
                    "errout": counters.errout,
                    "dropin": counters.dropin,
                    "dropout": counters.dropout
                }
            network_info["io_counters"] = net_io
        
        diagnostics_logger.info("System diagnostics information retrieved")
        
        return SystemInfo(
            os=os_info,
            python=python_info,
            cpu=cpu_info,
            memory=memory_info,
            disk=disk_info,
            network=network_info
        )
        
    except Exception as e:
        diagnostics_logger.error(f"Error retrieving system information: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving system information: {str(e)}")

@router.get("/memory", response_model=MemoryUsage)
async def get_memory_diagnostics():
    """
    Get detailed memory usage diagnostics
    """
    try:
        # Get memory usage from the memory monitor
        memory_data = get_memory_usage()
        
        # Add application-specific memory info
        memory_data["app_usage"] = {
            "gc_stats": {
                "count": gc.get_count(),
                "threshold": gc.get_threshold(),
                "enabled": gc.isenabled()
            }
        }
        
        diagnostics_logger.info("Memory diagnostics retrieved")
        return memory_data
        
    except Exception as e:
        diagnostics_logger.error(f"Error retrieving memory diagnostics: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving memory diagnostics: {str(e)}")

@router.post("/gc")
async def trigger_garbage_collection():
    """
    Trigger garbage collection manually
    """
    try:
        # Perform GC
        collected = perform_gc_cleanup()
        
        diagnostics_logger.info(f"Manual garbage collection performed, collected {collected} objects")
        return {
            "status": "success",
            "collected_objects": collected,
            "current_memory": get_memory_usage()
        }
        
    except Exception as e:
        diagnostics_logger.error(f"Error during garbage collection: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error during garbage collection: {str(e)}")

@router.get("/processes", response_model=List[ProcessInfo])
async def get_process_info(
    top: Optional[int] = Query(10, description="Number of top processes to return by memory usage")
):
    """
    Get information about running processes
    """
    try:
        processes = []
        
        # Get all processes
        for proc in psutil.process_iter(['pid', 'name', 'status']):
            try:
                # Get process info
                proc_info = proc.as_dict(attrs=['pid', 'name', 'status'])
                
                # Get memory and CPU usage
                with proc.oneshot():
                    proc_info['memory_percent'] = proc.memory_percent()
                    proc_info['cpu_percent'] = proc.cpu_percent(interval=0.1)
                    proc_info['create_time'] = proc.create_time()
                    proc_info['threads'] = proc.num_threads()
                
                processes.append(ProcessInfo(**proc_info))
                
            except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                pass
        
        # Sort by memory usage and get top N
        processes.sort(key=lambda x: x.memory_percent, reverse=True)
        processes = processes[:top]
        
        diagnostics_logger.info(f"Retrieved information for {len(processes)} processes")
        return processes
        
    except Exception as e:
        diagnostics_logger.error(f"Error retrieving process information: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving process information: {str(e)}")

@router.get("/version")
async def get_app_version():
    """
    Get the application version and build information
    """
    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "python_version": platform.python_version(),
        "platform": platform.platform()
    }

@router.get("/status")
async def get_app_status():
    """
    Get the current application status
    """
    # Get current process
    process = psutil.Process()
    
    # Calculate uptime
    start_time = datetime.fromtimestamp(process.create_time())
    uptime = (datetime.now() - start_time).total_seconds()
    
    # Get process stats
    with process.oneshot():
        memory_percent = process.memory_percent()
        cpu_percent = process.cpu_percent(interval=0.1)
        num_threads = process.num_threads()
        io_counters = process.io_counters() if hasattr(process, 'io_counters') else None
    
    # Format IO counters if available
    io_stats = None
    if io_counters:
        io_stats = {
            "read_count": io_counters.read_count,
            "write_count": io_counters.write_count,
            "read_bytes": io_counters.read_bytes,
            "write_bytes": io_counters.write_bytes
        }
    
    return {
        "status": "running",
        "environment": settings.ENVIRONMENT,
        "uptime_seconds": uptime,
        "start_time": start_time.isoformat(),
        "current_time": datetime.now().isoformat(),
        "process": {
            "pid": process.pid,
            "memory_percent": memory_percent,
            "cpu_percent": cpu_percent,
            "threads": num_threads,
            "io": io_stats
        },
        "system": {
            "cpu_percent": psutil.cpu_percent(interval=0.1),
            "memory_percent": psutil.virtual_memory().percent
        }
    } 