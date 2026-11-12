"""
Result Visualization Routes

This module provides API endpoints for accessing simulation results and
visualization data, as well as controlling visualization settings.
"""

from fastapi import APIRouter, HTTPException, Query, Body, Depends, BackgroundTasks
from fastapi.responses import JSONResponse, FileResponse
from typing import Dict, List, Any, Optional
import os
import json
import logging
import numpy as np
from datetime import datetime
import io
import zipfile
import tempfile
from pathlib import Path

from app.utils.logging import setup_logger
from app.visualization.result_analysis import ResultAnalyzer, AnalysisConfig, AnalysisMethod, DataExporter, default_analyzer
from app.simulation.multi_physics import default_hooks

# Set up logger
logger = setup_logger("result_viz_routes", "logs/api.log")

# Create router
router = APIRouter()

# Storage for simulation results (in-memory cache)
simulation_results_cache = {}

# File storage path for saved results
RESULTS_DIR = Path("output/simulation_results")
RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def _safe_result_path(simulation_id: str) -> Path:
    """Resolve a results JSON path under RESULTS_DIR; reject traversal."""
    if not simulation_id or simulation_id != Path(simulation_id).name:
        raise HTTPException(status_code=400, detail="Invalid simulation_id")
    if ".." in simulation_id or "/" in simulation_id or "\\" in simulation_id:
        raise HTTPException(status_code=400, detail="Invalid simulation_id")
    base = RESULTS_DIR.resolve()
    candidate = (RESULTS_DIR / f"{simulation_id}.json").resolve()
    if not str(candidate).startswith(str(base) + os.sep):
        raise HTTPException(status_code=400, detail="Invalid simulation_id")
    return candidate


@router.get("/simulations")
async def list_simulations():
    """
    List available simulation results.
    
    Returns:
        List of simulation metadata
    """
    # Get cached simulations
    cached_simulations = [
        {
            "simulation_id": sim_id,
            "metadata": data.get("metadata", {}),
            "timestamp": data.get("metadata", {}).get("timestamp", None),
            "status": "cached",
            "available_analysis": list(data.get("analysis_results", {}).keys()) if "analysis_results" in data else []
        }
        for sim_id, data in simulation_results_cache.items()
    ]
    
    # Get saved simulations from disk
    saved_simulations = []
    try:
        for result_file in RESULTS_DIR.glob("*.json"):
            try:
                with open(result_file, "r") as f:
                    metadata = json.load(f).get("metadata", {})
                
                saved_simulations.append({
                    "simulation_id": result_file.stem,
                    "metadata": metadata,
                    "timestamp": metadata.get("timestamp", None),
                    "status": "saved",
                    "file_size": result_file.stat().st_size
                })
            except Exception as e:
                logger.error(f"Error reading saved simulation {result_file}: {e}")
    except Exception as e:
        logger.error(f"Error listing saved simulations: {e}")
    
    # Combine and sort by timestamp (newest first)
    all_simulations = cached_simulations + saved_simulations
    all_simulations.sort(key=lambda x: x.get("timestamp", 0), reverse=True)
    
    return all_simulations


@router.get("/simulations/{simulation_id}")
async def get_simulation_metadata(simulation_id: str):
    """
    Get metadata for a specific simulation.
    
    Args:
        simulation_id: ID of the simulation
        
    Returns:
        Simulation metadata
    """
    # Check in-memory cache first
    if simulation_id in simulation_results_cache:
        return {
            "simulation_id": simulation_id,
            "metadata": simulation_results_cache[simulation_id].get("metadata", {}),
            "status": "cached",
            "available_analysis": list(simulation_results_cache[simulation_id].get("analysis_results", {}).keys()) 
                               if "analysis_results" in simulation_results_cache[simulation_id] else []
        }
    
    # Check saved results
    result_file = _safe_result_path(simulation_id)
    if result_file.exists():
        try:
            with open(result_file, "r") as f:
                data = json.load(f)
            
            return {
                "simulation_id": simulation_id,
                "metadata": data.get("metadata", {}),
                "status": "saved",
                "file_size": result_file.stat().st_size,
                "available_analysis": list(data.get("analysis_results", {}).keys()) if "analysis_results" in data else []
            }
        except Exception as e:
            logger.error(f"Error reading saved simulation {simulation_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Error reading saved simulation: {str(e)}")
    
    raise HTTPException(status_code=404, detail=f"Simulation {simulation_id} not found")


