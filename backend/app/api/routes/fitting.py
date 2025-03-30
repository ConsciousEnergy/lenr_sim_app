"""
Fitting API routes for LENR_Sim_App
"""

import time
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Response
from typing import Optional, List, Dict, Any
import json
import pandas as pd
import io
import csv
from datetime import datetime

from app.models.fitting import (
    ExperimentalDataSet,
    ExperimentalDataPoint,
    FittingParams,
    FittingResult
)

# Import physics modules (will be implemented)
from app.physics.fitting_module import fit_experimental_data, compare_data_sets

# Import logging
from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("fitting_routes", "logs/fitting.log")

router = APIRouter()

@router.post("/experimental", response_model=FittingResult)
async def fit_experimental(
    data: ExperimentalDataSet,
    params: FittingParams
):
    """
    Fit model parameters to experimental temperature vs. power data provided as JSON
    """
    if not data.data:
        raise HTTPException(status_code=400, detail="No experimental data points provided")
    
    logger.info(f"Fitting request received with {len(data.data)} data points, model={params.model}")
    
    start_time = time.time()
    
    try:
        # Call physics engine for fitting
        result = fit_experimental_data(
            experimental_data=data.data,
            model=params.model,
            fixed_params=params.fixed_params,
            bounds=params.bounds
        )
        
        # Calculate processing time
        processing_time = (time.time() - start_time) * 1000  # ms
        
        # Add metadata
        result["metadata"]["calculation_time_ms"] = processing_time
        result["metadata"]["data_points"] = len(data.data)
        
        logger.info(f"Fitting completed in {processing_time:.2f}ms with r_squared={result['goodness_of_fit'].get('r_squared', 'N/A')}")
        return result
    
    except Exception as e:
        logger.error(f"Error in experimental data fitting: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Fitting error: {str(e)}")

@router.post("/csv-upload", response_model=FittingResult)
async def fit_csv_data(
    file: UploadFile = File(...),
    params_json: str = Form(...),
):
    """
    Upload CSV file with temperature and power data, then fit model parameters
    
    CSV format should have Temperature and Power columns
    """
    # Parse fitting parameters
    try:
        params = FittingParams.model_validate(json.loads(params_json))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid parameters JSON: {str(e)}")
    
    # Read CSV file
    try:
        contents = await file.read()
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        
        # Validate CSV format
        required_columns = ['Temperature', 'Power']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(
                status_code=400, 
                detail=f"CSV must contain columns: {', '.join(required_columns)}"
            )
        
        # Convert to data points
        data_points = [
            ExperimentalDataPoint(temperature=row['Temperature'], power=row['Power'])
            for _, row in df.iterrows()
        ]
        
        dataset = ExperimentalDataSet(
            data=data_points,
            metadata={"filename": file.filename}
        )
        
        logger.info(f"CSV upload: {file.filename} with {len(data_points)} data points")
        
        # Call the fitting endpoint
        return await fit_experimental(dataset, params)
    
    except pd.errors.ParserError:
        raise HTTPException(status_code=400, detail="Invalid CSV format")
    except Exception as e:
        logger.error(f"Error processing CSV upload: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

@router.post("/export-to-csv")
async def export_results_to_csv(
    simulation_results: Dict[str, Any]
):
    """
    Export simulation results to CSV
    """
    try:
        # Create a StringIO object to hold the CSV data
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write headers
        writer.writerow(["Temperature", "Power", "Type"])
        
        # Write simulation results
        if "data_points" in simulation_results:
            for point in simulation_results["data_points"]:
                writer.writerow([
                    point.get("temperature", ""),
                    point.get("power", ""),
                    "Simulation"
                ])
        
        # Get the CSV data as a string
        csv_data = output.getvalue()
        
        # Create a Response with the CSV data
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        response = Response(content=csv_data)
        response.headers["Content-Disposition"] = f"attachment; filename=simulation_results_{timestamp}.csv"
        response.headers["Content-Type"] = "text/csv"
        
        logger.info(f"Exported simulation results to CSV with {len(simulation_results.get('data_points', []))} data points")
        return response
        
    except Exception as e:
        logger.error(f"Error exporting to CSV: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Export error: {str(e)}")

@router.post("/compare-data")
async def compare_datasets(
    simulation_data: List[Dict[str, float]],
    experimental_data: List[Dict[str, float]]
):
    """
    Compare simulation results with experimental data
    
    Returns statistics and comparison metrics
    """
    try:
        if not simulation_data:
            raise HTTPException(status_code=400, detail="No simulation data provided")
            
        if not experimental_data:
            raise HTTPException(status_code=400, detail="No experimental data provided")
        
        logger.info(f"Comparing {len(simulation_data)} simulation points with {len(experimental_data)} experimental points")
        
        # Call physics engine for comparison
        result = compare_data_sets(
            simulation_data=simulation_data,
            experimental_data=experimental_data
        )
        
        logger.info(f"Comparison completed with r_squared={result['metrics'].get('r_squared', 'N/A')}")
        return result
        
    except Exception as e:
        logger.error(f"Error comparing datasets: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Comparison error: {str(e)}")

@router.post("/combined-export")
async def export_combined_results(
    simulation_data: List[Dict[str, float]],
    experimental_data: List[Dict[str, float]],
    comparison_metrics: Optional[Dict[str, Any]] = None
):
    """
    Export both simulation and experimental data to a single CSV file
    with comparison metrics in the header
    """
    try:
        # Create a StringIO object to hold the CSV data
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write metadata and comparison metrics if provided
        if comparison_metrics:
            writer.writerow(["# Comparison Metrics"])
            for key, value in comparison_metrics.items():
                writer.writerow([f"# {key}", value])
            writer.writerow(["#"])
        
        # Write headers
        writer.writerow(["Temperature", "Power", "Type"])
        
        # Write simulation data
        for point in simulation_data:
            writer.writerow([
                point.get("temperature", ""),
                point.get("power", ""),
                "Simulation"
            ])
        
        # Write experimental data
        for point in experimental_data:
            writer.writerow([
                point.get("temperature", ""),
                point.get("power", ""),
                "Experimental"
            ])
        
        # Get the CSV data as a string
        csv_data = output.getvalue()
        
        # Create a Response with the CSV data
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        response = Response(content=csv_data)
        response.headers["Content-Disposition"] = f"attachment; filename=combined_results_{timestamp}.csv"
        response.headers["Content-Type"] = "text/csv"
        
        logger.info(f"Exported combined results to CSV with {len(simulation_data)} simulation points and {len(experimental_data)} experimental points")
        return response
        
    except Exception as e:
        logger.error(f"Error exporting combined data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Export error: {str(e)}") 