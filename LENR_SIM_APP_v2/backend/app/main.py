"""
LENR_Sim_App FastAPI Backend
Main Application Entry Point
"""

import os
import gc
import psutil
import time
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

# Import routers - using relative imports
from .routers import physics_router, fitting_router, logging_router, diagnostics_router
from .routers.multi_physics_routes import router as multi_physics_router
from .routers.visualization_routes import router as visualization_router
from .routers import result_visualization_routes  # Add this import
from .routers.mock_simulation_router import router as mock_simulation_router  # Mock simulation router
from .routers.physics_simulation_router import router as physics_simulation_router  # Real physics calculations
from .routers.websocket_router import router as websocket_router  # WebSocket for real-time updates
# Import unified simulation router
# #region agent log
try:
    from .api.routes.unified_simulation import router as unified_simulation_router
    import json
    with open('c:\\Users\\brand\\LENR_SIM_APP\\.cursor\\debug.log', 'a') as f:
        f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"main.py:24","message":"Unified simulation router imported","data":{"router_exists":True,"router_prefix":getattr(unified_simulation_router,'prefix','unknown'),"routes_count":len(unified_simulation_router.routes)},"timestamp":int(time.time()*1000)})+"\n")
except ImportError as e:
    import json
    with open('c:\\Users\\brand\\LENR_SIM_APP\\.cursor\\debug.log', 'a') as f:
        f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"main.py:24","message":"Unified simulation router import failed","data":{"error":str(e)},"timestamp":int(time.time()*1000)})+"\n")
    unified_simulation_router = None
# #endregion

# Import middleware - using relative imports
from .api.middleware.timeout import TimeoutMiddleware
from .core.middleware import setup_middlewares

# Import configuration - using relative imports
from .core.config import settings

# Import logging - using relative imports
from .utils.logging import setup_logger

# Import enhanced memory monitoring - using relative imports
from .utils.memory_monitor import (
    start_memory_monitoring, 
    stop_memory_monitoring, 
    perform_gc_cleanup,
    get_memory_usage
)

# Import cache management - using relative imports
try:
    from .utils.simulation_cache import (
        clear_cache,
        remove_expired_items,
        get_cache_stats
    )
    cache_available = True
except ImportError:
    cache_available = False

# Import custom OpenAPI configuration - using relative imports
from .api.openapi import custom_openapi

# Set up loggers
app_logger = setup_logger("app", "logs/app.log")
error_logger = setup_logger("error", "logs/errors.log", level="ERROR")
fitting_logger = setup_logger("fitting", "logs/fitting.log")
performance_logger = setup_logger("performance", "logs/performance.log")

# Performance monitoring middleware
class PerformanceMiddleware(BaseHTTPMiddleware):
    """Middleware to monitor API performance"""
    
    def __init__(self, app, minimum_time=1.0):
        super().__init__(app)
        self.minimum_time = minimum_time
        self.slow_routes = {}
    
    async def dispatch(self, request, call_next):
        # Record start time and memory
        start_time = time.time()
        start_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024
        
        # Process request
        response = await call_next(request)
        
        # Calculate metrics
        process_time = time.time() - start_time
        end_memory = psutil.Process(os.getpid()).memory_info().rss / 1024 / 1024
        memory_diff = end_memory - start_memory
        
        # Add performance headers
        response.headers["X-Process-Time"] = str(process_time)
        
        # Log slow requests
        if process_time > self.minimum_time:
            path = request.url.path
            method = request.method
            route_key = f"{method}:{path}"
            
            # Update statistics for this route
            if route_key not in self.slow_routes:
                self.slow_routes[route_key] = {
                    "count": 0,
                    "total_time": 0,
                    "max_time": 0
                }
            
            self.slow_routes[route_key]["count"] += 1
            self.slow_routes[route_key]["total_time"] += process_time
            self.slow_routes[route_key]["max_time"] = max(
                self.slow_routes[route_key]["max_time"], process_time
            )
            
            # Log details
            performance_logger.warning(
                f"Slow request: {method} {path} took {process_time:.2f}s with memory change: {memory_diff:.2f}MB"
            )
        
        return response

