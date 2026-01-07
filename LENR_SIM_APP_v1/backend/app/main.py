"""
LENR_Sim_App FastAPI Backend
Main Application Entry Point
"""

import os
import gc
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from fastapi.responses import JSONResponse
from typing import Dict, Any
import logging
import logging.config
from datetime import datetime

# Import routers
from app.api.routes.simulation import router as simulation_router
from app.api.routes.fitting import router as fitting_router
from app.api.routes.logging import router as logging_router
from app.api.routes.diagnostics import router as diagnostics_router
from .routers import physics_v2_routes, migration_routes

# Import middleware
from app.api.middleware.timeout import TimeoutMiddleware

# Import logging
from app.utils.logging import setup_logger

# Import enhanced memory monitoring
from app.utils.memory_monitor import (
    start_memory_monitoring, 
    stop_memory_monitoring, 
    perform_gc_cleanup,
    get_memory_usage
)

# Import cache management
try:
    from app.utils.simulation_cache import (
        clear_cache,
        remove_expired_items,
        get_cache_stats
    )
    cache_available = True
except ImportError:
    cache_available = False

# Configure logging
logging.config.dictConfig({
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S"
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "default",
            "stream": "ext://sys.stdout"
        },
        "file": {
            "class": "logging.FileHandler",
            "formatter": "default",
            "filename": f"app_diagnostic_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
        }
    },
    "root": {
        "level": "INFO",
        "handlers": ["console", "file"]
    }
})

logger = logging.getLogger(__name__)

# Set up loggers
app_logger = setup_logger("app", "logs/app.log")
error_logger = setup_logger("error", "logs/errors.log", level="ERROR")
fitting_logger = setup_logger("fitting", "logs/fitting.log")

# Setup lifespan context
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI
    Manages startup and shutdown events
    """
    # Startup: create necessary directories
    app_logger.info("Application starting up...")
    static_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
    os.makedirs(os.path.join(static_path, "cluster_fields"), exist_ok=True)
    
    # Create logs directory if it doesn't exist
    logs_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")
    os.makedirs(logs_path, exist_ok=True)
    
    # Run garbage collection before starting to ensure a clean state
    gc.collect()
    app_logger.info("Initial garbage collection performed")
    
    # Start memory monitoring with improved settings
    start_memory_monitoring(
        warning_threshold=75.0,  # Warn at 75% memory usage
        critical_threshold=90.0,  # Critical at 90% memory usage
        check_interval=10.0,      # Check every 10 seconds
        enable_tracemalloc=False, # Disable tracemalloc in production for performance
        auto_gc_enabled=True      # Enable automatic garbage collection
    )
    app_logger.info("Memory monitoring started")
    
    yield
    
    # Shutdown: cleanup operations
    stop_memory_monitoring()
    app_logger.info("Memory monitoring stopped")
    
    # Clear all caches if cache management is available
    if cache_available:
        items_cleared = clear_cache()
        app_logger.info(f"Simulation cache cleared: {items_cleared} items removed")
    
    # Final garbage collection to clean up resources
    collected = gc.collect()
    app_logger.info(f"Final garbage collection performed: {collected} objects collected")
    
    app_logger.info("Application shutting down...")

# Initialize FastAPI app
app = FastAPI(
    title="LENR Simulation API",
    description="API for Low Energy Nuclear Reaction simulations",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# Configure timeout middleware
# Define paths with custom timeouts or excluded from timeout
timeout_config = {
    "/static": None,  # Exclude static files from timeout
    "/docs": None,    # Exclude docs from timeout
    "/openapi.json": None,  # Exclude OpenAPI schema from timeout
    "/simulate": 60.0,  # Higher timeout for simulation endpoints (60s)
    "/fit": 120.0,     # Higher timeout for fitting endpoints (120s)
    "/diagnostics": 90.0, # Higher timeout for diagnostics endpoints (90s)
    "/diagnostics/logs": 45.0, # Specific timeout for log viewing
    "/diagnostics/memory": 30.0, # Specific timeout for memory checks
}

app.add_middleware(
    TimeoutMiddleware, 
    timeout=30.0,  # Default timeout of 30 seconds
    exclude_paths=timeout_config
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files with absolute path
static_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
app.mount("/static", StaticFiles(directory=static_path), name="static")

# Include routers
app.include_router(simulation_router, prefix="/api/simulate", tags=["Simulation"])
app.include_router(fitting_router, prefix="/api/fit", tags=["Fitting"])
app.include_router(logging_router, prefix="/api/logs", tags=["Logging"])
app.include_router(diagnostics_router, prefix="/api/diagnostics", tags=["Diagnostics"])
app.include_router(physics_v2_routes.router, prefix="/api")
app.include_router(migration_routes.router, prefix="/api")

@app.get("/")
async def root():
    """Root endpoint that returns API information"""
    return {
        "name": "LENR Simulation API",
        "version": "2.0.0",
        "endpoints": {
            "simulation": "/api/simulate",
            "fitting": "/api/fit",
            "logs": "/api/logs",
            "diagnostics": "/api/diagnostics",
            "docs": "/api/docs"
        }
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "version": "2.0.0", "timestamp": datetime.now().isoformat()}

@app.get("/api/memory")
async def memory_status():
    """Get memory usage status"""
    return get_memory_usage()

@app.post("/api/memory/cleanup")
async def cleanup_memory():
    """Force memory cleanup operations"""
    gc_collected = perform_gc_cleanup()
    cache_items = 0
    expired_items = 0
    
    if cache_available:
        cache_items = clear_cache()
        expired_items = remove_expired_items()
    
    return {
        "gc_collected": gc_collected,
        "cache_items_cleared": cache_items,
        "expired_items_removed": expired_items,
        "status": "completed"
    }

@app.get("/api/cache/stats")
async def cache_statistics():
    """Get statistics about the cache"""
    if not cache_available:
        return {"status": "cache_not_available"}
    return get_cache_stats()

@app.post("/api/cache/clear")
async def clear_all_caches():
    """Clear all simulation caches"""
    if not cache_available:
        return {"status": "cache_not_available"}
    
    items_cleared = clear_cache()
    return {
        "items_cleared": items_cleared,
        "status": "completed"
    }

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions."""
    logger.error(f"HTTP error: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle general exceptions."""
    logger.error(f"Unexpected error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "status_code": 500
        }
    )

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize application on startup."""
    logger.info("Starting LENR Simulation API v2.0.0")
    # Initialize any required resources here

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Clean up resources on shutdown."""
    logger.info("Shutting down LENR Simulation API")
    # Clean up any resources here 