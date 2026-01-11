"""
Simplified FastAPI app for testing
"""

from fastapi import FastAPI
import logging

# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create app
app = FastAPI(
    title="LENR Sim Simplified API",
    description="Basic API for testing FastAPI functionality",
    version="0.1.0"
)

@app.get("/")
async def root():
    """Basic root endpoint"""
    logger.info("Root endpoint called")
    return {
        "message": "LENR Simulation API is responding",
        "status": "ok",
        "version": "0.1.0"
    }

@app.get("/health")
async def health_check():
    """Basic health check endpoint"""
    logger.info("Health check endpoint called")
    return {
        "status": "healthy",
        "services": {
            "api": "up",
            "database": "not_implemented"
        }
    }

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting simplified FastAPI application")
    uvicorn.run(app, host="127.0.0.1", port=8000) 