# Setup lifespan context
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI
    Manages startup and shutdown events
    """
    # Startup: create necessary directories
    app_logger.info(f"Application starting up in {settings.ENVIRONMENT} mode...")
    static_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
    os.makedirs(os.path.join(static_path, "cluster_fields"), exist_ok=True)
    
    # Create logs directory if it doesn't exist
    logs_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "logs")
    os.makedirs(logs_path, exist_ok=True)
    
    # Run garbage collection before starting to ensure a clean state
    gc.collect()
    app_logger.info("Initial garbage collection performed")
    
    # Log memory stats on startup
    memory_info = psutil.virtual_memory()
    app_logger.info(f"System memory: {memory_info.total / (1024**3):.1f}GB total, {memory_info.available / (1024**3):.1f}GB available")
    
    # Start memory monitoring with settings from config
    start_memory_monitoring(
        warning_threshold=settings.MEMORY_WARNING_THRESHOLD,
        critical_threshold=settings.MEMORY_CRITICAL_THRESHOLD,
        check_interval=settings.MEMORY_CHECK_INTERVAL,
        enable_tracemalloc=settings.ENABLE_TRACEMALLOC,
        auto_gc_enabled=settings.ENABLE_AUTO_GC
    )
    app_logger.info("Memory monitoring started")

    # Setup periodic cache cleanup 
    if cache_available:
        # Initial cleanup
        expired = remove_expired_items()
        app_logger.info(f"Initial cache cleanup: {expired} expired items removed")
    
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
    title=settings.APP_NAME,
    description="API for Low Energy Nuclear Reaction simulations",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Set custom OpenAPI schema generator
app.openapi = lambda: custom_openapi(app)

# Add performance monitoring
app.add_middleware(PerformanceMiddleware, minimum_time=1.0)

# Configure timeout middleware with improved path-specific timeouts
# Define paths with custom timeouts or excluded from timeout
timeout_config = {
    # Static and documentation - no timeout
    "/static": None,  # Exclude static files from timeout
    "/docs": None,    # Exclude docs from timeout
    "/api/docs": None,  # Exclude docs from timeout
    "/api/redoc": None,  # Exclude redoc from timeout
    "/openapi.json": None,  # Exclude OpenAPI schema from timeout
    "/api/openapi.json": None,  # Exclude OpenAPI schema from timeout
    
    # Physics endpoints with increased timeouts
    "/api/physics": 180.0,  # Default physics endpoints (180s, increased from 120s)
    "/api/physics/calculate-enhancement": 360.0,  # Enhancement calculations (360s, increased from 300s)
    "/api/physics/material-enhancement": 300.0,  # Material enhancement (300s, increased from 240s)
    "/api/physics/analyze-parameter-sensitivity": 300.0,  # Parameter sensitivity analysis (300s, increased from 240s)
    "/api/physics/tunneling-temperature-pressure": 240.0,  # Tunneling calculations (240s, increased from 180s)
    "/api/physics/quantum-tunneling": 240.0,  # Quantum tunneling (240s, increased from 180s)
    "/api/physics/phonon-nuclear-coupling": 180.0,  # Phonon calculations (180s, increased from 150s)
    
    # Multi-physics with increased timeout
    "/api/multi-physics": 300.0,  # Higher timeout for multi-physics coupling (300s, increased from 180s)
    "/api/multi-physics/simulations": 300.0,  # Higher timeout for simulation creation (300s)
    
    # Other heavy computational endpoints
    "/api/fitting": 300.0,  # Higher timeout for fitting endpoints (300s, increased from 240s)
    
    # Diagnostics endpoints
    "/api/diagnostics": 120.0, # Higher timeout for diagnostics endpoints (120s, increased from 90s)
    "/api/diagnostics/logs": 60.0, # Specific timeout for log viewing (60s, increased from 45s)
    "/api/diagnostics/memory": 60.0, # Specific timeout for memory checks (60s, increased from 30s)
    
    # WebSocket connections
    "/api/visualization/ws": None, # Exclude WebSocket connections from timeout
}

# Add timeout middleware
app.add_middleware(
    TimeoutMiddleware, 
    timeout=settings.DEFAULT_TIMEOUT,  # Default timeout from settings
    exclude_paths=timeout_config
)

# #region agent log - Add request logging middleware to track ALL requests (FIRST middleware)
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Log ALL incoming requests - this should catch everything
        import json
        import time
        import traceback
        try:
            path = request.url.path
            method = request.method
            origin = request.headers.get('origin', 'no-origin')
            # Log immediately when request arrives
            log_entry = json.dumps({
                "sessionId":"debug-session",
                "runId":"run1",
                "hypothesisId":"D",
                "location":"main.py:248",
                "message":"Incoming request",
                "data":{
                    "path":path,
                    "method":method,
                    "origin":origin,
                    "host":request.headers.get('host', 'no-host')
                },
                "timestamp":int(time.time()*1000)
            })
            with open('c:\\Users\\brand\\LENR_SIM_APP\\.cursor\\debug.log', 'a', encoding='utf-8') as f:
                f.write(log_entry + "\n")
                f.flush()  # Force write immediately
            
            response = await call_next(request)
            
            # Log response status
            log_entry = json.dumps({
                "sessionId":"debug-session",
                "runId":"run1",
                "hypothesisId":"D",
                "location":"main.py:256",
                "message":"Response sent",
                "data":{
                    "path":path,
                    "method":method,
                    "status":response.status_code,
                    "headers":dict(response.headers) if hasattr(response, 'headers') else {}
                },
                "timestamp":int(time.time()*1000)
            })
            with open('c:\\Users\\brand\\LENR_SIM_APP\\.cursor\\debug.log', 'a', encoding='utf-8') as f:
                f.write(log_entry + "\n")
                f.flush()
            
            return response
        except Exception as e:
            error_trace = traceback.format_exc()
            log_entry = json.dumps({
                "sessionId":"debug-session",
                "runId":"run1",
                "hypothesisId":"D",
                "location":"main.py:262",
                "message":"Middleware error",
                "data":{
                    "error":str(e),
                    "traceback":error_trace
                },
                "timestamp":int(time.time()*1000)
            })
            with open('c:\\Users\\brand\\LENR_SIM_APP\\.cursor\\debug.log', 'a', encoding='utf-8') as f:
                f.write(log_entry + "\n")
                f.flush()
            raise

# Add this middleware FIRST (before all others) to catch all requests
app.add_middleware(RequestLoggingMiddleware)
# #endregion

# Set up all middleware including CORS, request ID, logging, and performance tracking
setup_middlewares(app)

# Mount static files with absolute path
static_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
app.mount("/static", StaticFiles(directory=static_path), name="static")

# Include routers
app.include_router(physics_router, prefix="/api/physics", tags=["Physics"])
app.include_router(fitting_router, prefix="/api/fitting", tags=["Fitting"])
app.include_router(logging_router, prefix="/api/logs", tags=["Logging"])
app.include_router(diagnostics_router, prefix="/api/diagnostics", tags=["Diagnostics"])
app.include_router(multi_physics_router, prefix="/api/multi-physics", tags=["Multi-Physics Coupling"])
app.include_router(visualization_router, prefix="/api/visualization", tags=["Visualization"])
app.include_router(result_visualization_routes.router, prefix="/api/results", tags=["results"])  # Add this line
app.include_router(mock_simulation_router, prefix="/api/simulations", tags=["Mock Simulations"])  # Mock simulations for testing
app.include_router(physics_simulation_router)  # Real physics calculation endpoints
app.include_router(websocket_router, prefix="/api", tags=["WebSocket"])  # Real-time simulation updates

# Include unified simulation router - FIXED: Always include if imported
# #region agent log
import json
try:
    router_check = unified_simulation_router is not None
    router_type = str(type(unified_simulation_router)) if unified_simulation_router else "None"
    with open('c:\\Users\\brand\\LENR_SIM_APP\\.cursor\\debug.log', 'a', encoding='utf-8') as f:
        f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"main.py:297","message":"Before router inclusion","data":{"router_exists":router_check,"type":router_type},"timestamp":int(time.time()*1000)})+"\n")
        f.flush()
except Exception as e:
    with open('c:\\Users\\brand\\LENR_SIM_APP\\.cursor\\debug.log', 'a', encoding='utf-8') as f:
        f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"main.py:297","message":"Error checking router","data":{"error":str(e)},"timestamp":int(time.time()*1000)})+"\n")
        f.flush()

# Always include the router - it was imported successfully
if unified_simulation_router:
    try:
        app.include_router(unified_simulation_router, prefix="/api", tags=["Unified Simulation"])
        # Log registered routes
        registered_routes = []
        for route in app.routes:
            if hasattr(route, 'path'):
                route_path = str(route.path)
                if '/unified' in route_path:
                    methods = getattr(route, 'methods', set())
                    registered_routes.append(f"{methods} {route_path}")
        
        with open('c:\\Users\\brand\\LENR_SIM_APP\\.cursor\\debug.log', 'a', encoding='utf-8') as f:
            f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"main.py:310","message":"Router included successfully","data":{"included":True,"registered_routes":registered_routes,"total_routes":len(app.routes)},"timestamp":int(time.time()*1000)})+"\n")
            f.flush()
        app_logger.info(f"Unified simulation router included with {len(registered_routes)} routes")
    except Exception as e:
        with open('c:\\Users\\brand\\LENR_SIM_APP\\.cursor\\debug.log', 'a', encoding='utf-8') as f:
            f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"main.py:315","message":"Error including router","data":{"error":str(e)},"timestamp":int(time.time()*1000)})+"\n")
            f.flush()
        app_logger.error(f"Failed to include unified simulation router: {e}")
else:
    with open('c:\\Users\\brand\\LENR_SIM_APP\\.cursor\\debug.log', 'a', encoding='utf-8') as f:
        f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"main.py:318","message":"Router not included - router is None","data":{"included":False},"timestamp":int(time.time()*1000)})+"\n")
        f.flush()
    app_logger.warning("Unified simulation router not available - router import failed")
# #endregion

@app.get("/")
async def root():
    """Root endpoint that returns API information"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "endpoints": {
            "physics": "/api/physics",
            "fitting": "/api/fitting",
            "logs": "/api/logs",
            "diagnostics": "/api/diagnostics",
            "visualization": "/api/visualization",
            "multi-physics": "/api/multi-physics",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    # #region agent log
    import json
    import time
    try:
        with open('c:\\Users\\brand\\LENR_SIM_APP\\.cursor\\debug.log', 'a', encoding='utf-8') as f:
            f.write(json.dumps({"sessionId":"debug-session","runId":"run1","hypothesisId":"E","location":"main.py:340","message":"Health check called","data":{"endpoint":"/health"},"timestamp":int(time.time()*1000)})+"\n")
            f.flush()
    except:
        pass
    # #endregion
    # Include memory information in health check
    memory_info = psutil.virtual_memory()
    process = psutil.Process(os.getpid())
    process_memory = process.memory_info().rss / (1024 * 1024)  # MB
    
    return {
        "status": "healthy", 
        "environment": settings.ENVIRONMENT,
        "system_memory": {
            "total_gb": round(memory_info.total / (1024**3), 2),
            "available_gb": round(memory_info.available / (1024**3), 2),
            "percent_used": memory_info.percent
        },
        "process_memory_mb": round(process_memory, 2)
    }

@app.get("/memory")
async def memory_status():
    """Get memory usage status"""
    return get_memory_usage()

@app.post("/memory/cleanup")
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

@app.get("/cache/stats")
async def cache_statistics():
    """Get statistics about the cache"""
    if not cache_available:
        return {"status": "cache_not_available"}
    return get_cache_stats()

@app.post("/cache/clear")
async def clear_all_caches():
    """Clear all simulation caches"""
    if not cache_available:
        return {"status": "cache_not_available"}
    
    items_cleared = clear_cache()
    return {
        "items_cleared": items_cleared,
        "status": "completed"
    } 