"""
FEM-based LENR Physics Simulation Module

This module integrates the FEM solver with LENR-specific physics, including:
1. Casimir forces
2. Electron screening effects
3. Quantum coherence and tunneling
4. Lattice-assisted nuclear reactions
5. Phonon-mediated fusion

The module enables multiphysics coupling between these phenomena to 
accurately simulate low energy nuclear reactions in various materials.
"""

import numpy as np
import scipy.sparse as sp
import scipy.sparse.linalg as spla
from typing import Dict, List, Tuple, Optional, Union, Callable, Any
import logging
import time
from dataclasses import dataclass, field

from app.utils.logging import setup_logger
from app.physics.fem_solver import FEMSolver, MeshData, ElementType, PhysicsType, Material, BoundaryCondition, FEMConfig
from app.physics.casimir_forces import calculate_casimir_force
from app.physics.electron_screening import calculate_screening_potential
from app.physics.quantum_tunneling import calculate_tunneling_probability
from app.physics.quantum_coherence import calculate_coherence_length
from app.physics.phonon_modes import calculate_phonon_spectrum

# Set up logger
logger = setup_logger("fem_lenr", "logs/simulation.log")

@dataclass
class LENRMaterialProperties:
    """Data class for LENR-specific material properties"""
    # Basic material properties
    name: str
    density: float  # kg/m³
    atomic_mass: float  # u (atomic mass units)
    atomic_number: float  # Z
    
    # Thermal properties
    thermal_conductivity: float  # W/(m·K)
    specific_heat: float  # J/(kg·K)
    
    # Electromagnetic properties
    electrical_conductivity: float  # S/m
    relative_permittivity: float  # ε_r
    relative_permeability: float  # μ_r
    
    # LENR-specific properties
    work_function: float  # eV (for electron screening)
    lattice_constant: float  # m
    debye_temperature: float  # K
    fermi_energy: float  # eV
    
    # Derived materials or inclusions
    inclusions: Dict[str, 'LENRMaterialProperties'] = field(default_factory=dict)
    inclusion_concentration: Dict[str, float] = field(default_factory=dict)

class LENRPresets:
    """
    Preset configurations for common LENR materials and scenarios.
    Provides factory methods for creating consistent simulation setups.
    """
    
    @staticmethod
    def palladium_deuterium() -> Dict[str, LENRMaterialProperties]:
        """
        Create a preset for palladium with deuterium loading.
        
        Returns:
            Dictionary of material properties for Pd-D system
        """
        # Palladium host material
        palladium = LENRMaterialProperties(
            name="Palladium",
            density=12023.0,  # kg/m³
            atomic_mass=106.42,  # u
            atomic_number=46.0,  # Z
            thermal_conductivity=71.8,  # W/(m·K)
            specific_heat=240.0,  # J/(kg·K)
            electrical_conductivity=9.5e6,  # S/m
            relative_permittivity=1.0,  # ε_r (approximately)
            relative_permeability=1.0,  # μ_r (approximately)
            work_function=5.12,  # eV
            lattice_constant=3.89e-10,  # m (FCC)
            debye_temperature=275.0,  # K
            fermi_energy=7.0,  # eV
            inclusions={},
            inclusion_concentration={}
        )
        
        # Deuterium (treated as inclusion)
        deuterium = LENRMaterialProperties(
            name="Deuterium",
            density=0.180,  # kg/m³ at STP
            atomic_mass=2.014,  # u
            atomic_number=1.0,  # Z
            thermal_conductivity=0.170,  # W/(m·K) at STP
            specific_heat=14304.0,  # J/(kg·K)
            electrical_conductivity=0.0,  # S/m (non-conductive)
            relative_permittivity=1.0,  # ε_r
            relative_permeability=1.0,  # μ_r
            work_function=0.0,  # eV (not applicable)
            lattice_constant=0.0,  # m (not applicable)
            debye_temperature=0.0,  # K (not applicable)
            fermi_energy=0.0,  # eV (not applicable)
            inclusions={},
            inclusion_concentration={}
        )
        
        # Add deuterium as inclusion to palladium
        palladium.inclusions["Deuterium"] = deuterium
        palladium.inclusion_concentration["Deuterium"] = 0.7  # D/Pd ratio = 0.7
        
        return {"Palladium": palladium, "Deuterium": deuterium}
    
    @staticmethod
    def nickel_hydrogen() -> Dict[str, LENRMaterialProperties]:
        """
        Create a preset for nickel with hydrogen loading.
        
        Returns:
            Dictionary of material properties for Ni-H system
        """
        # Nickel host material
        nickel = LENRMaterialProperties(
            name="Nickel",
            density=8908.0,  # kg/m³
            atomic_mass=58.69,  # u
            atomic_number=28.0,  # Z
            thermal_conductivity=90.9,  # W/(m·K)
            specific_heat=440.0,  # J/(kg·K)
            electrical_conductivity=1.4e7,  # S/m
            relative_permittivity=1.0,  # ε_r
            relative_permeability=600.0,  # μ_r (ferromagnetic)
            work_function=5.15,  # eV
            lattice_constant=3.52e-10,  # m (FCC)
            debye_temperature=450.0,  # K
            fermi_energy=5.0,  # eV
            inclusions={},
            inclusion_concentration={}
        )
        
        # Hydrogen (treated as inclusion)
        hydrogen = LENRMaterialProperties(
            name="Hydrogen",
            density=0.090,  # kg/m³ at STP
            atomic_mass=1.008,  # u
            atomic_number=1.0,  # Z
            thermal_conductivity=0.180,  # W/(m·K) at STP
            specific_heat=14300.0,  # J/(kg·K)
            electrical_conductivity=0.0,  # S/m (non-conductive)
            relative_permittivity=1.0,  # ε_r
            relative_permeability=1.0,  # μ_r
            work_function=0.0,  # eV (not applicable)
            lattice_constant=0.0,  # m (not applicable)
            debye_temperature=0.0,  # K (not applicable)
            fermi_energy=0.0,  # eV (not applicable)
            inclusions={},
            inclusion_concentration={}
        )
        
        # Add hydrogen as inclusion to nickel
        nickel.inclusions["Hydrogen"] = hydrogen
        nickel.inclusion_concentration["Hydrogen"] = 0.8  # H/Ni ratio = 0.8
        
        return {"Nickel": nickel, "Hydrogen": hydrogen}

