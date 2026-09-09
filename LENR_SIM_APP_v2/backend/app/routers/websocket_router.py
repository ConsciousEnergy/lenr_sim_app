"""
WebSocket Router for Real-Time Simulation Updates
==================================================

This module provides WebSocket endpoints for streaming simulation
data in real-time to connected clients.
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Set, Any
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
import numpy as np

from app.core.config import settings


def _coerce_duration_steps(raw: Any) -> Optional[int]:
    """Validate a client-supplied step count; None means reject.

    Unauthenticated clients drive these demo streams, so the step count is
    capped at ``LENR_MAX_WS_DURATION_STEPS`` to bound CPU per connection.
    """
    if isinstance(raw, bool) or not isinstance(raw, (int, float)):
        return None
    steps = int(raw)
    if steps < 1 or steps > settings.MAX_WS_DURATION_STEPS:
        return None
    return steps

logger = logging.getLogger(__name__)

router = APIRouter()


class ConnectionManager:
    """Manages WebSocket connections for real-time updates."""
    
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.simulation_tasks: Dict[str, asyncio.Task] = {}
    
    async def connect(self, websocket: WebSocket, simulation_id: str):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        if simulation_id not in self.active_connections:
            self.active_connections[simulation_id] = set()
        self.active_connections[simulation_id].add(websocket)
        logger.info(f"Client connected to simulation {simulation_id}")
    
    def disconnect(self, websocket: WebSocket, simulation_id: str):
        """Remove a WebSocket connection."""
        if simulation_id in self.active_connections:
            self.active_connections[simulation_id].discard(websocket)
            if not self.active_connections[simulation_id]:
                del self.active_connections[simulation_id]
                # Cancel running simulation if no clients
                if simulation_id in self.simulation_tasks:
                    self.simulation_tasks[simulation_id].cancel()
                    del self.simulation_tasks[simulation_id]
        logger.info(f"Client disconnected from simulation {simulation_id}")
    
    async def broadcast(self, simulation_id: str, message: dict):
        """Send message to all clients connected to a simulation."""
        if simulation_id in self.active_connections:
            dead_connections = set()
            # Iterate over a copy to avoid race condition during iteration
            connections_copy = self.active_connections[simulation_id].copy()
            for connection in connections_copy:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.warning(f"Failed to send to client: {e}")
                    dead_connections.add(connection)
            
            # Clean up dead connections (check if set still exists)
            if simulation_id in self.active_connections:
                for conn in dead_connections:
                    self.active_connections[simulation_id].discard(conn)
    
    def get_connection_count(self, simulation_id: str) -> int:
        """Get number of connected clients for a simulation."""
        return len(self.active_connections.get(simulation_id, set()))


manager = ConnectionManager()


# Response models for API documentation
class ConnectionCountResponse(BaseModel):
    """Response model for connection count endpoint."""
    simulation_id: str
    connection_count: int

class ActiveSimulationsResponse(BaseModel):
    """Response model for active simulations endpoint."""
    active_simulations: List[str]
    running_tasks: List[str]


async def run_quantum_tunneling_simulation(
    simulation_id: str,
    params: dict,
    duration_steps: int = 100
):
    """
    Run a quantum tunneling simulation with real-time updates.
    
    This generates time-evolving tunneling probability data.
    """
    from ..physics.wkb_tunneling import WKBTunnelingCalculator
    
    z1 = params.get('z1', 1)
    z2 = params.get('z2', 1)
    a1 = params.get('a1', 2.0)
    a2 = params.get('a2', 2.0)
    base_energy = params.get('energy_kev', 0.1)
    base_temp = params.get('temperature_k', 300.0)
    material = params.get('material', 'palladium')
    
    calc = WKBTunnelingCalculator()
    
    try:
        for step in range(duration_steps):
            # Vary energy slightly to simulate thermal fluctuations
            energy_variation = 1.0 + 0.1 * np.sin(step * 0.1)
            current_energy = base_energy * energy_variation
            
            # Vary temperature slightly
            temp_variation = 1.0 + 0.05 * np.cos(step * 0.05)
            current_temp = base_temp * temp_variation
            
            # Calculate tunneling
            result = calc.calculate_tunneling_probability(
                z1=z1,
                z2=z2,
                a1=a1,
                a2=a2,
                energy_kev=current_energy,
                potential_type='screened',
                screening_energy_ev=800 if material == 'palladium' else 500,
                temperature_k=current_temp,
                material=material,
            )
            
            # Send update
            await manager.broadcast(simulation_id, {
                'type': 'simulation_update',
                'simulation_id': simulation_id,
                'step': step,
                'total_steps': duration_steps,
                'progress': (step + 1) / duration_steps,
                'timestamp': datetime.utcnow().isoformat(),
                'data': {
                    'energy_kev': float(current_energy),
                    'temperature_k': float(current_temp),
                    'tunneling_probability': float(result.probability),
                    'gamow_factor': float(result.gamow_factor),
                    'barrier_height_kev': float(result.barrier_height),
                }
            })
            
            await asyncio.sleep(0.1)  # 100ms between updates
        
        # Send completion message
        await manager.broadcast(simulation_id, {
            'type': 'simulation_complete',
            'simulation_id': simulation_id,
            'message': 'Simulation completed successfully'
        })
        
    except asyncio.CancelledError:
        await manager.broadcast(simulation_id, {
            'type': 'simulation_cancelled',
            'simulation_id': simulation_id
        })
    except Exception as e:
        await manager.broadcast(simulation_id, {
            'type': 'simulation_error',
            'simulation_id': simulation_id,
            'error': str(e)
        })


async def run_lenr_simulation(
    simulation_id: str,
    params: dict,
    duration_steps: int = 100
):
    """
    Run a LENR simulation with real-time updates.
    
    Simulates loading ratio changes and their effect on enhancement.
    """
    from ..physics.lenr_enhancement import LENREnhancementCalculator, LENRConditions
    
    base_temp = params.get('temperature_k', 350.0)
    base_loading = params.get('loading_ratio', 0.5)
    target_loading = params.get('target_loading', 0.95)
    material = params.get('material', 'palladium')
    defect_density = params.get('defect_density', 0.01)
    
    calc = LENREnhancementCalculator()
    
    try:
        for step in range(duration_steps):
            # Simulate gradual loading increase
            progress = step / (duration_steps - 1) if duration_steps > 1 else 1.0
            current_loading = base_loading + (target_loading - base_loading) * progress
            
            # Temperature may increase due to exothermic reactions
            temp_increase = 50 * (current_loading - base_loading)
            current_temp = base_temp + temp_increase
            
            conditions = LENRConditions(
                temperature_k=current_temp,
                loading_ratio=current_loading,
                material=material,
                defect_density=defect_density
            )
            
            # Calculate enhancement at thermal energy
            thermal_energy_kev = 8.617e-5 * current_temp / 1000  # kT in keV
            result = calc.calculate_total_enhancement(
                energy_kev=max(thermal_energy_kev, 0.001),
                conditions=conditions
            )
            
            await manager.broadcast(simulation_id, {
                'type': 'simulation_update',
                'simulation_id': simulation_id,
                'step': step,
                'total_steps': duration_steps,
                'progress': (step + 1) / duration_steps,
                'timestamp': datetime.utcnow().isoformat(),
                'data': {
                    'loading_ratio': float(current_loading),
                    'temperature_k': float(current_temp),
                    'total_enhancement': float(result.total_enhancement),
                    'dominant_mechanism': result.dominant_mechanism,
                    'individual_factors': {k: float(v) for k, v in result.individual_factors.items()},
                }
            })
            
            await asyncio.sleep(0.1)
        
        await manager.broadcast(simulation_id, {
            'type': 'simulation_complete',
            'simulation_id': simulation_id,
            'message': 'LENR simulation completed'
        })
        
    except asyncio.CancelledError:
        await manager.broadcast(simulation_id, {
            'type': 'simulation_cancelled',
            'simulation_id': simulation_id
        })
    except Exception as e:
        await manager.broadcast(simulation_id, {
            'type': 'simulation_error',
            'simulation_id': simulation_id,
            'error': str(e)
        })


async def run_bubble_fusion_simulation(
    simulation_id: str,
    params: dict,
    duration_cycles: int = 5
):
    """
    Run a bubble fusion simulation with real-time updates.
    
    Streams bubble dynamics during acoustic cycling.
    """
    from ..physics.bubble_fusion import BubbleFusionCalculator, BubbleSimulationParams, FluidType, GasType
    
    initial_radius = params.get('initial_radius_um', 10.0)
    acoustic_pressure = params.get('acoustic_pressure_bar', 1.2)
    frequency = params.get('frequency_khz', 20.0)
    
    # Map string to enum
    fluid_map = {'water': FluidType.WATER, 'd2o': FluidType.DEUTERATED_WATER}
    gas_map = {'deuterium': GasType.DEUTERIUM, 'air': GasType.AIR}
    
    sim_params = BubbleSimulationParams(
        initial_radius_um=initial_radius,
        acoustic_pressure_bar=acoustic_pressure,
        frequency_khz=frequency,
        fluid_type=fluid_map.get(params.get('fluid_type', 'water'), FluidType.WATER),
        gas_type=gas_map.get(params.get('gas_type', 'deuterium'), GasType.DEUTERIUM),
        gas_fraction=params.get('gas_fraction', 0.8)
    )
    
    calc = BubbleFusionCalculator()
    
    try:
        # Get time series data
        dynamics = calc.calculate_bubble_dynamics_timeseries(
            sim_params, num_cycles=duration_cycles
        )
        
        time_points = len(dynamics['time_us'])
        step_size = max(1, time_points // 100)  # Send ~100 updates
        
        for i in range(0, time_points, step_size):
            await manager.broadcast(simulation_id, {
                'type': 'simulation_update',
                'simulation_id': simulation_id,
                'step': i // step_size,
                'total_steps': time_points // step_size,
                'progress': i / time_points,
                'timestamp': datetime.utcnow().isoformat(),
                'data': {
                    'time_us': float(dynamics['time_us'][i]),
                    'radius_um': float(dynamics['radius_um'][i]),
                    'temperature_k': float(dynamics['temperature_k'][i]),
                    'pressure_bar': float(dynamics['pressure_bar'][i]),
                }
            })
            
            await asyncio.sleep(0.05)  # 50ms between updates
        
        # Send final collapse results
        collapse_result = calc.simulate_collapse(sim_params)
        await manager.broadcast(simulation_id, {
            'type': 'simulation_complete',
            'simulation_id': simulation_id,
            'collapse_results': {
                'max_temperature_k': float(collapse_result.max_temperature_k),
                'max_pressure_pa': float(collapse_result.max_pressure_pa),
                'min_radius_m': float(collapse_result.min_radius_m),
                'fusion_probability': float(collapse_result.fusion_probability),
            }
        })
        
    except asyncio.CancelledError:
        await manager.broadcast(simulation_id, {
            'type': 'simulation_cancelled',
            'simulation_id': simulation_id
        })
    except Exception as e:
        await manager.broadcast(simulation_id, {
            'type': 'simulation_error',
            'simulation_id': simulation_id,
            'error': str(e)
        })


@router.websocket("/ws/simulation/{simulation_type}/{simulation_id}")
async def websocket_simulation(
    websocket: WebSocket,
    simulation_type: str,
    simulation_id: str
):
    """
    WebSocket endpoint for real-time simulation streaming.
    
    Args:
        simulation_type: Type of simulation (quantum-tunneling, lenr, bubble-fusion)
        simulation_id: Unique identifier for the simulation session
    """
    await manager.connect(websocket, simulation_id)
    
    try:
        # Wait for start message with parameters (with timeout)
        try:
            data = await asyncio.wait_for(
                websocket.receive_json(), 
                timeout=30.0  # 30 second timeout for initial message
            )
        except asyncio.TimeoutError:
            await websocket.send_json({
                'type': 'error',
                'message': 'Timeout waiting for start message'
            })
            return
        
        if data.get('action') == 'start':
            params = data.get('params', {})
            duration = _coerce_duration_steps(data.get('duration_steps', 100))
            if duration is None:
                await websocket.send_json({
                    'type': 'error',
                    'message': (
                        f'duration_steps must be an integer between 1 and '
                        f'{settings.MAX_WS_DURATION_STEPS}'
                    )
                })
                return
            
            # Select simulation type
            if simulation_type == 'quantum-tunneling':
                simulation_func = run_quantum_tunneling_simulation
            elif simulation_type == 'lenr':
                simulation_func = run_lenr_simulation
            elif simulation_type == 'bubble-fusion':
                simulation_func = run_bubble_fusion_simulation
            elif simulation_type == 'theory-comparison':
                simulation_func = run_theory_comparison_stream
            else:
                await websocket.send_json({
                    'type': 'error',
                    'message': f'Unknown simulation type: {simulation_type}'
                })
                return
            
            # Cancel existing task if simulation_id is being reused
            if simulation_id in manager.simulation_tasks:
                existing_task = manager.simulation_tasks[simulation_id]
                if not existing_task.done():
                    existing_task.cancel()
                    try:
                        await existing_task
                    except asyncio.CancelledError:
                        pass
                    logger.info(f"Cancelled existing task for simulation {simulation_id}")
            
            # Start simulation task
            if simulation_type == 'theory-comparison':
                task = asyncio.create_task(
                    simulation_func(simulation_id, params)
                )
            else:
                task = asyncio.create_task(
                    simulation_func(simulation_id, params, duration)
                )
            manager.simulation_tasks[simulation_id] = task
            
            # Keep connection alive while simulation runs
            while not task.done():
                try:
                    message = await asyncio.wait_for(
                        websocket.receive_json(), timeout=1.0
                    )
                    if message.get('action') == 'stop':
                        task.cancel()
                        break
                except asyncio.TimeoutError:
                    continue
                except WebSocketDisconnect:
                    break
            
            # Wait for task to complete
            try:
                await task
            except asyncio.CancelledError:
                pass
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for simulation {simulation_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({
                'type': 'error',
                'message': str(e)
            })
        except Exception:
            pass
    finally:
        manager.disconnect(websocket, simulation_id)


async def run_theory_comparison_stream(
    simulation_id: str,
    params: dict,
):
    """
    Stream theory comparison results one-by-one via WebSocket.

    Runs each enabled theory sequentially, streaming the contribution
    and score as soon as it is computed.  This enables the Relevance
    Map to update nodes in real time as each theory reports in.
    """
    from app.physics_engine.theory_pipeline import get_default_pipeline
    from app.physics_engine.theory_scoring import (
        _physical_consistency_score,
        _experimental_agreement_score,
        _observables_completeness_score,
    )

    conditions = {
        "temperature": params.get("temperature", 300.0),
        "loading_ratio": params.get("loading_ratio", 0.9),
        "pressure": params.get("pressure", 101325.0),
        "electron_density": params.get("electron_density", 6.8e28),
        "current_density_mA_cm2": params.get("current_density_mA_cm2", 50.0),
        "excess_heat_W": params.get("excess_heat_W", 1.0),
    }

    pipeline = get_default_pipeline()
    enabled = params.get("enabled_theories", list(pipeline.registered_ids))
    total = len(enabled)

    try:
        for idx, tid in enumerate(enabled):
            try:
                contrib = pipeline.run_single(tid, conditions)
                phys = _physical_consistency_score(contrib)
                exp = _experimental_agreement_score(contrib)
                compl = _observables_completeness_score(contrib)

                await manager.broadcast(simulation_id, {
                    "type": "theory_result",
                    "simulation_id": simulation_id,
                    "step": idx,
                    "total_steps": total,
                    "progress": (idx + 1) / total,
                    "data": {
                        "theory_id": tid,
                        "theory_name": contrib.theory_name,
                        "enhancement_factor": float(contrib.enhancement_factor),
                        "energy_output_watts": float(contrib.energy_output_watts),
                        "confidence": float(contrib.confidence),
                        "is_applicable": contrib.is_applicable,
                        "physical_consistency": float(phys),
                        "experimental_agreement": float(exp),
                        "observables_completeness": float(compl),
                    },
                })
            except Exception as e:
                await manager.broadcast(simulation_id, {
                    "type": "theory_error",
                    "simulation_id": simulation_id,
                    "theory_id": tid,
                    "error": str(e),
                })

            await asyncio.sleep(0.05)  # small delay for UI update

        await manager.broadcast(simulation_id, {
            "type": "simulation_complete",
            "simulation_id": simulation_id,
            "message": f"Theory comparison complete: {total} theories evaluated",
        })

    except asyncio.CancelledError:
        await manager.broadcast(simulation_id, {
            "type": "simulation_cancelled",
            "simulation_id": simulation_id,
        })
    except Exception as e:
        await manager.broadcast(simulation_id, {
            "type": "simulation_error",
            "simulation_id": simulation_id,
            "error": str(e),
        })


@router.get("/ws/connections/{simulation_id}", response_model=ConnectionCountResponse)
async def get_connection_count(simulation_id: str) -> ConnectionCountResponse:
    """Get the number of active connections for a simulation."""
    return ConnectionCountResponse(
        simulation_id=simulation_id,
        connection_count=manager.get_connection_count(simulation_id)
    )


@router.get("/ws/active", response_model=ActiveSimulationsResponse)
async def get_active_simulations() -> ActiveSimulationsResponse:
    """Get list of all active simulation IDs."""
    return ActiveSimulationsResponse(
        active_simulations=list(manager.active_connections.keys()),
        running_tasks=list(manager.simulation_tasks.keys())
    )

