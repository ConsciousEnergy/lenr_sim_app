"""
Multi-Physics Coupling Test Module

This module provides an example of how to use the Multi-Physics Coupling Interface
to simulate coupled nuclear and thermal processes in a LENR simulation.
"""

import numpy as np
import matplotlib.pyplot as plt
import time
import logging
import os
import json
from typing import Dict, Any, List, Tuple

from app.simulation.domain import SimulationDomain
from app.utils.logging import setup_logger

from .domain_manager import PhysicsDomainManager
from .nuclear_domain import NuclearDomain
from .thermal_domain import ThermalDomain
from .domain_coupler import DomainCoupler
from .visualization_hooks import default_hooks, VisualizationEventType, VisualizationEventListener, VisualizationEvent
from .visualization_utils import extract_slice, compute_temperature_gradient, compute_heat_flux

# Set up logger
logger = setup_logger("multi_physics_test", "logs/simulation.log")


class DataCollectorListener(VisualizationEventListener):
    """
    Event listener that collects data from visualization events for later analysis.
    """
    
    def __init__(self):
        """Initialize the data collector."""
        self.events = []
        self.domain_data = {}
        self.times = []
        self.max_temperatures = []
        self.mean_reaction_rates = []
        self.performance_data = []
    
    def on_event(self, event: VisualizationEvent) -> None:
        """Handle visualization events."""
        # Store the event
        self.events.append(event)
        
        # Process specific events
        if event.event_type == VisualizationEventType.DOMAIN_STATE_CHANGED:
            # Store domain data
            domain_name = event.source
            if domain_name not in self.domain_data:
                self.domain_data[domain_name] = []
            
            self.domain_data[domain_name].append({
                "time": event.data["simulation_time"],
                "data": event.data["data"]
            })
            
            # Extract key metrics
            if domain_name == "thermal" and "temperature" in event.data["data"]:
                temp_data = event.data["data"]["temperature"]
                if "statistics" in temp_data:
                    self.max_temperatures.append((
                        event.data["simulation_time"],
                        temp_data["statistics"]["max"]
                    ))
            
            if domain_name == "nuclear" and "reaction_rate_d-d" in event.data["data"]:
                rate_data = event.data["data"]["reaction_rate_d-d"]
                if "statistics" in rate_data:
                    self.mean_reaction_rates.append((
                        event.data["simulation_time"],
                        rate_data["statistics"]["mean"]
                    ))
        
        elif event.event_type == VisualizationEventType.SIMULATION_STEP_COMPLETED:
            # Store performance data
            self.performance_data.append({
                "time": event.data["simulation_time"],
                "compute_time": event.data["compute_time"],
                "step_count": event.data["step_count"]
            })
            
            # Store time point
            self.times.append(event.data["simulation_time"])
    
    def get_results(self) -> Dict[str, Any]:
        """
        Get the collected results.
        
        Returns:
            Dictionary containing collected data
        """
        # Extract time series data
        if self.max_temperatures:
            times, max_temps = zip(*sorted(self.max_temperatures))
        else:
            times, max_temps = [], []
        
        if self.mean_reaction_rates:
            rate_times, mean_rates = zip(*sorted(self.mean_reaction_rates))
        else:
            rate_times, mean_rates = [], []
        
        return {
            "times": np.array(times),
            "max_temperatures": np.array(max_temps),
            "mean_reaction_rates": np.array(mean_rates),
            "performance_data": self.performance_data,
            "event_count": len(self.events)
        }


