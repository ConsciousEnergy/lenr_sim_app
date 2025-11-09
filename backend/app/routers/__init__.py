"""
Router exports for app.routers package
"""

from fastapi import APIRouter

# Create router instances (these will be imported in main.py)
physics_router = APIRouter()
fitting_router = APIRouter()
logging_router = APIRouter()
diagnostics_router = APIRouter()

# Import route modules to populate the routers using relative imports
from .physics_routes import router as physics_routes
from .fitting_routes import router as fitting_routes
from .logging_routes import router as logging_routes
from .diagnostics_routes import router as diagnostics_routes

# Include routes in the router instances
physics_router.include_router(physics_routes)
fitting_router.include_router(fitting_routes)
logging_router.include_router(logging_routes)
diagnostics_router.include_router(diagnostics_routes)

# Note: Other routers are imported directly in main.py 