"""
OpenAPI/Swagger Configuration Module

This module provides enhanced OpenAPI configuration for the LENR Simulation API,
including detailed documentation for all endpoints, models, and parameters.
"""

from fastapi.openapi.utils import get_openapi
from fastapi import FastAPI

def custom_openapi(app: FastAPI):
    """
    Generate a custom OpenAPI schema with enhanced documentation.
    
    Args:
        app: FastAPI application instance
        
    Returns:
        OpenAPI schema dictionary
    """
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description="""
        # LENR Simulation API Documentation
        
        This API provides access to advanced Low Energy Nuclear Reaction (LENR) simulation capabilities,
        including multi-physics coupling between thermal and nuclear domains.
        
        ## Key Features
        
        - **Multi-Physics Coupling**: Model complex interactions between nuclear reactions and thermal effects
        - **Domain Management**: Create and manage different physics domains with proper interfaces
        - **Simulation Control**: Run, monitor, and analyze complex simulations
        - **Visualization**: Generate visualizations of simulation results
        
        ## Authorization
        
        Some endpoints require authentication. Use the Authorize button above to configure your API key.
        """,
        routes=app.routes,
    )
    
    # Enhanced info with contact and license details
    openapi_schema["info"]["contact"] = {
        "name": "LENR Simulation Team",
        "url": "https://github.com/ConsciousEnergy/lenr_sim_app",
        "email": "info@conscious.energy"
    }
    
    openapi_schema["info"]["license"] = {
        "name": "GNU GPL-3.0",
        "url": "https://www.gnu.org/licenses/gpl-3.0.html"
    }
    
    # Define tags with descriptions
    openapi_schema["tags"] = [
        {
            "name": "Multi-Physics Coupling",
            "description": "Endpoints for running coupled multi-physics simulations",
            "externalDocs": {
                "description": "Multi-Physics Simulation Guide",
                "url": "/docs/multi-physics-guide.html"
            }
        },
        {
            "name": "Physics",
            "description": "Core physics calculation endpoints",
        },
        {
            "name": "Visualization",
            "description": "Endpoints for visualizing simulation results",
        }
    ]
    
    # Add examples for the multi-physics simulation endpoint
    if "components" not in openapi_schema:
        openapi_schema["components"] = {}
        
    if "examples" not in openapi_schema["components"]:
        openapi_schema["components"]["examples"] = {}
    
    # Add simulation request example
    openapi_schema["components"]["examples"]["SimulationRequestExample"] = {
        "summary": "Standard D-D reaction simulation",
        "value": {
            "domain_size": [0.01, 0.01, 0.01],
            "resolution": [20, 20, 20],
            "simulation_time": 0.01,
            "time_step": 1e-6,
            "reactions": ["d-d"],
            "mechanisms": ["electron_screening", "coherent_tunneling"],
            "initial_temperature": 300.0,
            "species_densities": {"d": 1.0e28},
            "thermal_conductivity": 10.0,
            "heat_capacity": 500.0,
            "material_density": 1000.0
        }
    }
    
    # Enhance descriptions for specific endpoints
    for path, path_item in openapi_schema["paths"].items():
        # Enhance the simulations POST endpoint
        if path == "/api/multi-physics/simulations" and "post" in path_item:
            operation = path_item["post"]
            operation["summary"] = "Start a new multi-physics coupled simulation"
            operation["description"] = """
            Starts a new simulation coupling nuclear and thermal physics domains.
            
            The simulation runs asynchronously in the background, and results can be retrieved
            once the simulation is complete. The simulation ID is returned immediately and 
            can be used to check the status and retrieve results.
            
            ## Physics Models
            
            - **Nuclear Domain**: Simulates fusion reactions with various enhancement mechanisms
            - **Thermal Domain**: Models heat transfer via conduction, including temperature-dependent properties
            - **Domain Coupling**: Bidirectional coupling of nuclear reactions and thermal effects
            
            ## Performance Notes
            
            Simulations with higher resolution or longer simulation times will take more time to complete.
            For large simulations, it's recommended to poll the status endpoint periodically.
            """
            
            # Add example
            if "requestBody" in operation and "content" in operation["requestBody"]:
                for content_type in operation["requestBody"]["content"]:
                    operation["requestBody"]["content"][content_type]["examples"] = {
                        "standard": {
                            "$ref": "#/components/examples/SimulationRequestExample"
                        }
                    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema 