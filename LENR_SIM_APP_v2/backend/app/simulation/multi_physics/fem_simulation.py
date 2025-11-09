"""
FEM-based Multi-Physics Simulation for LENR

This module integrates the Finite Element Method (FEM) solver with
the simulation framework for LENR applications. It handles the mapping
between the simulation domain and the FEM mesh, setting up simulations,
and processing results.
"""

import numpy as np
import logging
import time
from typing import Dict, List, Tuple, Optional, Any, Union
import os
import uuid
from datetime import datetime

from app.utils.logging import setup_logger
from app.simulation.domain import SimulationDomain
from app.simulation.engine import SimulationEngine, SimulationConfig
from app.physics.fem_solver import FEMSolver, FEMConfig, MeshData, ElementType, PhysicsType
from app.physics.fem_mesh import MeshGenerator
from app.physics.fem_lenr import LENRFEMSimulation, LENRPresets, LENRSimulationBuilder
from app.physics.electron_screening import calculate_screening_potential
from app.physics.quantum_tunneling import calculate_tunneling_probability, calculate_fusion_rate
from app.physics.casimir_forces import calculate_casimir_effect_in_lattice
from app.physics.quantum_coherence import calculate_coherent_domains, calculate_coherent_tunneling_enhancement
from app.physics.phonon_modes import calculate_phonon_assisted_tunneling

# Set up logger
logger = setup_logger("fem_simulation", "logs/simulation.log")

