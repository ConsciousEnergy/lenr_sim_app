"""
LENR_Sim_App FastAPI Backend
Main Application Entry Point
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

# Import routers
from app.api.routes.simulation import router as simulation_router
from app.api.routes.fitting import router as fitting_router

# Import logging
from app.utils.logging import setup_logger

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
    
    yield
    
    # Shutdown: cleanup operations
    app_logger.info("Application shutting down...")

# Initialize FastAPI app
app = FastAPI(
    title="LENR Simulation API",
    description="API for Low Energy Nuclear Reaction simulations",
    version="0.1.0",
    lifespan=lifespan
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
app.include_router(simulation_router, prefix="/simulate", tags=["Simulation"])
app.include_router(fitting_router, prefix="/fit", tags=["Fitting"])

@app.get("/")
async def root():
    """Root endpoint that returns API information"""
    return {
        "name": "LENR Simulation API",
        "version": "0.1.0",
        "endpoints": {
            "simulation": "/simulate",
            "fitting": "/fit",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"} 