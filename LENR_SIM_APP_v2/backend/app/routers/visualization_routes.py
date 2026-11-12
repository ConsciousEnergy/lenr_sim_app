"""
Visualization WebSocket Routes

This module provides WebSocket endpoints for real-time streaming of simulation visualization data,
allowing frontend components to receive event notifications during simulation execution.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from typing import Dict, Any, List, Set
import json
import asyncio
import logging
from datetime import datetime

from app.core.config import settings
from app.security.websocket_origin import is_allowed_websocket_origin
from app.utils.logging import setup_logger
from app.simulation.multi_physics import (
    VisualizationEvent, 
    VisualizationEventType,
    VisualizationEventListener,
    default_hooks
)

# Setup logger
logger = setup_logger("visualization_ws", "logs/api.log")

# Create router
router = APIRouter()

# Store active WebSocket connections
active_connections: Dict[str, WebSocket] = {}
# Store simulation IDs that each connection is subscribed to
connection_subscriptions: Dict[str, Set[str]] = {}
# Store active simulations
active_simulations: Dict[str, Any] = {}


class WebSocketEventListener(VisualizationEventListener):
    """
    Event listener that forwards events to WebSocket clients.
    """
    
    def __init__(self, simulation_id: str):
        """
        Initialize the WebSocket event listener.
        
        Args:
            simulation_id: ID of the simulation this listener is for
        """
        self.simulation_id = simulation_id
    
    async def on_event(self, event: VisualizationEvent) -> None:
        """
        Handle a visualization event by forwarding it to relevant WebSocket connections.
        
        Args:
            event: Visualization event to handle
        """
        # Serialize event data
        event_data = {
            "simulation_id": self.simulation_id,
            "event_type": event.event_type.value,
            "source": event.source,
            "data": event.data,
            "timestamp": event.timestamp
        }
        
        # Convert to JSON
        try:
            json_data = json.dumps(event_data)
        except Exception as e:
            logger.error(f"Error serializing event data: {e}")
            return
        
        # Send to all subscribers
        for conn_id, ws in active_connections.items():
            # Check if this connection is subscribed to this simulation
            if conn_id in connection_subscriptions and self.simulation_id in connection_subscriptions[conn_id]:
                try:
                    await ws.send_text(json_data)
                except Exception as e:
                    logger.error(f"Error sending data to WebSocket {conn_id}: {e}")


@router.websocket("/ws/{client_id}")
async def visualization_websocket(websocket: WebSocket, client_id: str):
    """
    WebSocket endpoint for real-time visualization events.
    
    Args:
        websocket: WebSocket connection
        client_id: Unique client identifier
    """
    # LRS-M1: reject before accept when Origin is missing or not CORS-allowlisted.
    origin = websocket.headers.get("origin")
    if not is_allowed_websocket_origin(origin, settings.CORS_ORIGINS):
        logger.warning(
            "Rejected visualization WebSocket Origin=%r (client_id=%s)",
            origin,
            client_id,
        )
        await websocket.close(code=1008, reason="Origin not allowed")
        return

    if len(active_connections) >= settings.MAX_VIS_WS_CONNECTIONS:
        await websocket.close(code=1013, reason="Too many concurrent visualization streams")
        return

    # Accept the connection
    await websocket.accept()
    connection_id = f"{client_id}_{datetime.now().timestamp()}"
    active_connections[connection_id] = websocket
    connection_subscriptions[connection_id] = set()
    
    logger.info(f"WebSocket connection established: {connection_id}")
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                # Parse message
                message = json.loads(data)
                
                # Handle subscription message
                if message.get("type") == "subscribe":
                    simulation_id = message.get("simulation_id")
                    if not simulation_id:
                        await websocket.send_text(json.dumps({
                            "status": "error",
                            "message": "Missing simulation_id in subscribe message"
                        }))
                        continue
                    
                    # Add subscription
                    connection_subscriptions[connection_id].add(simulation_id)
                    logger.info(f"Client {connection_id} subscribed to simulation {simulation_id}")
                    
                    # Send confirmation
                    await websocket.send_text(json.dumps({
                        "status": "subscribed",
                        "simulation_id": simulation_id
                    }))
                
                # Handle unsubscribe message
                elif message.get("type") == "unsubscribe":
                    simulation_id = message.get("simulation_id")
                    if not simulation_id:
                        await websocket.send_text(json.dumps({
                            "status": "error",
                            "message": "Missing simulation_id in unsubscribe message"
                        }))
                        continue
                    
                    # Remove subscription
                    if simulation_id in connection_subscriptions[connection_id]:
                        connection_subscriptions[connection_id].remove(simulation_id)
                        logger.info(f"Client {connection_id} unsubscribed from simulation {simulation_id}")
                    
                    # Send confirmation
                    await websocket.send_text(json.dumps({
                        "status": "unsubscribed",
                        "simulation_id": simulation_id
                    }))
                
                # Handle ping message
                elif message.get("type") == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": datetime.now().timestamp()
                    }))
                
                # Handle unknown message type
                else:
                    await websocket.send_text(json.dumps({
                        "status": "error",
                        "message": f"Unknown message type: {message.get('type')}"
                    }))
            
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    "status": "error",
                    "message": "Invalid JSON message"
                }))
            except Exception as e:
                logger.error(f"Error handling WebSocket message: {e}")
                await websocket.send_text(json.dumps({
                    "status": "error",
                    "message": "Server error handling message"
                }))
    
    except WebSocketDisconnect:
        logger.info(f"WebSocket connection closed: {connection_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        # Clean up when connection is closed
        if connection_id in active_connections:
            del active_connections[connection_id]
        if connection_id in connection_subscriptions:
            del connection_subscriptions[connection_id]


def register_simulation_listener(simulation_id: str) -> None:
    """
    Register a WebSocket event listener for a simulation.
    
    Args:
        simulation_id: ID of the simulation to register a listener for
    """
    # Create listener for this simulation
    listener = WebSocketEventListener(simulation_id)
    
    # Register with visualization hooks
    default_hooks.add_listener(listener)
    
    # Store in active simulations
    active_simulations[simulation_id] = {
        "listener": listener,
        "registered_at": datetime.now().timestamp()
    }
    
    logger.info(f"Registered WebSocket listener for simulation {simulation_id}")


def unregister_simulation_listener(simulation_id: str) -> None:
    """
    Unregister a WebSocket event listener for a simulation.
    
    Args:
        simulation_id: ID of the simulation to unregister the listener for
    """
    if simulation_id in active_simulations:
        # Get listener
        listener = active_simulations[simulation_id]["listener"]
        
        # Unregister from visualization hooks
        default_hooks.remove_listener(listener)
        
        # Remove from active simulations
        del active_simulations[simulation_id]
        
        logger.info(f"Unregistered WebSocket listener for simulation {simulation_id}")


@router.post("/register-simulation/{simulation_id}")
async def register_simulation(simulation_id: str):
    """
    Register a simulation for WebSocket event streaming.
    
    Args:
        simulation_id: ID of the simulation to register
    
    Returns:
        Status message
    """
    try:
        # Check if already registered
        if simulation_id in active_simulations:
            return {
                "status": "already_registered",
                "simulation_id": simulation_id
            }
        
        # Register simulation
        register_simulation_listener(simulation_id)
        
        return {
            "status": "registered",
            "simulation_id": simulation_id
        }
    except Exception as e:
        logger.error(f"Error registering simulation {simulation_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/unregister-simulation/{simulation_id}")
async def unregister_simulation(simulation_id: str):
    """
    Unregister a simulation from WebSocket event streaming.
    
    Args:
        simulation_id: ID of the simulation to unregister
    
    Returns:
        Status message
    """
    try:
        # Check if registered
        if simulation_id not in active_simulations:
            return {
                "status": "not_registered",
                "simulation_id": simulation_id
            }
        
        # Unregister simulation
        unregister_simulation_listener(simulation_id)
        
        return {
            "status": "unregistered",
            "simulation_id": simulation_id
        }
    except Exception as e:
        logger.error(f"Error unregistering simulation {simulation_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/active-simulations")
async def get_active_simulations():
    """
    Get the list of active simulations.
    
    Returns:
        List of active simulation IDs
    """
    return {
        "active_simulations": list(active_simulations.keys()),
        "count": len(active_simulations)
    } 