class LENRFEMSimulation:
    """
    Integrated FEM-based simulation for LENR systems.
    Combines multiphysics FEM solver with LENR-specific physics models.
    """
    
    def __init__(
        self,
        mesh: MeshData,
        materials: Dict[str, LENRMaterialProperties],
        config: Optional[FEMConfig] = None
    ):
        """
        Initialize the LENR FEM simulation.
        
        Args:
            mesh: Mesh data for the simulation
            materials: Dictionary of LENR material properties
            config: FEM solver configuration
        """
        self.mesh = mesh
        self.lenr_materials = materials
        
        # Use multiphysics by default
        if config is None:
            config = FEMConfig(physics_type=PhysicsType.MULTIPHYSICS)
        
        self.config = config
        
        # Create the FEM solver
        self.solver = FEMSolver(mesh, config)
        
        # Set up material properties for FEM solver
        self._setup_materials()
        
        # Storage for simulation results
        self.temperature = None
        self.displacements = None
        self.electric_potential = None
        self.deuterium_concentration = None
        
        # Storage for LENR-specific results
        self.screening_potential = None
        self.tunneling_probability = None
        self.fusion_rate = None
        self.power_density = None
        
        logger.info(f"Created LENR FEM simulation with {len(materials)} materials")
    
    def _setup_materials(self):
        """Set up materials for the FEM solver based on LENR properties"""
        for name, lenr_mat in self.lenr_materials.items():
            # Create material properties dictionary for FEM solver
            properties = {
                # Thermal properties
                'thermal_conductivity': lenr_mat.thermal_conductivity,
                'density': lenr_mat.density,
                'specific_heat': lenr_mat.specific_heat,
                
                # Electromagnetic properties
                'electrical_conductivity': lenr_mat.electrical_conductivity,
                'relative_permittivity': lenr_mat.relative_permittivity,
                'relative_permeability': lenr_mat.relative_permeability,
                
                # Mechanical properties (simple linear elastic properties)
                'youngs_modulus': 200e9,  # Pa (default value)
                'poisson_ratio': 0.3,  # dimensionless (default value)
                
                # Additional LENR properties
                'work_function': lenr_mat.work_function,
                'lattice_constant': lenr_mat.lattice_constant,
                'atomic_number': lenr_mat.atomic_number,
                'atomic_mass': lenr_mat.atomic_mass
            }
            
            # Create and add material to FEM solver
            material = Material(name, properties)
            
            # Associate material with appropriate elements
            # (typically by element marker names matching material names)
            if name in self.mesh.element_markers:
                self.solver.add_material(material, name)
            else:
                logger.warning(f"Material {name} has no corresponding element marker in mesh")
    
    def set_boundary_conditions(self, boundary_conditions: List[BoundaryCondition]):
        """
        Set boundary conditions for the simulation.
        
        Args:
            boundary_conditions: List of boundary conditions to apply
        """
        for bc in boundary_conditions:
            self.solver.add_boundary_condition(bc)
        
        logger.info(f"Added {len(boundary_conditions)} boundary conditions")
    
    def run_thermal_simulation(self):
        """
        Run a thermal-only simulation to get the temperature distribution.
        
        Returns:
            Temperature distribution (nodal values)
        """
        # Create thermal-only configuration
        thermal_config = FEMConfig(
            element_type=self.config.element_type,
            physics_type=PhysicsType.THERMAL,
            solver_tolerance=self.config.solver_tolerance,
            max_iterations=self.config.max_iterations,
            solver_type=self.config.solver_type
        )
        
        # Create thermal solver
        thermal_solver = FEMSolver(self.mesh, thermal_config)
        
        # Set up materials for thermal simulation
        for name, mat in self.solver.materials.items():
            thermal_solver.add_material(mat, self.solver.element_material_map[name])
        
        # Set up thermal boundary conditions
        for bc in self.solver.boundary_conditions:
            thermal_solver.add_boundary_condition(bc)
        
        # Run the solver
        thermal_solver.solve()
        
        # Extract temperature field
        self.temperature = thermal_solver.get_nodal_solution()
        
        # Calculate heat fluxes and other quantities
        heat_flux = thermal_solver.get_derived_quantity('temperature_gradient') if 'temperature_gradient' in thermal_solver.derived_quantities else None
        
        return self.temperature
    
    def run_coupled_simulation(self):
        """
        Run full coupled multiphysics simulation including all LENR phenomena.
        This is the main method to use for comprehensive LENR simulations.
        
        Returns:
            Dictionary of simulation results
        """
        # Run the multiphysics FEM solution
        self.solver.solve()
        
        # Extract primary fields from the solution
        if self.config.physics_type == PhysicsType.MULTIPHYSICS:
            # Extract individual fields from the combined solution
            # The exact approach depends on how the fields are organized
            # in the multiphysics solver
            logger.info("Extracting fields from multiphysics solution")
            
            # This is a placeholder - the actual implementation would depend
            # on the specific DOF mapping used in the multiphysics solver
            nodal_solution = self.solver.get_nodal_solution()
            
            # Process and store results
            self._process_fem_results()
            
            # Calculate LENR-specific quantities
            self._calculate_lenr_physics()
        else:
            logger.warning("Not running in multiphysics mode, results may be incomplete")
            # Just solve the single physics problem
            self.solver.solve()
        
        # Return a dictionary of results
        return {
            'temperature': self.temperature,
            'electric_potential': self.electric_potential,
            'displacements': self.displacements,
            'deuterium_concentration': self.deuterium_concentration,
            'screening_potential': self.screening_potential,
            'tunneling_probability': self.tunneling_probability,
            'fusion_rate': self.fusion_rate,
            'power_density': self.power_density
        }
    
    def _process_fem_results(self):
        """Process and organize FEM results into physical fields"""
        # Extract results from the FEM solution
        # This is just a placeholder - actual implementation would depend
        # on the specific DOF mapping used in the multiphysics solver
        
        # Extract temperature field (assuming it's stored in the solver)
        if 'temperature' in self.solver.derived_quantities:
            self.temperature = self.solver.derived_quantities['temperature']
        
        # Extract electric potential field
        if 'electric_potential' in self.solver.derived_quantities:
            self.electric_potential = self.solver.derived_quantities['electric_potential']
        
        # Extract displacements field
        if 'displacements' in self.solver.derived_quantities:
            self.displacements = self.solver.derived_quantities['displacements']
        
        # Extract deuterium concentration field
        if 'concentration' in self.solver.derived_quantities:
            self.deuterium_concentration = self.solver.derived_quantities['concentration']
    
    def _calculate_lenr_physics(self):
        """Calculate LENR-specific physics based on FEM results"""
        if self.temperature is None:
            logger.warning("Temperature field not available, can't calculate LENR physics")
            return
        
        # Initialize arrays for LENR quantities
        num_nodes = self.mesh.num_nodes
        self.screening_potential = np.zeros(num_nodes)
        self.tunneling_probability = np.zeros(num_nodes)
        self.fusion_rate = np.zeros(num_nodes)
        self.power_density = np.zeros(num_nodes)
        
        # Loop over nodes to calculate local LENR physics
        for i in range(num_nodes):
            # Get local temperature
            T = self.temperature[i]
            
            # Get material properties at this node (simplified - in reality
            # would need to determine which element contains this node)
            # Just using the first material for demonstration
            material_name = list(self.lenr_materials.keys())[0]
            material = self.lenr_materials[material_name]
            
            # Calculate screening potential using electron screening model
            # (using a placeholder value for electron density)
            electron_density = 1e29  # electrons/m³ (typical for metals)
            
            try:
                self.screening_potential[i] = calculate_screening_potential(
                    electron_density,
                    material.work_function,
                    T
                )
            except Exception as e:
                logger.error(f"Error calculating screening potential: {e}")
                self.screening_potential[i] = 0.0
            
            # Calculate tunneling probability
            # Assuming deuterium-deuterium fusion for simplicity
            # (would need to check actual materials present)
            try:
                self.tunneling_probability[i] = calculate_tunneling_probability(
                    2, 2,  # Z1, Z2 (D-D)
                    2.01, 2.01,  # A1, A2 (masses in u)
                    T,
                    self.screening_potential[i]
                )
            except Exception as e:
                logger.error(f"Error calculating tunneling probability: {e}")
                self.tunneling_probability[i] = 0.0
            
            # Calculate fusion rate (simplified model)
            # Assuming some deuterium concentration
            deuterium_conc = 1e22  # atoms/cm³ (typical for loaded Pd)
            if self.deuterium_concentration is not None:
                deuterium_conc = self.deuterium_concentration[i]
            
            # Simple model: rate ~ n_D^2 * tunneling_probability
            self.fusion_rate[i] = deuterium_conc**2 * self.tunneling_probability[i]
            
            # Calculate power density (energy per fusion * rate)
            # D-D fusion releases about 3.27 MeV
            energy_per_fusion = 3.27e6 * 1.602e-19  # J/fusion
            self.power_density[i] = energy_per_fusion * self.fusion_rate[i]
        
        logger.info("Calculated LENR physics quantities from FEM results")
    
    def visualize_results(self, filename: str):
        """
        Export simulation results for visualization.
        
        Args:
            filename: Base filename for VTK output
        """
        try:
            import pyvista as pv
            
            # Create PyVista grid from mesh
            points = self.mesh.nodes
            cells = []
            cell_types = []
            
            for element in self.mesh.elements:
                cells.append(len(element))
                cells.extend(element)
                
                # Determine cell type based on element
                if len(element) == 3:  # Triangle
                    cell_types.append(5)  # VTK_TRIANGLE
                elif len(element) == 4 and points.shape[1] == 2:  # Quad
                    cell_types.append(9)  # VTK_QUAD
                elif len(element) == 4 and points.shape[1] == 3:  # Tetrahedron
                    cell_types.append(10)  # VTK_TETRA
                elif len(element) == 8:  # Hexahedron
                    cell_types.append(12)  # VTK_HEXAHEDRON
            
            grid = pv.UnstructuredGrid(cells, cell_types, points)
            
            # Add result fields as point data
            if self.temperature is not None:
                grid.point_data["Temperature"] = self.temperature
            
            if self.electric_potential is not None:
                grid.point_data["ElectricPotential"] = self.electric_potential
            
            if self.screening_potential is not None:
                grid.point_data["ScreeningPotential"] = self.screening_potential
            
            if self.tunneling_probability is not None:
                grid.point_data["TunnelingProbability"] = self.tunneling_probability
            
            if self.fusion_rate is not None:
                grid.point_data["FusionRate"] = self.fusion_rate
            
            if self.power_density is not None:
                grid.point_data["PowerDensity"] = self.power_density
            
            # Save to VTK file
            grid.save(f"{filename}.vtk")
            logger.info(f"Exported results to {filename}.vtk")
            
        except ImportError:
            logger.warning("PyVista not available, cannot export visualization")