@router.get("/simulations/{simulation_id}/results")
async def get_simulation_results(
    simulation_id: str,
    include_raw_data: bool = False,
    time_range: Optional[str] = Query(None, description="Time range in format 'start,end'")
):
    """
    Get results for a specific simulation.
    
    Args:
        simulation_id: ID of the simulation
        include_raw_data: Whether to include raw data arrays (can be large)
        time_range: Optional time range filter in format 'start,end'
        
    Returns:
        Simulation results
    """
    # Parse time range if provided
    time_filter = None
    if time_range:
        try:
            start, end = map(float, time_range.split(","))
            time_filter = (start, end)
        except Exception as e:
            logger.error(f"Error parsing time range '{time_range}': {e}")
            raise HTTPException(status_code=400, detail=f"Invalid time range format. Use 'start,end'")
    
    # Check in-memory cache first
    if simulation_id in simulation_results_cache:
        results = simulation_results_cache[simulation_id]
        
        # Apply time filter if needed
        if time_filter and "time" in results:
            start, end = time_filter
            time_indices = [i for i, t in enumerate(results["time"]) if start <= t <= end]
            
            # Filter time series data
            filtered_results = {
                "time": [results["time"][i] for i in time_indices],
                "metadata": results.get("metadata", {})
            }
            
            # Filter other time series data
            for key, value in results.items():
                if key not in ["time", "metadata"]:
                    if isinstance(value, list) and len(value) == len(results["time"]):
                        filtered_results[key] = [value[i] for i in time_indices]
                    elif isinstance(value, dict):
                        filtered_results[key] = {}
                        for sub_key, sub_value in value.items():
                            if isinstance(sub_value, list) and len(sub_value) == len(results["time"]):
                                filtered_results[key][sub_key] = [sub_value[i] for i in time_indices]
                            else:
                                filtered_results[key][sub_key] = sub_value
                    else:
                        filtered_results[key] = value
            
            results = filtered_results
        
        # Remove raw data if not requested
        if not include_raw_data:
            # Create a copy without large data arrays
            filtered_results = {
                "metadata": results.get("metadata", {}),
                "summary": results.get("summary", {}),
                "time": results.get("time", [])
            }
            
            # Include analysis results
            if "analysis_results" in results:
                filtered_results["analysis_results"] = results["analysis_results"]
            
            results = filtered_results
        
        return results
    
    # Check saved results
    result_file = _safe_result_path(simulation_id)
    if result_file.exists():
        try:
            with open(result_file, "r") as f:
                results = json.load(f)
            
            # Apply time filter if needed
            if time_filter and "time" in results:
                # (similar filtering logic as above)
                pass
            
            # Remove raw data if not requested
            if not include_raw_data:
                # (similar filtering logic as above)
                pass
            
            return results
        except Exception as e:
            logger.error(f"Error reading saved simulation {simulation_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Error reading saved simulation: {str(e)}")
    
    raise HTTPException(status_code=404, detail=f"Simulation {simulation_id} not found")