class VisualizationDataExporter(VisualizationEventListener):
    """
    Event listener that exports visualization data to files for external visualization.
    """
    
    def __init__(self, output_dir: str = "outputs/visualization"):
        """
        Initialize the data exporter.
        
        Args:
            output_dir: Directory to save visualization data
        """
        self.output_dir = output_dir
        self.time_series_data = {
            "temperature": [],
            "reaction_rate": [],
            "performance": []
        }
        
        # Create output directory
        os.makedirs(output_dir, exist_ok=True)
    
    def on_event(self, event: VisualizationEvent) -> None:
        """Handle visualization events."""
        if event.event_type == VisualizationEventType.SIMULATION_STARTED:
            # Save simulation metadata
            metadata_file = os.path.join(self.output_dir, "simulation_metadata.json")
            with open(metadata_file, "w") as f:
                json.dump(event.data["metadata"], f, indent=2)
        
        elif event.event_type == VisualizationEventType.DOMAIN_STATE_CHANGED:
            domain_name = event.source
            sim_time = event.data["simulation_time"]
            
            # Store temperature data
            if domain_name == "thermal" and "temperature" in event.data["data"]:
                temp_data = event.data["data"]["temperature"]
                if "statistics" in temp_data:
                    self.time_series_data["temperature"].append({
                        "time": sim_time,
                        "min": temp_data["statistics"]["min"],
                        "max": temp_data["statistics"]["max"],
                        "mean": temp_data["statistics"]["mean"],
                        "std": temp_data["statistics"]["std"]
                    })
            
            # Store reaction rate data
            if domain_name == "nuclear" and "reaction_rate_d-d" in event.data["data"]:
                rate_data = event.data["data"]["reaction_rate_d-d"]
                if "statistics" in rate_data:
                    self.time_series_data["reaction_rate"].append({
                        "time": sim_time,
                        "min": rate_data["statistics"]["min"],
                        "max": rate_data["statistics"]["max"],
                        "mean": rate_data["statistics"]["mean"],
                        "std": rate_data["statistics"]["std"]
                    })
        
        elif event.event_type == VisualizationEventType.SIMULATION_STEP_COMPLETED:
            # Store performance data
            self.time_series_data["performance"].append({
                "time": event.data["simulation_time"],
                "step_time": event.data["compute_time"],
                "avg_step_time": event.data["performance"]["avg_step_time"]
            })
        
        elif event.event_type == VisualizationEventType.SIMULATION_COMPLETED:
            # Save all collected data
            self._save_all_data()
    
    def _save_all_data(self) -> None:
        """Save all collected data to files."""
        # Save time series data
        for key, data in self.time_series_data.items():
            if data:
                filename = os.path.join(self.output_dir, f"{key}_time_series.json")
                with open(filename, "w") as f:
                    json.dump(sorted(data, key=lambda x: x["time"]), f, indent=2)
                
                logger.info(f"Saved {key} time series data to {filename}")