class LENRSimulationBuilder:
    """
    Builder class to simplify the creation of LENR simulations.
    Uses a fluent interface for setting up simulations.
    """
    
    def __init__(self):
        """Initialize the builder with default values"""
        self.mesh = None
        self.materials = {}
        self.config = FEMConfig(physics_type=PhysicsType.MULTIPHYSICS)
        self.boundary_conditions = []
    
    def with_mesh(self, mesh: MeshData):
        """Set the mesh for the simulation"""
        self.mesh = mesh
        return self
    
    def with_config(self, config: FEMConfig):
        """Set the FEM configuration"""
        self.config = config
        return self
    
    def with_material(self, material: LENRMaterialProperties, marker: str):
        """Add a material with associated element marker"""
        self.materials[material.name] = material
        return self
    
    def with_preset(self, preset_name: str):
        """Use a preset material configuration"""
        if preset_name.lower() == "pd-d":
            self.materials = LENRPresets.palladium_deuterium()
        elif preset_name.lower() == "ni-h":
            self.materials = LENRPresets.nickel_hydrogen()
        else:
            logger.warning(f"Unknown preset: {preset_name}")
        return self
    
    def with_boundary_condition(self, bc: BoundaryCondition):
        """Add a boundary condition"""
        self.boundary_conditions.append(bc)
        return self
    
    def build(self) -> LENRFEMSimulation:
        """Build and return the simulation object"""
        if self.mesh is None:
            raise ValueError("Mesh is required")
        
        if not self.materials:
            raise ValueError("At least one material is required")
        
        # Create the simulation
        sim = LENRFEMSimulation(self.mesh, self.materials, self.config)
        
        # Set boundary conditions
        sim.set_boundary_conditions(self.boundary_conditions)
        
        return sim 