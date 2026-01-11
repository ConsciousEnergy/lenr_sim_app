"""
Mock Simulation Router for Development and Testing
Provides simulation endpoints with mock data for frontend testing
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
from datetime import datetime
import random
import uuid
import asyncio
import math
from enum import Enum

# Create the router
router = APIRouter()

# Simulation states
class SimulationStatus(str, Enum):
    CREATED = "created"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

# Data models
class SimulationParameters(BaseModel):
    temperature: float = 300
    pressure: float = 1.0
    materialType: str = "palladium"
    loadingRatio: float = 0.8
    enhancementFactor: float = 1.0
    simulationDuration: float = 60.0
    timeStep: float = 0.1

class SimulationRequest(BaseModel):
    parameters: SimulationParameters

class LatticeData(BaseModel):
    type: str = "FCC"
    material: str = "palladium"
    temperature: float = 300
    loading_ratio: float = 0.6
    points: Optional[List[Dict[str, float]]] = None

class FusionEvent(BaseModel):
    position: Dict[str, float]
    energy: float
    time: float

class SimulationResults(BaseModel):
    latticeData: Optional[LatticeData] = None
    fusionData: Optional[Dict[str, Any]] = None
    enhancementData: Optional[Dict[str, Any]] = None
    energyData: Optional[List[float]] = None
    temperatureData: Optional[List[Dict[str, float]]] = None
    fluidDynamicsData: Optional[List[Dict[str, Any]]] = None
    metrics: Optional[Dict[str, float]] = None

class SimulationResponse(BaseModel):
    id: str
    status: SimulationStatus
    progress: float
    parameters: SimulationParameters
    results: Optional[SimulationResults] = None
    createdAt: datetime
    updatedAt: datetime

# In-memory storage for simulations
simulations_store: Dict[str, SimulationResponse] = {}

def generate_mock_lattice_points(size: int = 10) -> List[Dict[str, float]]:
    """Generate mock lattice points for visualization"""
    points = []
    for x in range(size):
        for y in range(size):
            for z in range(size):
                points.append({
                    "x": x * 3.89,  # Lattice constant for palladium
                    "y": y * 3.89,
                    "z": z * 3.89,
                    "type": "host"
                })
    return points

def generate_mock_fusion_events(count: int = 5) -> List[FusionEvent]:
    """Generate mock fusion events"""
    events = []
    for i in range(count):
        events.append(FusionEvent(
            position={
                "x": random.uniform(0, 30),
                "y": random.uniform(0, 30),
                "z": random.uniform(0, 30)
            },
            energy=random.uniform(1.0, 10.0),
            time=random.uniform(0, 60)
        ))
    return events

def generate_mock_results(params: SimulationParameters) -> SimulationResults:
    """Generate comprehensive mock results for visualization"""
    
    # Generate lattice data
    lattice_data = LatticeData(
        type="FCC",
        material=params.materialType,
        temperature=params.temperature,
        loading_ratio=params.loadingRatio,
        points=generate_mock_lattice_points(8)  # 8x8x8 lattice
    )
    
    # Generate fusion events
    fusion_events = generate_mock_fusion_events(
        count=int(params.enhancementFactor * 5)
    )
    
    # Generate energy data (time series)
    num_steps = int(params.simulationDuration / params.timeStep)
    energy_data = [
        10 + 5 * math.sin(i * 0.1) + random.uniform(-1, 1) 
        for i in range(min(num_steps, 100))
    ]
    
    # Generate temperature data (time series)
    temperature_data = [
        {
            "time": i * params.timeStep,
            "value": params.temperature + 20 * math.sin(i * 0.05) + random.uniform(-5, 5)
        }
        for i in range(min(num_steps, 100))
    ]
    
    # Generate enhancement regions
    enhancement_data = {
        "regions": [
            {
                "coordinates": {
                    "x": random.uniform(10, 20),
                    "y": random.uniform(10, 20),
                    "z": random.uniform(10, 20)
                },
                "radius": 3.0,
                "enhancement_factor": params.enhancementFactor * 1.5,
                "type": "phonon_coupling"
            }
            for _ in range(3)
        ]
    }
    
    # Generate fluid dynamics data (optional, for future use)
    fluid_dynamics_data = [
        {
            "position": {
                "x": random.uniform(0, 30),
                "y": random.uniform(0, 30),
                "z": random.uniform(0, 30)
            },
            "velocity": {
                "x": random.uniform(-0.1, 0.1),
                "y": random.uniform(-0.1, 0.1),
                "z": random.uniform(-0.05, 0.05)
            }
        }
        for _ in range(20)
    ]
    
    # Generate performance metrics
    metrics = {
        "calculationTime": random.uniform(0.5, 2.0),
        "energyOutput": sum(energy_data) / len(energy_data),
        "excessHeat": random.uniform(0.1, 2.0) * params.enhancementFactor,
        "convergenceRate": random.uniform(0.85, 0.99)
    }
    
    return SimulationResults(
        latticeData=lattice_data,
        fusionData={
            "events": [event.dict() for event in fusion_events],
            "total_events": len(fusion_events),
            "average_energy": sum(e.energy for e in fusion_events) / len(fusion_events) if fusion_events else 0
        },
        enhancementData=enhancement_data,
        energyData=energy_data,
        temperatureData=temperature_data,
        fluidDynamicsData=fluid_dynamics_data,
        metrics=metrics
    )

@router.post("/", response_model=Dict[str, str])
async def create_simulation(request: SimulationRequest):
    """Create a new simulation"""
    # Generate unique ID
    simulation_id = str(uuid.uuid4())[:8]
    
    # Create simulation object
    simulation = SimulationResponse(
        id=simulation_id,
        status=SimulationStatus.CREATED,
        progress=0.0,
        parameters=request.parameters,
        results=None,
        createdAt=datetime.now(),
        updatedAt=datetime.now()
    )
    
    # Store simulation
    simulations_store[simulation_id] = simulation
    
    # Start simulation processing in background
    asyncio.create_task(process_simulation(simulation_id))
    
    return {"id": simulation_id}

async def process_simulation(simulation_id: str):
    """Process simulation asynchronously"""
    if simulation_id not in simulations_store:
        return
    
    simulation = simulations_store[simulation_id]
    
    # Update status to running
    simulation.status = SimulationStatus.RUNNING
    simulation.updatedAt = datetime.now()
    
    # Simulate processing with progress updates
    for i in range(10):
        await asyncio.sleep(0.5)  # Simulate processing time
        simulation.progress = (i + 1) / 10
        simulation.updatedAt = datetime.now()
        
        # Random chance of failure for testing
        if random.random() < 0.05:  # 5% chance of failure
            simulation.status = SimulationStatus.FAILED
            simulation.updatedAt = datetime.now()
            return
    
    # Generate results
    simulation.results = generate_mock_results(simulation.parameters)
    simulation.status = SimulationStatus.COMPLETED
    simulation.progress = 1.0
    simulation.updatedAt = datetime.now()

@router.get("/{simulation_id}/status")
async def get_simulation_status(simulation_id: str):
    """Get the status of a simulation"""
    if simulation_id not in simulations_store:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    simulation = simulations_store[simulation_id]
    
    return {
        "id": simulation.id,
        "status": simulation.status,
        "progress": simulation.progress,
        "results": simulation.results.dict() if simulation.results else None
    }

@router.get("/{simulation_id}", response_model=SimulationResponse)
async def get_simulation(simulation_id: str):
    """Get full simulation details"""
    if simulation_id not in simulations_store:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    return simulations_store[simulation_id]

@router.get("/", response_model=List[SimulationResponse])
async def list_simulations(
    limit: int = Query(default=10, le=100),
    offset: int = Query(default=0, ge=0)
):
    """List all simulations"""
    simulations_list = list(simulations_store.values())
    # Sort by creation date (newest first)
    simulations_list.sort(key=lambda x: x.createdAt, reverse=True)
    
    # Apply pagination
    return simulations_list[offset:offset + limit]

@router.post("/{simulation_id}/stop")
async def stop_simulation(simulation_id: str):
    """Stop a running simulation"""
    if simulation_id not in simulations_store:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    simulation = simulations_store[simulation_id]
    
    if simulation.status != SimulationStatus.RUNNING:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot stop simulation with status {simulation.status}"
        )
    
    simulation.status = SimulationStatus.CANCELLED
    simulation.updatedAt = datetime.now()
    
    return {"message": "Simulation stopped", "status": simulation.status}

@router.delete("/{simulation_id}")
async def delete_simulation(simulation_id: str):
    """Delete a simulation"""
    if simulation_id not in simulations_store:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    del simulations_store[simulation_id]
    return {"message": "Simulation deleted"}

@router.post("/test-visualization-data")
async def get_test_visualization_data():
    """Get test data for visualization development"""
    params = SimulationParameters()
    results = generate_mock_results(params)
    
    # Format for direct visualization use
    return {
        "latticeData": results.latticeData.dict() if results.latticeData else {},
        "fusionEvents": results.fusionData.get("events", []) if results.fusionData else [],
        "enhancementData": results.enhancementData if results.enhancementData else {},
        "energyData": results.energyData,
        "temperatureData": results.temperatureData
    }

@router.delete("/clear-all")
async def clear_all_simulations():
    """Clear all simulations (for testing)"""
    count = len(simulations_store)
    simulations_store.clear()
    return {"message": f"Cleared {count} simulations"}

# Health check for this router
@router.get("/health")
async def simulation_health():
    """Check if simulation service is healthy"""
    return {
        "status": "healthy",
        "active_simulations": len(simulations_store),
        "running_simulations": sum(
            1 for s in simulations_store.values() 
            if s.status == SimulationStatus.RUNNING
        )
    }
