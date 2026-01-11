"""
Migration Utility for LENR Simulation v1 to v2
Helps users transition their data and configurations from v1 to v2 format.
"""

from typing import Dict, Any, List, Optional, Callable
import json
import os
import shutil
import logging
from datetime import datetime
from pathlib import Path
from ..physics_engine.constants import DEFAULT_CONFIG, LENR_PARAMETERS

logger = logging.getLogger(__name__)

class MigrationHelper:
    """Helper class for migrating from v1 to v2."""
    
    def __init__(self, backup_dir: Optional[str] = None, progress_callback: Optional[Callable[[float, str], None]] = None):
        self.backup_dir = backup_dir or f"migration_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.v1_config = {}
        self.v2_config = DEFAULT_CONFIG.copy()
        self.progress_callback = progress_callback or (lambda p, m: None)
    
    def update_progress(self, progress: float, message: str) -> None:
        """Update migration progress."""
        logger.info(f"Migration progress: {progress:.1f}% - {message}")
        self.progress_callback(progress, message)
    
    def create_backup(self, source_dir: str) -> str:
        """
        Create backup of v1 files.
        
        Args:
            source_dir: Directory containing v1 files
            
        Returns:
            Path to backup directory
        """
        self.update_progress(0.0, "Starting backup creation")
        backup_path = Path(self.backup_dir)
        backup_path.mkdir(parents=True, exist_ok=True)
        
        try:
            # Copy v1 files to backup
            shutil.copytree(
                source_dir,
                backup_path / "v1_backup",
                dirs_exist_ok=True
            )
            
            self.update_progress(20.0, "Backup created successfully")
            logger.info(f"Created backup at {backup_path}")
            return str(backup_path)
            
        except Exception as e:
            logger.error(f"Backup failed: {str(e)}")
            raise
    
    def load_v1_config(self, config_path: str) -> Dict[str, Any]:
        """
        Load v1 configuration file.
        
        Args:
            config_path: Path to v1 config file
            
        Returns:
            Loaded configuration dictionary
        """
        self.update_progress(25.0, "Loading v1 configuration")
        try:
            with open(config_path, 'r') as f:
                self.v1_config = json.load(f)
            
            self.update_progress(35.0, "V1 configuration loaded")
            return self.v1_config
            
        except Exception as e:
            logger.error(f"Failed to load v1 config: {str(e)}")
            raise
    
    def migrate_config(self) -> Dict[str, Any]:
        """
        Migrate v1 configuration to v2 format.
        
        Returns:
            v2 configuration dictionary
        """
        self.update_progress(40.0, "Starting configuration migration")
        if not self.v1_config:
            raise ValueError("No v1 configuration loaded")
        
        try:
            # Map v1 parameters to v2
            self.v2_config.update({
                # System parameters
                "temperature": self.v1_config.get("temperature", 300.0),
                "pressure": self.v1_config.get("pressure", 1e5),
                "volume": self.v1_config.get("volume", 1e-6),
                
                # Lattice configuration
                "dimensions": self.v1_config.get("lattice_dimensions", (10, 10, 10)),
                "lattice_constant": self.v1_config.get("lattice_spacing", 
                                                     LENR_PARAMETERS["default_lattice_constant"]),
                "spring_constant": self.v1_config.get("spring_constant",
                                                    LENR_PARAMETERS["default_spring_constant"]),
                
                # Material properties
                "electron_density": self.v1_config.get("electron_density", 1e28),
                "deuterium_fraction": self.v1_config.get("deuterium_ratio", 0.5),
                
                # Enhancement factors
                "enhancement_factor": self.v1_config.get("quantum_enhancement", 1.0),
                
                # Simulation parameters
                "time_step": self.v1_config.get("dt", 1e-15),
                "max_steps": self.v1_config.get("max_iterations", 1000)
            })
            
            self.update_progress(60.0, "Configuration migrated successfully")
            return self.v2_config
            
        except Exception as e:
            logger.error(f"Configuration migration failed: {str(e)}")
            raise
    
    def migrate_data(self, data_path: str, output_path: str) -> None:
        """
        Migrate v1 data files to v2 format.
        
        Args:
            data_path: Path to v1 data directory
            output_path: Path for v2 output
        """
        self.update_progress(65.0, "Starting data migration")
        try:
            # Create output directory
            Path(output_path).mkdir(parents=True, exist_ok=True)
            
            # Migrate simulation results
            if os.path.exists(os.path.join(data_path, "simulation_results.json")):
                self.update_progress(70.0, "Migrating simulation results")
                with open(os.path.join(data_path, "simulation_results.json"), 'r') as f:
                    v1_results = json.load(f)
                
                # Convert to v2 format
                v2_results = {
                    "version": "2.0.0",
                    "timestamp": datetime.now().isoformat(),
                    "simulation": {
                        "enhancement": {
                            "total_factor": v1_results.get("enhancement_factor", 1.0),
                            "mechanisms": [
                                {
                                    "name": "quantum_tunneling",
                                    "factor": v1_results.get("tunneling_factor", 1.0)
                                },
                                {
                                    "name": "electron_screening",
                                    "factor": v1_results.get("screening_factor", 1.0)
                                }
                            ]
                        },
                        "lattice": {
                            "energy": v1_results.get("lattice_energy", 0.0),
                            "temperature": v1_results.get("temperature", 300.0),
                            "phonon_modes": v1_results.get("phonon_data", [])
                        },
                        "fusion": {
                            "reaction_rate": v1_results.get("reaction_rate", 0.0),
                            "power_output": v1_results.get("power_output", 0.0),
                            "products": v1_results.get("reaction_products", {})
                        }
                    },
                    "metadata": {
                        "migrated_from": "v1",
                        "original_file": "simulation_results.json"
                    }
                }
                
                # Save v2 results
                with open(os.path.join(output_path, "simulation_results_v2.json"), 'w') as f:
                    json.dump(v2_results, f, indent=2)
                
                self.update_progress(85.0, "Simulation results migrated successfully")
            
            self.update_progress(90.0, "Data migration completed")
            
        except Exception as e:
            logger.error(f"Data migration failed: {str(e)}")
            raise
    
    def generate_migration_report(self, output_path: str) -> None:
        """
        Generate migration report.
        
        Args:
            output_path: Path to save report
        """
        self.update_progress(95.0, "Generating migration report")
        try:
            report = {
                "migration_timestamp": datetime.now().isoformat(),
                "backup_location": self.backup_dir,
                "v1_config": self.v1_config,
                "v2_config": self.v2_config,
                "changes": [
                    "Updated configuration format",
                    "Migrated simulation results to new schema",
                    "Updated parameter names and units",
                    "Added new metadata fields"
                ],
                "status": "completed"
            }
            
            with open(output_path, 'w') as f:
                json.dump(report, f, indent=2)
            
            self.update_progress(100.0, "Migration completed successfully")
            
        except Exception as e:
            logger.error(f"Failed to generate migration report: {str(e)}")
            raise

def migrate_to_v2(
    source_dir: str,
    config_path: str,
    output_dir: str,
    backup_dir: Optional[str] = None,
    progress_callback: Optional[Callable[[float, str], None]] = None
) -> None:
    """
    Main migration function.
    
    Args:
        source_dir: Directory containing v1 files
        config_path: Path to v1 config file
        output_dir: Directory for v2 output
        backup_dir: Optional backup directory path
    """
    try:
        # Create migration helper
        helper = MigrationHelper(backup_dir, progress_callback)
        
        # Create backup
        helper.create_backup(source_dir)
        
        # Load and migrate configuration
        helper.load_v1_config(config_path)
        v2_config = helper.migrate_config()
        
        # Migrate data
        helper.migrate_data(source_dir, output_dir)
        
        # Generate report
        helper.generate_migration_report(os.path.join(output_dir, "migration_report.json"))
        
        logger.info("Migration to v2 completed successfully")
        
    except Exception as e:
        logger.error(f"Migration failed: {str(e)}")
        raise 