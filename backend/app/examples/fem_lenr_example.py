"""
FEM-based LENR Example

This example demonstrates how to set up and run a FEM-based LENR simulation
for a Palladium-Deuterium system. It includes:
1. Setting up the mesh
2. Defining materials
3. Setting boundary conditions
4. Running the simulation
5. Visualizing the results
"""

import numpy as np
import os
import time
import matplotlib.pyplot as plt
import logging

from app.utils.logging import setup_logger
from app.physics.fem_solver import FEMSolver, MeshData, ElementType, PhysicsType, Material, BoundaryCondition, FEMConfig
from app.physics.fem_mesh import MeshGenerator
from app.physics.fem_lenr import LENRFEMSimulation, LENRPresets, LENRSimulationBuilder

# Set up logger
logger = setup_logger("fem_example", "logs/simulation.log")

def run_pd_d_cylinder_example():
    """
    Run a LENR simulation for a palladium cylinder loaded with deuterium.
    Simulates heating the cylinder and observes the resulting LENR effects.
    """
    logger.info("Starting Pd-D cylinder LENR simulation example")
    
    # 1. Create a cylindrical mesh
    radius = 0.01  # 1 cm radius
    height = 0.03  # 3 cm height
    
    logger.info(f"Creating cylindrical mesh with radius={radius}m, height={height}m")
    mesh = MeshGenerator.create_cylinder_mesh(
        radius=radius,
        height=height,
        num_radial=10,
        num_angular=16,
        num_axial=15,
        element_type=ElementType.LINEAR_TETRAHEDRON
    )
    logger.info(f"Created mesh with {mesh.num_nodes} nodes and {mesh.num_elements} elements")
    
    # 2. Set up simulation with Pd-D materials
    # Using the builder pattern for cleaner setup
    logger.info("Setting up LENR simulation with Pd-D materials")
    simulation = (LENRSimulationBuilder()
        .with_mesh(mesh)
        .with_preset("pd-d")  # Use predefined Pd-D material properties
        .with_config(FEMConfig(
            element_type=ElementType.LINEAR_TETRAHEDRON,
            physics_type=PhysicsType.THERMAL,  # Start with thermal-only for simplicity
            solver_type="direct"
        ))
        .build())
    
    # 3. Add boundary conditions
    logger.info("Adding boundary conditions")
    
    # Bottom face fixed at room temperature
    bottom_temp_bc = BoundaryCondition(
        boundary_name="bottom",
        condition_type="dirichlet",
        value=293.15  # 20°C in Kelvin
    )
    
    # Side face with convective cooling
    # For thermal problems, Robin BC: -k∇T·n = h(T - T_∞)
    # Not fully implemented yet, using a simplified Dirichlet BC instead
    side_temp_bc = BoundaryCondition(
        boundary_name="side",
        condition_type="dirichlet",
        value=313.15  # 40°C in Kelvin
    )
    
    # Top face with heat input (elevated temperature)
    top_temp_bc = BoundaryCondition(
        boundary_name="top",
        condition_type="dirichlet",
        value=373.15  # 100°C in Kelvin
    )
    
    # Add boundary conditions to simulation
    simulation.set_boundary_conditions([bottom_temp_bc, side_temp_bc, top_temp_bc])
    
    # 4. Run the simulation
    logger.info("Running thermal simulation")
    start_time = time.time()
    
    # First run a thermal-only simulation to get the temperature distribution
    temperature = simulation.run_thermal_simulation()
    
    elapsed_time = time.time() - start_time
    logger.info(f"Simulation completed in {elapsed_time:.3f} seconds")
    
    # 5. Calculate LENR-specific quantities based on the temperature field
    logger.info("Calculating LENR physics")
    simulation._calculate_lenr_physics()
    
    # 6. Export results for visualization
    output_dir = "output/fem_results"
    os.makedirs(output_dir, exist_ok=True)
    
    vtk_filename = os.path.join(output_dir, "pd_d_cylinder")
    logger.info(f"Exporting results to {vtk_filename}.vtk")
    simulation.visualize_results(vtk_filename)
    
    # 7. Print some summary statistics
    print_summary_statistics(simulation)
    
    return simulation