@router.post("/simulations/{simulation_id}/analyze")
async def analyze_simulation_results(
    simulation_id: str,
    config: Dict[str, Any] = Body(...)
):
    """
    Analyze simulation results with custom configuration.
    
    Args:
        simulation_id: ID of the simulation
        config: Analysis configuration
        
    Returns:
        Analysis results
    """
    # Check if simulation exists
    if simulation_id not in simulation_results_cache:
        # Check saved results
        result_file = _safe_result_path(simulation_id)
        if not result_file.exists():
            raise HTTPException(status_code=404, detail=f"Simulation {simulation_id} not found")
        
        # Load saved results
        try:
            with open(result_file, "r") as f:
                simulation_results_cache[simulation_id] = json.load(f)
        except Exception as e:
            logger.error(f"Error reading saved simulation {simulation_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Error reading saved simulation: {str(e)}")
    
    # Convert configuration to AnalysisConfig
    analysis_config = AnalysisConfig()
    
    # Set methods if provided
    if "methods" in config:
        try:
            methods = []
            for method_name in config["methods"]:
                try:
                    methods.append(AnalysisMethod(method_name))
                except ValueError:
                    logger.warning(f"Unknown analysis method: {method_name}")
            
            if methods:
                analysis_config.methods = methods
        except Exception as e:
            logger.error(f"Error setting analysis methods: {e}")
    
    # Set other config parameters
    if "region" in config:
        analysis_config.region = tuple(config["region"]) if isinstance(config["region"], list) else config["region"]
    
    if "histogram_bins" in config:
        analysis_config.histogram_bins = int(config["histogram_bins"])
    
    if "time_range" in config:
        analysis_config.time_range = tuple(config["time_range"]) if isinstance(config["time_range"], list) else None
    
    if "normalize" in config:
        analysis_config.normalize = bool(config["normalize"])
    
    if "filter_threshold" in config:
        analysis_config.filter_threshold = float(config["filter_threshold"])
    
    # Perform analysis
    try:
        results = default_analyzer.analyze_simulation_data(
            simulation_results_cache[simulation_id],
            analysis_config
        )
        
        # Cache analysis results
        if "analysis_results" not in simulation_results_cache[simulation_id]:
            simulation_results_cache[simulation_id]["analysis_results"] = {}
        
        analysis_id = f"analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        simulation_results_cache[simulation_id]["analysis_results"][analysis_id] = {
            "config": {
                "methods": [m.value for m in analysis_config.methods],
                "region": str(analysis_config.region) if analysis_config.region else "full",
                "time_range": analysis_config.time_range,
                "normalize": analysis_config.normalize,
                "filter_threshold": analysis_config.filter_threshold
            },
            "results": results
        }
        
        return {
            "analysis_id": analysis_id,
            "results": results
        }
    except Exception as e:
        logger.error(f"Error analyzing simulation {simulation_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error analyzing simulation: {str(e)}")


@router.get("/simulations/{simulation_id}/analysis/{analysis_id}")
async def get_analysis_results(
    simulation_id: str,
    analysis_id: str
):
    """
    Get previously computed analysis results.
    
    Args:
        simulation_id: ID of the simulation
        analysis_id: ID of the analysis
        
    Returns:
        Analysis results
    """
    # Check if simulation exists in cache
    if simulation_id in simulation_results_cache:
        # Check if analysis exists
        if "analysis_results" in simulation_results_cache[simulation_id] and \
           analysis_id in simulation_results_cache[simulation_id]["analysis_results"]:
            return simulation_results_cache[simulation_id]["analysis_results"][analysis_id]
    
    # Check saved results
    result_file = _safe_result_path(simulation_id)
    if result_file.exists():
        try:
            with open(result_file, "r") as f:
                data = json.load(f)
            
            if "analysis_results" in data and analysis_id in data["analysis_results"]:
                return data["analysis_results"][analysis_id]
        except Exception as e:
            logger.error(f"Error reading saved analysis {analysis_id} for simulation {simulation_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Error reading saved analysis: {str(e)}")
    
    raise HTTPException(status_code=404, detail=f"Analysis {analysis_id} for simulation {simulation_id} not found")


@router.post("/simulations/{simulation_id}/save")
async def save_simulation_results(
    simulation_id: str,
    background_tasks: BackgroundTasks
):
    """
    Save simulation results to disk.
    
    Args:
        simulation_id: ID of the simulation
        
    Returns:
        Success message
    """
    # Check if simulation exists in cache
    if simulation_id not in simulation_results_cache:
        raise HTTPException(status_code=404, detail=f"Simulation {simulation_id} not found in cache")
    
    # Save in background to avoid blocking
    def save_results():
        try:
            result_file = _safe_result_path(simulation_id)
            with open(result_file, "w") as f:
                json.dump(simulation_results_cache[simulation_id], f)
            
            logger.info(f"Saved simulation {simulation_id} to {result_file}")
        except Exception as e:
            logger.error(f"Error saving simulation {simulation_id}: {e}")
    
    background_tasks.add_task(save_results)
    
    return {"message": f"Saving simulation {simulation_id} in background"}