def run_coupled_simulation(
    domain_dims: Tuple[float, float, float] = (0.01, 0.01, 0.01),  # 1cm cube
    resolution: Tuple[int, int, int] = (10, 10, 10),               # 10x10x10 grid
    simulation_time: float = 1.0,                                  # 1 second
    dt: float = 1.0e-6,                                            # 1 microsecond
    reactions: List[str] = ["d-d"],                                # D-D fusion
    mechanisms: List[str] = ["electron_screening", "coherent_tunneling"],
    with_visualization: bool = True                                # Enable visualization hooks
) -> Dict[str, Any]:
    """
    Run a coupled nuclear-thermal simulation using the Multi-Physics Coupling Interface.
    
    Args:
        domain_dims: Physical dimensions of the domain in meters (x, y, z)
        resolution: Number of grid points in each dimension (nx, ny, nz)
        simulation_time: Total simulation time in seconds
        dt: Time step size in seconds
        reactions: List of fusion reactions to simulate
        mechanisms: List of enhancement mechanisms to include
        with_visualization: Whether to use visualization hooks
        
    Returns:
        Dictionary containing simulation results
    """
    # Set up visualization listeners if enabled
    data_collector = None
    if with_visualization:
        # Create data collector listener
        data_collector = DataCollectorListener()
        default_hooks.add_listener(data_collector)
        
        # Create data exporter listener
        data_exporter = VisualizationDataExporter()
        default_hooks.add_listener(data_exporter)
    
    # Create simulation domain
    domain = SimulationDomain(
        dimensions=domain_dims,
        resolution=resolution
    )
    
    # Create physics domains
    nuclear_domain = NuclearDomain(domain)
    thermal_domain = ThermalDomain(domain)
    
    # Create domain manager
    manager = PhysicsDomainManager()
    
    # Register domains
    manager.register_domain(nuclear_domain)
    manager.register_domain(thermal_domain)
    
    # Initialize nuclear domain
    nuclear_config = {
        'reactions': reactions,
        'mechanisms': mechanisms,
        'initial_temperature': 300.0,  # 300 K
        'densities': {
            'd': 1.0e28,  # Deuterium density (m^-3)
        }
    }
    nuclear_domain.initialize(nuclear_config)
    
    # Initialize thermal domain
    thermal_config = {
        'initial_temperature': 300.0,   # 300 K
        'thermal_conductivity': 10.0,   # W/(m*K) - High for demo purposes
        'heat_capacity': 500.0,         # J/(kg*K)
        'density': 1000.0               # kg/m^3
    }
    thermal_domain.initialize(thermal_config)
    
    # Create couplers for domain interaction
    # Nuclear -> Thermal: Power density from nuclear reactions heats the material
    nuclear_to_thermal = DomainCoupler("nuclear", "thermal")
    nuclear_to_thermal.add_variable_mapping("power_density", "heat_source")
    
    # Thermal -> Nuclear: Temperature affects reaction rates
    thermal_to_nuclear = DomainCoupler("thermal", "nuclear")
    thermal_to_nuclear.add_variable_mapping("temperature", "temperature")
    
    # Register couplers
    manager.register_coupler(nuclear_to_thermal)
    manager.register_coupler(thermal_to_nuclear)
    
    # Start timing
    start_time = time.time()
    
    # Run simulation
    logger.info(f"Starting coupled simulation for {simulation_time} seconds with dt={dt}")
    
    current_time = 0.0
    while current_time < simulation_time:
        # Get adaptive time step (if needed)
        max_dt = manager.get_stable_timestep()
        step_dt = min(dt, max_dt, simulation_time - current_time)
        
        # Advance simulation
        success = manager.advance(step_dt)
        
        if not success:
            logger.error(f"Simulation failed at t={current_time}")
            break
        
        # Update time
        current_time = manager.get_current_time()
    
    # Finalize the simulation
    simulation_stats = manager.complete_simulation()
    
    # Record end time
    elapsed = time.time() - start_time
    logger.info(f"Simulation completed in {elapsed:.2f} seconds")
    
    # Gather results
    results = {}
    
    # If using visualization hooks, get data from collector
    if with_visualization and data_collector:
        collected_data = data_collector.get_results()
        results.update(collected_data)
    
    # Add simulation metadata
    results.update({
        "elapsed_time": elapsed,
        "final_temperature": thermal_domain.get_state("temperature"),
        "final_reaction_rate": nuclear_domain.get_state("reaction_rate_d-d") if "d-d" in reactions else None,
        "simulation_stats": simulation_stats
    })
    
    return results