def run_pd_d_lattice_example():
    """
    Run a more complex LENR simulation with a palladium lattice with
    deuterium inclusions for more detailed analysis of LENR effects.
    """
    logger.info("Starting Pd-D lattice LENR simulation example")
    
    # 1. Create a lattice mesh with inclusions
    width = 100e-9  # 100 nm
    height = 100e-9  # 100 nm
    depth = 100e-9  # 100 nm
    lattice_constant = 3.89e-10  # Pd lattice constant (3.89 Angstroms)
    
    # Create some deuterium inclusion positions
    # (typically at octahedral or tetrahedral interstitial sites)
    inclusion_positions = []
    n_inclusions = 20
    
    # Randomly place inclusions for this example
    np.random.seed(42)  # For reproducibility
    for _ in range(n_inclusions):
        x = np.random.uniform(0, width)
        y = np.random.uniform(0, height)
        z = np.random.uniform(0, depth)
        inclusion_positions.append((x, y, z))
    
    logger.info(f"Creating nanoscale Pd lattice mesh with {n_inclusions} deuterium clusters")
    mesh = MeshGenerator.create_lenr_lattice_mesh(
        width=width,
        height=height,
        depth=depth,
        lattice_constant=lattice_constant,
        inclusion_positions=inclusion_positions,
        inclusion_radius=lattice_constant * 2,  # Two lattice constants
        resolution=width/20,  # 20 elements across width
        element_type=ElementType.LINEAR_TETRAHEDRON
    )
    logger.info(f"Created mesh with {mesh.num_nodes} nodes and {mesh.num_elements} elements")
    
    # 2. Set up simulation with Pd-D materials
    logger.info("Setting up multiphysics LENR simulation with Pd-D materials")
    simulation = (LENRSimulationBuilder()
        .with_mesh(mesh)
        .with_preset("pd-d")  # Use predefined Pd-D material properties
        .with_config(FEMConfig(
            element_type=ElementType.LINEAR_TETRAHEDRON,
            physics_type=PhysicsType.MULTIPHYSICS,
            solver_type="direct"
        ))
        .build())
    
    # 3. Add boundary conditions
    logger.info("Adding boundary conditions")
    
    # Temperature boundary conditions
    temp_bc_left = BoundaryCondition(
        boundary_name="left",
        condition_type="dirichlet",
        value=323.15  # 50°C in Kelvin
    )
    
    temp_bc_right = BoundaryCondition(
        boundary_name="right",
        condition_type="dirichlet",
        value=373.15  # 100°C in Kelvin
    )
    
    # Other faces are insulated (zero heat flux) - this is the default
    
    # Add boundary conditions to simulation
    simulation.set_boundary_conditions([temp_bc_left, temp_bc_right])
    
    # 4. Run the simulation
    logger.info("Running coupled LENR simulation")
    start_time = time.time()
    
    # Run the full coupled simulation
    results = simulation.run_coupled_simulation()
    
    elapsed_time = time.time() - start_time
    logger.info(f"Simulation completed in {elapsed_time:.3f} seconds")
    
    # 5. Export results for visualization
    output_dir = "output/fem_results"
    os.makedirs(output_dir, exist_ok=True)
    
    vtk_filename = os.path.join(output_dir, "pd_d_lattice")
    logger.info(f"Exporting results to {vtk_filename}.vtk")
    simulation.visualize_results(vtk_filename)
    
    # 6. Print some summary statistics
    print_summary_statistics(simulation)
    
    return simulation