class FEMSimulationEngine(SimulationEngine):
    """
    FEM-based simulation engine for LENR applications.
    
    This engine implements the SimulationEngine interface and uses
    the FEM solver to perform multiphysics simulations.
    """
    
    def __init__(self, config: SimulationConfig = None):
        """
        Initialize the FEM simulation engine.
        
        Args:
            config: Simulation configuration
        """
        super().__init__(config)
        self.fem_config = FEMConfig(
            element_type=ElementType.LINEAR_TETRAHEDRON,
            physics_type=PhysicsType.MULTIPHYSICS,
            solver_type="direct"
        )
        self.simulation_id = str(uuid.uuid4())
        self.output_dir = "output/fem_results"
        self.result_cache = {}
        
        # Create output directory if it doesn't exist
        os.makedirs(self.output_dir, exist_ok=True)
        
        logger.info(f"Initialized FEM simulation engine with ID {self.simulation_id}")
    
    def initialize(self, domain: SimulationDomain) -> None:
        """
        Initialize the simulation with a domain.
        
        Args:
            domain: Simulation domain
        """
        self.domain = domain
        
        # Map domain to FEM mesh
        logger.info(f"Mapping domain to FEM mesh: {domain.dimensions}")
        self.mesh = self._create_mesh_from_domain(domain)
        
        # Create the LENR simulation
        logger.info("Setting up LENR FEM simulation")
        self.simulation = self._create_simulation(domain)
        
        # Cache simulation properties
        self.sim_properties = {
            "id": self.simulation_id,
            "domain": domain,
            "mesh": self.mesh,
            "start_time": datetime.now().isoformat(),
            "status": "initialized"
        }
        
        logger.info(f"FEM simulation initialized with {self.mesh.num_nodes} nodes, {self.mesh.num_elements} elements")
    
    def _create_mesh_from_domain(self, domain: SimulationDomain) -> MeshData:
        """
        Create a FEM mesh from the simulation domain.
        
        Args:
            domain: Simulation domain
            
        Returns:
            FEM mesh
        """
        # Extract domain dimensions
        dimensions = domain.dimensions
        
        # Get material information from domain properties
        material_type = domain.properties.get("material", "palladium")
        loading_type = domain.properties.get("loading", "deuterium")
        
        # Determine mesh type based on domain geometry
        if domain.geometry == "cylinder":
            # Extract cylinder dimensions
            radius = dimensions[0] / 2
            height = dimensions[1]
            
            # Create cylindrical mesh
            mesh = MeshGenerator.create_cylinder_mesh(
                radius=radius,
                height=height,
                num_radial=max(5, int(radius * 1e10)),  # Scale with size
                num_angular=16,
                num_axial=max(5, int(height * 1e10)),  # Scale with size
                element_type=ElementType.LINEAR_TETRAHEDRON
            )
            
        elif domain.geometry == "rectangle" or domain.geometry == "box":
            # Extract box dimensions
            width = dimensions[0]
            height = dimensions[1]
            depth = dimensions[2] if len(dimensions) > 2 else 0.01  # Default depth if 2D
            
            if depth < 1e-6:  # If very thin, treat as 2D
                # Create 2D mesh
                mesh = MeshGenerator.create_rectangle_mesh(
                    width=width,
                    height=height,
                    nx=max(5, int(width * 1e10)),   # Scale with size
                    ny=max(5, int(height * 1e10)),  # Scale with size
                    element_type=ElementType.LINEAR_TRIANGLE
                )
            else:
                # Create 3D mesh
                mesh = MeshGenerator.create_box_mesh(
                    width=width,
                    height=height,
                    depth=depth,
                    nx=max(5, int(width * 1e10)),   # Scale with size
                    ny=max(5, int(height * 1e10)),  # Scale with size
                    nz=max(5, int(depth * 1e10)),   # Scale with size
                    element_type=ElementType.LINEAR_TETRAHEDRON
                )
                
        elif domain.geometry == "sphere":
            # Extract sphere radius
            radius = dimensions[0]
            
            # Create spherical mesh
            mesh = MeshGenerator.create_sphere_mesh(
                radius=radius,
                num_radial=max(5, int(radius * 1e10)),  # Scale with size
                num_angular=16,
                num_azimuthal=16,
                element_type=ElementType.LINEAR_TETRAHEDRON
            )
            
        else:
            # Default to box mesh with domain bounds
            logger.warning(f"Unsupported geometry {domain.geometry}, defaulting to box mesh")
            mesh = MeshGenerator.create_box_mesh(
                width=domain.bounds[0][1] - domain.bounds[0][0],
                height=domain.bounds[1][1] - domain.bounds[1][0],
                depth=domain.bounds[2][1] - domain.bounds[2][0] if len(domain.bounds) > 2 else 0.01,
                nx=10, ny=10, nz=10,
                element_type=ElementType.LINEAR_TETRAHEDRON
            )
        
        return mesh
    
    def _create_simulation(self, domain: SimulationDomain) -> LENRFEMSimulation:
        """
        Create a LENR FEM simulation from the domain and mesh.
        
        Args:
            domain: Simulation domain
            
        Returns:
            LENR FEM simulation
        """
        # Get material information from domain properties
        material_type = domain.properties.get("material", "palladium")
        loading_type = domain.properties.get("loading", "deuterium")
        
        # Determine preset based on materials
        if material_type.lower() in ["pd", "palladium"] and loading_type.lower() in ["d", "deuterium"]:
            preset = "pd-d"
        elif material_type.lower() in ["ni", "nickel"] and loading_type.lower() in ["h", "hydrogen"]:
            preset = "ni-h"
        elif material_type.lower() in ["ti", "titanium"] and loading_type.lower() in ["d", "deuterium"]:
            preset = "ti-d"
        else:
            # Default to Pd-D
            logger.warning(f"Unsupported material combination: {material_type}-{loading_type}, defaulting to pd-d")
            preset = "pd-d"
        
        # Create the simulation using builder pattern
        simulation = (LENRSimulationBuilder()
            .with_mesh(self.mesh)
            .with_preset(preset)
            .with_config(self.fem_config)
            .build())
        
        # Extract boundary conditions from domain
        self._add_boundary_conditions(simulation, domain)
        
        return simulation
    
    def _add_boundary_conditions(self, simulation: LENRFEMSimulation, domain: SimulationDomain) -> None:
        """
        Add boundary conditions to the simulation based on domain properties.
        
        Args:
            simulation: LENR FEM simulation
            domain: Simulation domain
        """
        from app.physics.fem_solver import BoundaryCondition
        
        # Extract boundary conditions from domain properties
        boundary_conditions = []
        
        # Temperature boundary conditions
        if "temperature" in domain.properties:
            # Get ambient temperature
            ambient_temp = domain.properties.get("temperature", 300.0)
            
            # Get temperature gradient if available
            temp_gradient = domain.properties.get("temperature_gradient", [0, 0, 0])
            
            # Set ambient temperature on the outer boundaries
            if domain.geometry == "cylinder":
                # For cylinder: bottom, top, and side
                boundary_conditions.append(
                    BoundaryCondition(
                        boundary_name="bottom",
                        condition_type="dirichlet",
                        value=ambient_temp - temp_gradient[1] * domain.dimensions[1] / 2
                    )
                )
                
                boundary_conditions.append(
                    BoundaryCondition(
                        boundary_name="top",
                        condition_type="dirichlet",
                        value=ambient_temp + temp_gradient[1] * domain.dimensions[1] / 2
                    )
                )
                
                boundary_conditions.append(
                    BoundaryCondition(
                        boundary_name="side",
                        condition_type="dirichlet",
                        value=ambient_temp
                    )
                )
                
            elif domain.geometry in ["rectangle", "box"]:
                # For box: left, right, bottom, top, front, back
                boundary_conditions.append(
                    BoundaryCondition(
                        boundary_name="left",
                        condition_type="dirichlet",
                        value=ambient_temp - temp_gradient[0] * domain.dimensions[0] / 2
                    )
                )
                
                boundary_conditions.append(
                    BoundaryCondition(
                        boundary_name="right",
                        condition_type="dirichlet",
                        value=ambient_temp + temp_gradient[0] * domain.dimensions[0] / 2
                    )
                )
                
                boundary_conditions.append(
                    BoundaryCondition(
                        boundary_name="bottom",
                        condition_type="dirichlet",
                        value=ambient_temp - temp_gradient[1] * domain.dimensions[1] / 2
                    )
                )
                
                boundary_conditions.append(
                    BoundaryCondition(
                        boundary_name="top",
                        condition_type="dirichlet",
                        value=ambient_temp + temp_gradient[1] * domain.dimensions[1] / 2
                    )
                )
                
                # Add front/back for 3D
                if len(domain.dimensions) > 2 and domain.dimensions[2] > 1e-6:
                    boundary_conditions.append(
                        BoundaryCondition(
                            boundary_name="front",
                            condition_type="dirichlet",
                            value=ambient_temp - temp_gradient[2] * domain.dimensions[2] / 2
                        )
                    )
                    
                    boundary_conditions.append(
                        BoundaryCondition(
                            boundary_name="back",
                            condition_type="dirichlet",
                            value=ambient_temp + temp_gradient[2] * domain.dimensions[2] / 2
                        )
                    )
                    
            elif domain.geometry == "sphere":
                # For sphere: just the outer surface
                boundary_conditions.append(
                    BoundaryCondition(
                        boundary_name="surface",
                        condition_type="dirichlet",
                        value=ambient_temp
                    )
                )
        
        # Apply boundary conditions to the simulation
        simulation.set_boundary_conditions(boundary_conditions)
    
    def run(self) -> Dict[str, Any]:
        """
        Run the simulation and return results.
        
        Returns:
            Dictionary with simulation results
        """
        logger.info("Starting FEM simulation")
        start_time = time.time()
        
        # Update status
        self.sim_properties["status"] = "running"
        
        try:
            # Run thermal simulation first
            logger.info("Running thermal simulation")
            temperature = self.simulation.run_thermal_simulation()
            
            # Calculate LENR physics
            logger.info("Calculating LENR physics")
            self.simulation._calculate_lenr_physics()
            
            # Calculate reaction rate
            logger.info("Calculating total reaction rate and power")
            total_fusion_rate = self.simulation.calculate_total_fusion_rate()
            total_power = self.simulation.calculate_total_power()
            
            # Export results to VTK for visualization
            vtk_filename = os.path.join(self.output_dir, f"fem_sim_{self.simulation_id[:8]}")
            logger.info(f"Exporting results to {vtk_filename}.vtk")
            self.simulation.visualize_results(vtk_filename)
            
            # Process and structure the results
            results = self._process_results()
            
            # Update status
            elapsed_time = time.time() - start_time
            self.sim_properties["status"] = "completed"
            self.sim_properties["elapsed_time"] = elapsed_time
            self.sim_properties["total_fusion_rate"] = total_fusion_rate
            self.sim_properties["total_power"] = total_power
            
            logger.info(f"FEM simulation completed in {elapsed_time:.3f} seconds")
            logger.info(f"Total fusion rate: {total_fusion_rate:.2e} fusions/s, total power: {total_power:.2e} W")
            
            return results
            
        except Exception as e:
            logger.error(f"Error during FEM simulation: {str(e)}")
            self.sim_properties["status"] = "error"
            self.sim_properties["error"] = str(e)
            
            # Return partial results if available
            return self._process_results()
    
    def _process_results(self) -> Dict[str, Any]:
        """
        Process simulation results into a structured format.
        
        Returns:
            Dictionary with processed results
        """
        # Extract available results from the simulation
        results = {
            "simulation_id": self.simulation_id,
            "status": self.sim_properties["status"],
            "vtk_file": os.path.join(self.output_dir, f"fem_sim_{self.simulation_id[:8]}.vtk"),
            "metadata": {
                "start_time": self.sim_properties.get("start_time"),
                "elapsed_time": self.sim_properties.get("elapsed_time"),
                "domain_geometry": self.domain.geometry,
                "domain_dimensions": self.domain.dimensions,
                "num_nodes": self.mesh.num_nodes,
                "num_elements": self.mesh.num_elements
            }
        }
        
        # Add temperature field statistics if available
        if hasattr(self.simulation, "temperature") and self.simulation.temperature is not None:
            temp = self.simulation.temperature
            results["temperature"] = {
                "min": float(np.min(temp)),
                "max": float(np.max(temp)),
                "mean": float(np.mean(temp)),
                "std": float(np.std(temp))
            }
        
        # Add fusion rate statistics if available
        if hasattr(self.simulation, "fusion_rate") and self.simulation.fusion_rate is not None:
            fusion = self.simulation.fusion_rate
            results["fusion_rate"] = {
                "total": float(np.sum(fusion)),
                "max": float(np.max(fusion)),
                "mean": float(np.mean(fusion)),
                "std": float(np.std(fusion))
            }
        
        # Add power statistics if available
        if hasattr(self.simulation, "power_density") and self.simulation.power_density is not None:
            power = self.simulation.power_density
            results["power"] = {
                "total": float(np.sum(power)),
                "max": float(np.max(power)),
                "mean": float(np.mean(power)),
                "std": float(np.std(power)),
                "cop": float(np.sum(power) / max(1e-10, self.domain.properties.get("input_power", 1.0)))
            }
        
        # Add screening potential if available
        if hasattr(self.simulation, "screening_potential") and self.simulation.screening_potential is not None:
            screening = self.simulation.screening_potential
            results["screening_potential"] = {
                "min": float(np.min(screening)),
                "max": float(np.max(screening)),
                "mean": float(np.mean(screening))
            }
        
        # Add tunneling probability if available
        if hasattr(self.simulation, "tunneling_probability") and self.simulation.tunneling_probability is not None:
            tunneling = self.simulation.tunneling_probability
            results["tunneling_probability"] = {
                "min": float(np.min(tunneling)),
                "max": float(np.max(tunneling)),
                "mean": float(np.mean(tunneling))
            }
        
        return results
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get the current status of the simulation.
        
        Returns:
            Dictionary with simulation status
        """
        return {
            "simulation_id": self.simulation_id,
            "status": self.sim_properties.get("status", "unknown"),
            "start_time": self.sim_properties.get("start_time"),
            "elapsed_time": self.sim_properties.get("elapsed_time"),
            "domain": str(self.domain) if hasattr(self, "domain") else None,
            "mesh_nodes": self.mesh.num_nodes if hasattr(self, "mesh") else 0,
            "mesh_elements": self.mesh.num_elements if hasattr(self, "mesh") else 0
        }
    
    def get_results(self) -> Dict[str, Any]:
        """
        Get the current simulation results.
        
        Returns:
            Dictionary with simulation results
        """
        return self._process_results()
    
    def cleanup(self) -> None:
        """
        Clean up resources used by the simulation.
        """
        # Free memory used by large arrays
        if hasattr(self, "simulation"):
            if hasattr(self.simulation, "temperature"):
                self.simulation.temperature = None
            if hasattr(self.simulation, "fusion_rate"):
                self.simulation.fusion_rate = None
            if hasattr(self.simulation, "power_density"):
                self.simulation.power_density = None
            
        # Clear the mesh
        if hasattr(self, "mesh"):
            self.mesh = None
            
        logger.info(f"Cleaned up resources for simulation {self.simulation_id}")


def create_fem_engine(config: SimulationConfig = None) -> FEMSimulationEngine:
    """
    Factory function to create a FEM simulation engine.
    
    Args:
        config: Simulation configuration
        
    Returns:
        FEM simulation engine
    """
    return FEMSimulationEngine(config) 