@router.get("/simulations/{simulation_id}/export")
async def export_simulation_results(
    simulation_id: str,
    format: str = Query("json", description="Export format (json or csv)")
):
    """
    Export simulation results in specified format.
    
    Args:
        simulation_id: ID of the simulation
        format: Export format (json or csv)
        
    Returns:
        Downloaded file
    """
    # Check if simulation exists
    if simulation_id not in simulation_results_cache:
        # Check saved results
        result_file = _safe_result_path(simulation_id)
        if not result_file.exists():
            raise HTTPException(status_code=404, detail=f"Simulation {simulation_id} not found")
        
        # Use saved file directly for JSON format
        if format.lower() == "json":
            return FileResponse(
                path=result_file,
                filename=f"simulation_{simulation_id}.json",
                media_type="application/json"
            )
        
        # Load saved results for CSV format
        try:
            with open(result_file, "r") as f:
                results = json.load(f)
        except Exception as e:
            logger.error(f"Error reading saved simulation {simulation_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Error reading saved simulation: {str(e)}")
    else:
        results = simulation_results_cache[simulation_id]
    
    # Export based on format
    if format.lower() == "json":
        # Create a temporary file
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as temp_file:
            temp_path = temp_file.name
            temp_file.write(DataExporter.to_json(results, indent=2).encode("utf-8"))
        
        return FileResponse(
            path=temp_path,
            filename=f"simulation_{simulation_id}.json",
            media_type="application/json",
            background=BackgroundTasks().add_task(lambda: os.unlink(temp_path))
        )
    
    elif format.lower() == "csv":
        # Export to CSV
        csv_data = DataExporter.to_csv(results)
        
        # Create a ZIP file with all CSV files
        with tempfile.NamedTemporaryFile(suffix=".zip", delete=False) as temp_file:
            temp_path = temp_file.name
            
            with zipfile.ZipFile(temp_file, "w") as zipf:
                for filename, content in csv_data.items():
                    zipf.writestr(filename, content)
        
        return FileResponse(
            path=temp_path,
            filename=f"simulation_{simulation_id}_csv.zip",
            media_type="application/zip",
            background=BackgroundTasks().add_task(lambda: os.unlink(temp_path))
        )
    
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported export format: {format}")


@router.delete("/simulations/{simulation_id}")
async def delete_simulation_results(simulation_id: str):
    """
    Delete simulation results.
    
    Args:
        simulation_id: ID of the simulation
        
    Returns:
        Success message
    """
    deleted = False
    
    # Remove from cache if present
    if simulation_id in simulation_results_cache:
        del simulation_results_cache[simulation_id]
        deleted = True
    
    # Remove saved file if present
    result_file = _safe_result_path(simulation_id)
    if result_file.exists():
        try:
            result_file.unlink()
            deleted = True
        except Exception as e:
            logger.error(f"Error deleting saved simulation {simulation_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Error deleting saved simulation: {str(e)}")
    
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Simulation {simulation_id} not found")
    
    return {"message": f"Deleted simulation {simulation_id}"}


@router.post("/register-result")
async def register_simulation_result(
    background_tasks: BackgroundTasks,
    result: Dict[str, Any] = Body(...)
):
    """
    Register a simulation result from the simulation engine.
    
    This endpoint is called internally by the simulation engine when a simulation completes.
    
    Args:
        result: Simulation result data
        
    Returns:
        Success message
    """
    # Extract simulation ID
    simulation_id = result.get("simulation_id")
    if not simulation_id:
        raise HTTPException(status_code=400, detail="Missing simulation_id in result data")
    
    # Add timestamp if not present
    if "metadata" not in result:
        result["metadata"] = {}
    
    if "timestamp" not in result["metadata"]:
        result["metadata"]["timestamp"] = datetime.now().timestamp()
    
    # Store in cache
    simulation_results_cache[simulation_id] = result
    
    # Optionally save to disk
    if result.get("metadata", {}).get("auto_save", False):
        background_tasks.add_task(lambda: save_simulation_results(simulation_id, background_tasks))
    
    logger.info(f"Registered result for simulation {simulation_id}")
    
    return {"message": f"Result for simulation {simulation_id} registered"} 