def print_summary_statistics(simulation):
    """Print summary statistics of the simulation results"""
    # Temperature statistics
    if simulation.temperature is not None:
        min_temp = np.min(simulation.temperature)
        max_temp = np.max(simulation.temperature)
        avg_temp = np.mean(simulation.temperature)
        logger.info(f"Temperature: min={min_temp:.2f}K, max={max_temp:.2f}K, avg={avg_temp:.2f}K")
    
    # Fusion rate statistics
    if simulation.fusion_rate is not None:
        total_fusion_rate = np.sum(simulation.fusion_rate)
        max_fusion_rate = np.max(simulation.fusion_rate)
        logger.info(f"Fusion rate: max={max_fusion_rate:.2e} fusions/s, total={total_fusion_rate:.2e} fusions/s")
    
    # Power density statistics
    if simulation.power_density is not None:
        total_power = np.sum(simulation.power_density)
        max_power_density = np.max(simulation.power_density)
        logger.info(f"Power: max density={max_power_density:.2e} W/m³, total={total_power:.2e} W")
    
    # Tunneling probability statistics
    if simulation.tunneling_probability is not None:
        max_tunneling_prob = np.max(simulation.tunneling_probability)
        avg_tunneling_prob = np.mean(simulation.tunneling_probability)
        logger.info(f"Tunneling probability: max={max_tunneling_prob:.2e}, avg={avg_tunneling_prob:.2e}")

def plot_results(simulation):
    """Create some plots of the simulation results"""
    # This is a simplified visualization - for better visualization,
    # use the VTK output with a tool like ParaView
    
    if simulation.temperature is None:
        logger.warning("No temperature data to plot")
        return
    
    # Create figure with subplots
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))
    
    # Plot temperature histogram
    axes[0, 0].hist(simulation.temperature, bins=30)
    axes[0, 0].set_xlabel('Temperature (K)')
    axes[0, 0].set_ylabel('Count')
    axes[0, 0].set_title('Temperature Distribution')
    
    # Plot power density histogram (if available)
    if simulation.power_density is not None:
        power_density_nonzero = simulation.power_density[simulation.power_density > 0]
        if len(power_density_nonzero) > 0:
            axes[0, 1].hist(np.log10(power_density_nonzero + 1e-20), bins=30)
            axes[0, 1].set_xlabel('log10(Power Density) (W/m³)')
            axes[0, 1].set_ylabel('Count')
            axes[0, 1].set_title('Power Density Distribution')
    
    # Plot tunneling probability vs. temperature (if available)
    if simulation.tunneling_probability is not None:
        axes[1, 0].scatter(simulation.temperature, simulation.tunneling_probability, alpha=0.5, s=1)
        axes[1, 0].set_xlabel('Temperature (K)')
        axes[1, 0].set_ylabel('Tunneling Probability')
        axes[1, 0].set_title('Tunneling Probability vs Temperature')
        axes[1, 0].set_yscale('log')
    
    # Plot fusion rate vs. temperature (if available)
    if simulation.fusion_rate is not None:
        axes[1, 1].scatter(simulation.temperature, simulation.fusion_rate, alpha=0.5, s=1)
        axes[1, 1].set_xlabel('Temperature (K)')
        axes[1, 1].set_ylabel('Fusion Rate (fusions/s)')
        axes[1, 1].set_title('Fusion Rate vs Temperature')
        axes[1, 1].set_yscale('log')
    
    # Save the figure
    output_dir = "output/fem_results"
    os.makedirs(output_dir, exist_ok=True)
    plt.tight_layout()
    plt.savefig(os.path.join(output_dir, 'lenr_simulation_results.png'), dpi=300)
    plt.close()

if __name__ == "__main__":
    # Run the simple cylinder example
    sim1 = run_pd_d_cylinder_example()
    plot_results(sim1)
    
    # Run the more complex lattice example
    # Note: This is more computationally intensive
    # sim2 = run_pd_d_lattice_example()
    # plot_results(sim2) 