def plot_results(results: Dict[str, Any]) -> None:
    """
    Plot the results of a coupled simulation.
    
    Args:
        results: Dictionary containing simulation results
    """
    plt.figure(figsize=(15, 10))
    
    # Plot max temperature over time
    plt.subplot(2, 2, 1)
    plt.plot(results["times"], results["max_temperatures"], 'r-')
    plt.xlabel('Time (s)')
    plt.ylabel('Max Temperature (K)')
    plt.title('Temperature Evolution')
    plt.grid(True)
    
    # Plot mean reaction rate over time
    plt.subplot(2, 2, 2)
    plt.plot(results["times"], results["mean_reaction_rates"], 'b-')
    plt.xlabel('Time (s)')
    plt.ylabel('Mean Reaction Rate (1/s/m³)')
    plt.title('Reaction Rate Evolution')
    plt.grid(True)
    
    # Plot performance data if available
    if "performance_data" in results and results["performance_data"]:
        # Extract performance data
        p_times = [p["time"] for p in results["performance_data"]]
        compute_times = [p["compute_time"] for p in results["performance_data"]]
        
        plt.subplot(2, 2, 3)
        plt.plot(p_times, compute_times, 'g-')
        plt.xlabel('Simulation Time (s)')
        plt.ylabel('Step Compute Time (s)')
        plt.title('Computation Performance')
        plt.grid(True)
    
    # Plot final temperature field if available
    if "final_temperature" in results and results["final_temperature"] is not None:
        # Extract middle slice
        temp_field = results["final_temperature"]
        middle_slice_idx = temp_field.shape[2] // 2
        middle_slice = temp_field[:, :, middle_slice_idx]
        
        plt.subplot(2, 2, 4)
        img = plt.imshow(middle_slice.T, origin='lower', cmap='hot', 
                         interpolation='nearest')
        plt.colorbar(img, label='Temperature (K)')
        plt.title('Final Temperature Field (Middle Slice)')
        plt.xlabel('X')
        plt.ylabel('Y')
    
    plt.tight_layout()
    plt.savefig('outputs/coupled_simulation_results.png')
    plt.close()
    
    logger.info("Results plotted and saved to outputs/coupled_simulation_results.png")
    
    # Create a separate visualization for temperature gradient and heat flux
    if "final_temperature" in results and "simulation_stats" in results:
        try:
            # Create figure
            plt.figure(figsize=(12, 10))
            
            # Get temperature data
            temp_field = results["final_temperature"]
            
            # Compute temperature gradient (magnitude)
            gradient = compute_temperature_gradient({"temperature": temp_field})
            
            # Compute heat flux (assuming constant thermal conductivity)
            thermal_cond = 10.0  # Same as in simulation
            heat_flux = compute_heat_flux({
                "temperature": temp_field,
                "thermal_conductivity": np.ones_like(temp_field) * thermal_cond
            })
            
            # Plot temperature gradient
            plt.subplot(2, 1, 1)
            middle_slice_idx = gradient.shape[2] // 2
            middle_slice = gradient[:, :, middle_slice_idx]
            img = plt.imshow(middle_slice.T, origin='lower', cmap='viridis', 
                           interpolation='nearest')
            plt.colorbar(img, label='Temperature Gradient (K/m)')
            plt.title('Temperature Gradient Magnitude (Middle Slice)')
            plt.xlabel('X')
            plt.ylabel('Y')
            
            # Plot heat flux
            plt.subplot(2, 1, 2)
            middle_slice_idx = heat_flux.shape[2] // 2
            middle_slice = heat_flux[:, :, middle_slice_idx]
            img = plt.imshow(middle_slice.T, origin='lower', cmap='plasma', 
                           interpolation='nearest')
            plt.colorbar(img, label='Heat Flux (W/m²)')
            plt.title('Heat Flux Magnitude (Middle Slice)')
            plt.xlabel('X')
            plt.ylabel('Y')
            
            plt.tight_layout()
            plt.savefig('outputs/advanced_visualization.png')
            plt.close()
            
            logger.info("Advanced visualization saved to outputs/advanced_visualization.png")
        except Exception as e:
            logger.error(f"Error creating advanced visualization: {e}")


def main():
    """Main function to run a test simulation."""
    # Create output directory if it doesn't exist
    os.makedirs('outputs', exist_ok=True)
    
    # Run simulation
    results = run_coupled_simulation(
        simulation_time=0.01,  # 10 ms
        dt=1.0e-6,            # 1 us
        reactions=["d-d"],
        mechanisms=["electron_screening", "coherent_tunneling"],
        with_visualization=True
    )
    
    # Plot results
    plot_results(results)
    
    # Print summary
    print("\nSimulation Summary:")
    print(f"Final maximum temperature: {np.max(results['final_temperature']):.2f} K")
    print(f"Simulation time: {results['elapsed_time']:.2f} seconds")
    print(f"Steps: {results['simulation_stats']['step_count']}")
    
    if "event_count" in results:
        print(f"Visualization events recorded: {results['event_count']}")
    
    print("\nVisualization data exported to outputs/visualization/")


if __name__ == "__main__":
    main()
