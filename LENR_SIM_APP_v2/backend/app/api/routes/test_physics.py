"""
Test script for physics API routes
"""

import httpx
import logging
import asyncio
import json
from pprint import pprint

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# API URL
API_URL = "http://localhost:8000/api"

async def test_health_endpoint():
    """Test the health endpoint"""
    async with httpx.AsyncClient() as client:
        try:
            logger.info("Testing health endpoint...")
            response = await client.get(f"{API_URL}/health")
            
            if response.status_code == 200:
                logger.info(f"✓ Health endpoint returned 200 OK: {response.json()}")
                return True
            else:
                logger.error(f"✗ Health endpoint returned {response.status_code}: {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error testing health endpoint: {str(e)}")
            return False

async def test_physics_status():
    """Test the physics status endpoint"""
    async with httpx.AsyncClient() as client:
        try:
            logger.info("Testing physics status endpoint...")
            response = await client.get(f"{API_URL}/physics/status")
            
            if response.status_code == 200:
                logger.info(f"✓ Physics status endpoint returned 200 OK")
                pprint(response.json())
                return True
            else:
                logger.error(f"✗ Physics status endpoint returned {response.status_code}: {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error testing physics status endpoint: {str(e)}")
            return False

async def test_physics_initialize():
    """Test the physics initialize endpoint"""
    async with httpx.AsyncClient() as client:
        try:
            logger.info("Testing physics initialize endpoint...")
            
            # Prepare request data
            data = {
                "temperature": 300.0,
                "pressure": 101325.0,
                "electron_density": 1e28,
                "lattice_constant": 3.89e-10,
                "dimensions": [10, 10, 10],
                "enhancement_factor": 1.0,
                "time_step": 1e-15,
                "max_steps": 100
            }
            
            response = await client.post(f"{API_URL}/physics/initialize", json=data)
            
            if response.status_code == 200:
                logger.info(f"✓ Physics initialize endpoint returned 200 OK")
                pprint(response.json())
                return True
            else:
                logger.error(f"✗ Physics initialize endpoint returned {response.status_code}: {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error testing physics initialize endpoint: {str(e)}")
            return False

async def test_enhancement_calculation():
    """Test the enhancement calculation endpoint"""
    async with httpx.AsyncClient() as client:
        try:
            logger.info("Testing enhancement calculation endpoint...")
            
            # Prepare request data
            data = {
                "temperature": 300.0,
                "electron_density": 1e28,
                "electric_field": 1e5,
                "lattice_constant": 3.89e-10
            }
            
            response = await client.post(f"{API_URL}/physics/enhancement", json=data)
            
            if response.status_code == 200:
                logger.info(f"✓ Enhancement calculation endpoint returned 200 OK")
                pprint(response.json())
                return True
            else:
                logger.error(f"✗ Enhancement calculation endpoint returned {response.status_code}: {response.text}")
                return False
        except Exception as e:
            logger.error(f"Error testing enhancement calculation endpoint: {str(e)}")
            return False

async def run_all_tests():
    """Run all API tests and report results"""
    logger.info("Starting API tests...")
    
    results = {
        "health_endpoint": await test_health_endpoint(),
        "physics_status": await test_physics_status(),
        "physics_initialize": await test_physics_initialize(),
        "enhancement_calculation": await test_enhancement_calculation()
    }
    
    logger.info("Test results:")
    for test_name, passed in results.items():
        status = "PASSED" if passed else "FAILED"
        logger.info(f"  {test_name}: {status}")
    
    all_passed = all(results.values())
    logger.info(f"Overall result: {'PASSED' if all_passed else 'FAILED'}")
    
    return all_passed

if __name__ == "__main__":
    # Run the tests
    asyncio.run(run_all_tests()) 