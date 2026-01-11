"""
API Routes for v1 to v2 Migration
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging
from ..utils.migration_v1_to_v2 import migrate_to_v2

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/migration",
    tags=["migration"]
)

class MigrationRequest(BaseModel):
    """Migration request model."""
    source_dir: str
    config_path: str
    output_dir: str
    backup_dir: Optional[str] = None

class MigrationStatus(BaseModel):
    """Migration status model."""
    task_id: str
    status: str
    progress: float
    message: Optional[str] = None
    details: Optional[str] = None

# Store migration task statuses
migration_tasks: Dict[str, MigrationStatus] = {}

def update_migration_progress(task_id: str, progress: float, message: str) -> None:
    """Update migration task progress."""
    if task_id in migration_tasks:
        migration_tasks[task_id].progress = progress
        migration_tasks[task_id].message = message
        logger.info(f"Migration {task_id}: {progress:.1f}% - {message}")

async def run_migration(
    task_id: str,
    source_dir: str,
    config_path: str,
    output_dir: str,
    backup_dir: Optional[str] = None
) -> None:
    """Run migration in background task."""
    try:
        # Update status to running
        migration_tasks[task_id].status = "running"
        migration_tasks[task_id].progress = 0.0
        
        # Create progress callback
        progress_callback = lambda p, m: update_migration_progress(task_id, p, m)
        
        # Run migration
        migrate_to_v2(
            source_dir=source_dir,
            config_path=config_path,
            output_dir=output_dir,
            backup_dir=backup_dir,
            progress_callback=progress_callback
        )
        
        # Update status to completed
        migration_tasks[task_id].status = "completed"
        migration_tasks[task_id].progress = 100.0
        migration_tasks[task_id].message = "Migration completed successfully"
        
    except Exception as e:
        # Update status to failed
        migration_tasks[task_id].status = "failed"
        migration_tasks[task_id].details = str(e)
        migration_tasks[task_id].message = "Migration failed"
        logger.error(f"Migration failed: {str(e)}")

@router.post("/start", response_model=MigrationStatus)
async def start_migration(
    request: MigrationRequest,
    background_tasks: BackgroundTasks
) -> MigrationStatus:
    """Start migration process."""
    try:
        # Generate task ID
        from uuid import uuid4
        task_id = str(uuid4())
        
        # Create status entry
        status = MigrationStatus(
            task_id=task_id,
            status="pending",
            progress=0.0,
            message="Migration queued"
        )
        migration_tasks[task_id] = status
        
        # Start migration in background
        background_tasks.add_task(
            run_migration,
            task_id=task_id,
            source_dir=request.source_dir,
            config_path=request.config_path,
            output_dir=request.output_dir,
            backup_dir=request.backup_dir
        )
        
        return status
        
    except Exception as e:
        logger.error(f"Failed to start migration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{task_id}", response_model=MigrationStatus)
async def get_migration_status(task_id: str) -> MigrationStatus:
    """Get status of migration task."""
    if task_id not in migration_tasks:
        raise HTTPException(status_code=404, detail="Migration task not found")
    return migration_tasks[task_id]

@router.get("/validate")
async def validate_migration_paths(request: MigrationRequest) -> Dict[str, Any]:
    """Validate migration paths before starting."""
    import os
    from pathlib import Path
    
    validation = {
        "source_dir": {
            "exists": os.path.isdir(request.source_dir),
            "readable": os.access(request.source_dir, os.R_OK)
        },
        "config_path": {
            "exists": os.path.isfile(request.config_path),
            "readable": os.access(request.config_path, os.R_OK)
        },
        "output_dir": {
            "parent_exists": os.path.isdir(str(Path(request.output_dir).parent)),
            "writable": os.access(str(Path(request.output_dir).parent), os.W_OK)
        },
        "is_valid": False
    }
    
    # Check if all required conditions are met
    validation["is_valid"] = all([
        validation["source_dir"]["exists"],
        validation["source_dir"]["readable"],
        validation["config_path"]["exists"],
        validation["config_path"]["readable"],
        validation["output_dir"]["parent_exists"],
        validation["output_dir"]["writable"]
    ])
    
    return validation

@router.get("/cleanup/{task_id}")
async def cleanup_migration_task(task_id: str) -> Dict[str, Any]:
    """Clean up completed or failed migration task."""
    if task_id not in migration_tasks:
        raise HTTPException(status_code=404, detail="Migration task not found")
        
    status = migration_tasks[task_id].status
    if status not in ["completed", "failed"]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot clean up task in status: {status}"
        )
        
    del migration_tasks[task_id]
    return {"status": "cleaned", "task_id": task_id} 