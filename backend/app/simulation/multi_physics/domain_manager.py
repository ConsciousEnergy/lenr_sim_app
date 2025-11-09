"""
Physics Domain Manager Module

This module provides the PhysicsDomainManager class that coordinates the registration
and interaction of different physics domains, including time stepping and synchronization.
"""

import numpy as np
from typing import Dict, Any, Optional, List, Set, Tuple
import logging
import time

from app.utils.logging import setup_logger

from .interface import DomainInterface
from .state_repository import StateRepository
from .domain_coupler import DomainCoupler
from .visualization_hooks import default_hooks, VisualizationEventType

# Set up logger
logger = setup_logger("domain_manager", "logs/simulation.log")


class PhysicsDomainManager:
    """
    Coordinates the registration and interaction of different physics domains.
    
    The PhysicsDomainManager maintains the execution order and dependencies between domains,
    handles global time stepping and synchronization, and ensures proper data exchange
    through the state repository.
    """
    
    def __init__(self, visualization_hooks=default_hooks):
        """
        Initialize an empty domain manager with a state repository.
        
        Args:
            visualization_hooks: VisualizationHooks instance to use for visualization events
        """
        self.domains: Dict[str, DomainInterface] = {}
        self.couplers: List[DomainCoupler] = []
        self.state_repository = StateRepository()
        
        # Domain execution order (determined by dependencies)
        self.execution_order: List[str] = []
        
        # Current simulation time
        self.current_time: float = 0.0
        
        # Domain dependencies (domain -> set of domains it depends on)
        self.dependencies: Dict[str, Set[str]] = {}
        
        # Visualization hooks for real-time monitoring
        self.visualization_hooks = visualization_hooks
        
        # Simulation metadata
        self.simulation_metadata: Dict[str, Any] = {
            "start_time": None,
            "step_count": 0,
            "total_compute_time": 0.0,
            "domains": {},
            "couplers": []
        }
        
        logger.info("Initialized PhysicsDomainManager")
    
    def register_domain(self, domain: DomainInterface) -> None:
        """
        Register a physics domain with the manager.
        
        Args:
            domain: DomainInterface implementation to register
            
        Raises:
            ValueError: If a domain with the same name is already registered
        """
        domain_name = domain.get_domain_name()
        
        if domain_name in self.domains:
            raise ValueError(f"Domain already registered: {domain_name}")
        
        # Add the domain to the registry
        self.domains[domain_name] = domain
        
        # Register the domain with the state repository
        self.state_repository.register_domain(domain_name)
        
        # Initialize empty dependencies
        self.dependencies[domain_name] = set()
        
        # Mark execution order as invalid (needs recomputation)
        self.execution_order = []
        
        # Update simulation metadata
        self.simulation_metadata["domains"][domain_name] = {
            "type": domain.__class__.__name__,
            "provided_variables": list(domain.get_provided_variables()),
            "required_variables": list(domain.get_required_variables()),
            "max_stable_timestep": domain.get_max_stable_timestep()
        }
        
        logger.info(f"Registered domain: {domain_name}")
    
    def register_coupler(self, coupler: DomainCoupler) -> None:
        """
        Register a domain coupler with the manager.
        
        Args:
            coupler: DomainCoupler to register
            
        Raises:
            ValueError: If the source or target domain is not registered
        """
        source_domain = coupler.get_source_domain()
        target_domain = coupler.get_target_domain()
        
        # Check that both domains are registered
        if source_domain not in self.domains:
            raise ValueError(f"Source domain not registered: {source_domain}")
        
        if target_domain not in self.domains:
            raise ValueError(f"Target domain not registered: {target_domain}")
        
        # Add the coupler to the registry
        self.couplers.append(coupler)
        
        # Update dependencies
        self.dependencies[target_domain].add(source_domain)
        
        # Mark execution order as invalid (needs recomputation)
        self.execution_order = []
        
        # Update simulation metadata
        self.simulation_metadata["couplers"].append({
            "source_domain": source_domain,
            "target_domain": target_domain,
            "variable_mappings": coupler.get_mappings()
        })
        
        logger.info(f"Registered coupler: {source_domain} -> {target_domain}")
    
    def _compute_execution_order(self) -> None:
        """
        Compute the execution order of domains based on dependencies.
        
        Uses a topological sort to determine the order in which domains
        should be executed to satisfy all dependencies.
        
        Raises:
            ValueError: If there are circular dependencies
        """
        if not self.domains:
            return
        
        # Initialize data structures for topological sort
        visited: Dict[str, bool] = {domain: False for domain in self.domains}
        temp_visited: Dict[str, bool] = {domain: False for domain in self.domains}
        order: List[str] = []
        
        def visit(domain: str) -> None:
            """Recursive function for topological sort."""
            if temp_visited[domain]:
                # Circular dependency detected
                cycle = [domain]
                raise ValueError(f"Circular dependency detected: {cycle}")
            
            if not visited[domain]:
                temp_visited[domain] = True
                
                # Visit all dependencies
                for dep in self.dependencies[domain]:
                    visit(dep)
                
                temp_visited[domain] = False
                visited[domain] = True
                order.append(domain)
        
        # Perform topological sort
        for domain in self.domains:
            if not visited[domain]:
                visit(domain)
        
        # Reverse to get correct execution order
        self.execution_order = list(reversed(order))
        
        logger.info(f"Computed execution order: {self.execution_order}")
    
    def advance(self, dt: float) -> bool:
        """
        Advance all domains by the given time step.
        
        Args:
            dt: Time step size in seconds
            
        Returns:
            True if the advance was successful, False otherwise
        """
        if not self.domains:
            logger.warning("No domains registered, nothing to advance")
            return True
        
        # Compute execution order if needed
        if not self.execution_order:
            try:
                self._compute_execution_order()
            except ValueError as e:
                logger.error(f"Cannot advance: {str(e)}")
                return False
        
        # Record the start time for performance monitoring
        start_time = time.time()
        
        # Initialize simulation metadata if this is the first step
        if self.simulation_metadata["start_time"] is None:
            self.simulation_metadata["start_time"] = time.time()
            
            # Publish simulation started event
            self.visualization_hooks.publish_event(
                VisualizationEventType.SIMULATION_STARTED,
                "domain_manager",
                {
                    "simulation_time": self.current_time,
                    "domains": list(self.domains.keys()),
                    "execution_order": self.execution_order,
                    "metadata": self.simulation_metadata
                }
            )
        
        # Save the current state for possible rollback
        self.state_repository.save_state(self.current_time)
        
        # Advance each domain in the computed order
        for domain_name in self.execution_order:
            domain = self.domains[domain_name]
            
            # Prepare for domain advancement
            logger.debug(f"Advancing domain: {domain_name}")
            
            # Exchange data from dependencies to this domain
            self._exchange_data_to_domain(domain_name)
            
            # Advance the domain
            domain_start_time = time.time()
            success = domain.advance(dt)
            domain_compute_time = time.time() - domain_start_time
            
            if not success:
                logger.error(f"Domain advancement failed: {domain_name}")
                
                # Publish simulation error event
                self.visualization_hooks.publish_event(
                    VisualizationEventType.SIMULATION_ERROR,
                    domain_name,
                    {
                        "simulation_time": self.current_time,
                        "error": "Domain advancement failed",
                        "dt": dt
                    }
                )
                
                # Attempt to restore the previous state
                if not self.state_repository.restore_state(self.current_time):
                    logger.error("Failed to restore previous state")
                
                return False
            
            # Validate the domain state
            valid, errors = domain.validate_state()
            if not valid:
                logger.error(f"Domain state invalid after advancement: {domain_name}")
                logger.error(f"Errors: {errors}")
                
                # Publish simulation error event
                self.visualization_hooks.publish_event(
                    VisualizationEventType.SIMULATION_ERROR,
                    domain_name,
                    {
                        "simulation_time": self.current_time,
                        "error": "Domain state invalid after advancement",
                        "validation_errors": errors,
                        "dt": dt
                    }
                )
                
                # Attempt to restore the previous state
                if not self.state_repository.restore_state(self.current_time):
                    logger.error("Failed to restore previous state")
                
                return False
            
            # Publish domain state changed event
            domain_data = {}
            for var_name in domain.get_provided_variables():
                try:
                    # Only include scalar statistics for visualization to avoid large data transfers
                    var_data = domain.get_state(var_name)
                    if isinstance(var_data, np.ndarray) and var_data.size > 1:
                        # Compute basic statistics instead of sending raw data
                        statistics = self.visualization_hooks.compute_statistics(
                            var_data, 
                            ["min", "max", "mean", "std"]
                        )
                        domain_data[var_name] = {
                            "type": "array",
                            "shape": var_data.shape,
                            "statistics": statistics
                        }
                    else:
                        # Include scalar values directly
                        domain_data[var_name] = {
                            "type": "scalar",
                            "value": float(var_data) if np.isscalar(var_data) else float(var_data.item())
                        }
                except Exception as e:
                    logger.error(f"Error getting state variable {var_name}: {e}")
            
            self.visualization_hooks.publish_event(
                VisualizationEventType.DOMAIN_STATE_CHANGED,
                domain_name,
                {
                    "simulation_time": self.current_time,
                    "compute_time": domain_compute_time,
                    "data": domain_data
                }
            )
        
        # Update the current time
        self.current_time += dt
        
        # Update simulation metadata
        self.simulation_metadata["step_count"] += 1
        elapsed = time.time() - start_time
        self.simulation_metadata["total_compute_time"] += elapsed
        
        # Publish simulation step completed event
        self.visualization_hooks.publish_event(
            VisualizationEventType.SIMULATION_STEP_COMPLETED,
            "domain_manager",
            {
                "simulation_time": self.current_time,
                "step_count": self.simulation_metadata["step_count"],
                "compute_time": elapsed,
                "dt": dt,
                "performance": {
                    "avg_step_time": self.simulation_metadata["total_compute_time"] / self.simulation_metadata["step_count"],
                    "total_compute_time": self.simulation_metadata["total_compute_time"],
                    "current_step_time": elapsed
                }
            }
        )
        
        logger.debug(f"Advanced all domains by {dt} seconds (took {elapsed:.6f} seconds)")
        
        return True
    
    def _exchange_data_to_domain(self, target_domain: str) -> None:
        """
        Exchange data from all source domains to the target domain.
        
        Args:
            target_domain: Name of the target domain
        """
        for coupler in self.couplers:
            if coupler.get_target_domain() == target_domain:
                coupler.exchange_data(self)
    
    def get_stable_timestep(self) -> float:
        """
        Get the maximum stable time step across all domains.
        
        Returns:
            Maximum stable time step in seconds
        """
        if not self.domains:
            return float('inf')
        
        # Get the minimum of all domain stable time steps
        min_dt = float('inf')
        for domain in self.domains.values():
            dt = domain.get_max_stable_timestep()
            min_dt = min(min_dt, dt)
        
        return min_dt
    
    def get_domain(self, name: str) -> Optional[DomainInterface]:
        """
        Get a domain by name.
        
        Args:
            name: Name of the domain
            
        Returns:
            DomainInterface if found, None otherwise
        """
        return self.domains.get(name)
    
    def get_domains(self) -> Dict[str, DomainInterface]:
        """
        Get all registered domains.
        
        Returns:
            Dictionary mapping domain names to DomainInterface instances
        """
        return self.domains.copy()
    
    def get_couplers(self) -> List[DomainCoupler]:
        """
        Get all registered couplers.
        
        Returns:
            List of DomainCoupler instances
        """
        return list(self.couplers)
    
    def get_execution_order(self) -> List[str]:
        """
        Get the computed execution order of domains.
        
        Returns:
            List of domain names in execution order
        """
        if not self.execution_order and self.domains:
            self._compute_execution_order()
        
        return list(self.execution_order)
    
    def get_current_time(self) -> float:
        """
        Get the current simulation time.
        
        Returns:
            Current simulation time in seconds
        """
        return self.current_time
    
    def get_domain_info(self) -> List[Dict[str, Any]]:
        """
        Get information about all registered domains.
        
        Returns:
            List of dictionaries containing domain information
        """
        info = []
        for name, domain in self.domains.items():
            info.append({
                "name": name,
                "type": domain.__class__.__name__,
                "provided_variables": list(domain.get_provided_variables()),
                "required_variables": list(domain.get_required_variables()),
                "dependencies": list(self.dependencies.get(name, set())),
                "max_stable_timestep": domain.get_max_stable_timestep()
            })
        
        return info
    
    def complete_simulation(self) -> Dict[str, Any]:
        """
        Mark the simulation as completed and return simulation statistics.
        
        Returns:
            Dictionary containing simulation statistics
        """
        # Calculate simulation duration
        if self.simulation_metadata["start_time"] is not None:
            simulation_duration = time.time() - self.simulation_metadata["start_time"]
        else:
            simulation_duration = 0.0
        
        # Gather final statistics
        stats = {
            "simulation_time": self.current_time,
            "wall_clock_duration": simulation_duration,
            "total_compute_time": self.simulation_metadata["total_compute_time"],
            "step_count": self.simulation_metadata["step_count"],
            "domains": len(self.domains),
            "couplers": len(self.couplers),
            "avg_step_time": self.simulation_metadata["total_compute_time"] / max(1, self.simulation_metadata["step_count"]),
            "avg_steps_per_second": self.simulation_metadata["step_count"] / max(0.001, self.simulation_metadata["total_compute_time"])
        }
        
        # Publish simulation completed event
        self.visualization_hooks.publish_event(
            VisualizationEventType.SIMULATION_COMPLETED,
            "domain_manager",
            {
                "simulation_time": self.current_time,
                "statistics": stats
            }
        )
        
        logger.info(f"Simulation completed at time {self.current_time} after {self.simulation_metadata['step_count']} steps")
        logger.info(f"Total compute time: {self.simulation_metadata['total_compute_time']:.3f} seconds")
        logger.info(f"Wall clock duration: {simulation_duration:.3f} seconds")
        
        return stats
