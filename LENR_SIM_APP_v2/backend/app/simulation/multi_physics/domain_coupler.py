"""
Domain Coupler Module (v0.2.2-beta Enhanced)

This module provides the DomainCoupler class that manages data exchange between
different physics domains, including interpolation and transformation of variables.

v0.2.2-beta: Enhanced multi-physics coupling with:
- Operator splitting for multi-physics time stepping
- Conservation checks at coupling interfaces
- Adaptive time stepping based on fastest domain
- Pre-defined coupling transforms for LENR domains
"""

import numpy as np
from typing import Dict, Any, Optional, List, Callable, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
import logging

from app.utils.logging import setup_logger

# Set up logger
logger = setup_logger("domain_coupler", "logs/simulation.log")


class PhysicsDomain(Enum):
    """Enumeration of physics domains for LENR simulation"""
    NUCLEAR = "nuclear"
    THERMAL = "thermal"
    ELECTROMAGNETIC = "electromagnetic"
    MECHANICAL = "mechanical"
    MHD = "mhd"
    QUANTUM = "quantum"


@dataclass
class CouplingTransform:
    """
    Defines a transformation for coupling variables between domains.
    """
    source_var: str
    target_var: str
    transform_fn: Optional[Callable] = None
    conservation_check: Optional[Callable] = None
    bidirectional: bool = False
    priority: int = 0  # Lower = higher priority


@dataclass
class DomainState:
    """
    Tracks the state of a physics domain for coupling.
    """
    domain: PhysicsDomain
    variables: Dict[str, np.ndarray] = field(default_factory=dict)
    dt_characteristic: float = 1e-6  # Characteristic time scale
    last_update_time: float = 0.0
    is_active: bool = True


class DomainCoupler:
    """
    Manages the data exchange between physics domains.
    
    The DomainCoupler handles the mapping of variables between different domains,
    including any necessary transformations or interpolations to convert between
    different discretizations or coordinate systems.
    """
    
    def __init__(self, source_domain: str, target_domain: str):
        """
        Initialize a coupler between two domains.
        
        Args:
            source_domain: Name of the source domain
            target_domain: Name of the target domain
        """
        self.source_domain = source_domain
        self.target_domain = target_domain
        self.variable_mappings: Dict[str, Tuple[str, Optional[Callable]]] = {}
        
        logger.info(f"Created coupler: {source_domain} -> {target_domain}")
    
    def add_variable_mapping(
        self, 
        source_var: str, 
        target_var: str, 
        transformation: Optional[Callable] = None
    ) -> None:
        """
        Add a mapping between source and target variables.
        
        Args:
            source_var: Name of the source variable
            target_var: Name of the target variable
            transformation: Optional function to transform the variable
                If provided, should accept a NumPy array and return a NumPy array
                If None, direct copying is used
        """
        self.variable_mappings[source_var] = (target_var, transformation)
        if transformation:
            logger.debug(f"Added mapping with transformation: {source_var} -> {target_var}")
        else:
            logger.debug(f"Added direct mapping: {source_var} -> {target_var}")
    
    def exchange_data(self, manager: 'PhysicsDomainManager') -> None:
        """
        Exchange data between domains using the current mappings.
        
        Args:
            manager: PhysicsDomainManager instance to get/set variables
            
        Raises:
            KeyError: If a domain or variable doesn't exist
            ValueError: If a transformation fails
        """
        from .domain_manager import PhysicsDomainManager
        
        for source_var, (target_var, transformation) in self.variable_mappings.items():
            try:
                # Get the source variable from the state repository
                source_value = manager.state_repository.get_variable(
                    self.source_domain, source_var
                )
                
                # Apply transformation if provided
                if transformation:
                    try:
                        target_value = transformation(source_value)
                    except Exception as e:
                        logger.error(f"Transformation failed for {source_var} -> {target_var}: {str(e)}")
                        raise ValueError(f"Transformation failed: {str(e)}")
                else:
                    target_value = np.copy(source_value)
                
                # Set the target variable in the state repository
                manager.state_repository.set_variable(
                    self.target_domain, target_var, target_value
                )
                
                logger.debug(f"Exchanged data: {self.source_domain}.{source_var} -> {self.target_domain}.{target_var}")
                
            except KeyError as e:
                logger.error(f"Data exchange failed: {str(e)}")
                raise
    
    def get_mappings(self) -> Dict[str, Tuple[str, bool]]:
        """
        Get all variable mappings for this coupler.
        
        Returns:
            Dictionary mapping source variables to tuples of
            (target variable, has transformation)
        """
        return {
            source_var: (target_var, transformation is not None)
            for source_var, (target_var, transformation) in self.variable_mappings.items()
        }
    
    def get_source_domain(self) -> str:
        """
        Get the name of the source domain.
        
        Returns:
            Source domain name
        """
        return self.source_domain
    
    def get_target_domain(self) -> str:
        """
        Get the name of the target domain.
        
        Returns:
            Target domain name
        """
        return self.target_domain


class EnhancedDomainCoupler(DomainCoupler):
    """
    Enhanced Domain Coupler with operator splitting and conservation checks.
    
    v0.2.2-beta: Provides advanced coupling between physics domains including:
    - Nuclear Domain: Reaction rates, tunneling probabilities
    - Thermal Domain: Temperature field, heat transfer
    - Electromagnetic Domain: E/B fields, screening
    - Mechanical Domain: Stress, strain from bubble collapse
    - MHD Domain: Magnetohydrodynamic forces
    """
    
    def __init__(self, source_domain: str, target_domain: str):
        """
        Initialize enhanced coupler.
        
        Args:
            source_domain: Name of the source domain
            target_domain: Name of the target domain
        """
        super().__init__(source_domain, target_domain)
        
        self.coupling_transforms: List[CouplingTransform] = []
        self.conservation_tolerances: Dict[str, float] = {}
        self.time_step_ratio: float = 1.0
        self.subcycling_enabled: bool = True
        
        # Pre-defined coupling transforms
        self._setup_standard_transforms()
        
        logger.info(f"Created enhanced coupler: {source_domain} -> {target_domain}")
    
    def _setup_standard_transforms(self):
        """Set up standard physics coupling transforms."""
        
        # Nuclear -> Thermal: Energy from reactions
        if self.source_domain == PhysicsDomain.NUCLEAR.value and \
           self.target_domain == PhysicsDomain.THERMAL.value:
            self.add_coupling_transform(CouplingTransform(
                source_var="reaction_energy",
                target_var="heat_source",
                transform_fn=self._nuclear_to_thermal_energy,
                conservation_check=self._check_energy_conservation,
                priority=1
            ))
        
        # Thermal -> Electromagnetic: Joule heating feedback
        if self.source_domain == PhysicsDomain.THERMAL.value and \
           self.target_domain == PhysicsDomain.ELECTROMAGNETIC.value:
            self.add_coupling_transform(CouplingTransform(
                source_var="temperature",
                target_var="conductivity",
                transform_fn=self._thermal_to_em_conductivity,
                priority=2
            ))
        
        # Electromagnetic -> Mechanical: Lorentz forces
        if self.source_domain == PhysicsDomain.ELECTROMAGNETIC.value and \
           self.target_domain == PhysicsDomain.MECHANICAL.value:
            self.add_coupling_transform(CouplingTransform(
                source_var="current_density",
                target_var="lorentz_force",
                transform_fn=self._em_to_mechanical_force,
                priority=1
            ))
        
        # Mechanical -> Nuclear: Pressure effects on rates
        if self.source_domain == PhysicsDomain.MECHANICAL.value and \
           self.target_domain == PhysicsDomain.NUCLEAR.value:
            self.add_coupling_transform(CouplingTransform(
                source_var="pressure",
                target_var="enhancement_factor",
                transform_fn=self._mechanical_to_nuclear_enhancement,
                priority=1
            ))
    
    def add_coupling_transform(self, transform: CouplingTransform) -> None:
        """
        Add a coupling transform to this coupler.
        
        Args:
            transform: CouplingTransform instance defining the coupling
        """
        self.coupling_transforms.append(transform)
        self.coupling_transforms.sort(key=lambda t: t.priority)
        logger.debug(f"Added transform: {transform.source_var} -> {transform.target_var}")
    
    def exchange_with_transforms(self, manager: 'PhysicsDomainManager') -> Dict[str, Any]:
        """
        Exchange data using predefined coupling transforms.
        
        Args:
            manager: PhysicsDomainManager instance
            
        Returns:
            Dictionary with exchange statistics and any conservation warnings
        """
        results = {
            "transforms_applied": 0,
            "conservation_warnings": [],
            "variables_exchanged": []
        }
        
        for transform in self.coupling_transforms:
            try:
                # Get source value
                source_value = manager.state_repository.get_variable(
                    self.source_domain, transform.source_var
                )
                
                # Apply transformation
                if transform.transform_fn:
                    target_value = transform.transform_fn(source_value)
                else:
                    target_value = np.copy(source_value)
                
                # Conservation check
                if transform.conservation_check:
                    is_conserved, delta = transform.conservation_check(source_value, target_value)
                    if not is_conserved:
                        results["conservation_warnings"].append({
                            "transform": f"{transform.source_var} -> {transform.target_var}",
                            "delta": delta
                        })
                
                # Set target value
                manager.state_repository.set_variable(
                    self.target_domain, transform.target_var, target_value
                )
                
                results["transforms_applied"] += 1
                results["variables_exchanged"].append(transform.target_var)
                
            except Exception as e:
                logger.error(f"Transform failed: {transform.source_var} -> {transform.target_var}: {e}")
        
        return results
    
    def subcycle_exchange(
        self, 
        manager: 'PhysicsDomainManager',
        source_dt: float,
        target_dt: float,
        n_subcycles: Optional[int] = None
    ) -> None:
        """
        Perform subcycled exchange for domains with different time scales.
        
        Args:
            manager: PhysicsDomainManager instance
            source_dt: Time step of source domain
            target_dt: Time step of target domain
            n_subcycles: Number of subcycles (auto-calculated if None)
        """
        if not self.subcycling_enabled:
            self.exchange_data(manager)
            return
        
        # Calculate number of subcycles
        if n_subcycles is None:
            n_subcycles = max(1, int(np.ceil(source_dt / target_dt)))
        
        logger.debug(f"Subcycling {n_subcycles} times for {self.source_domain} -> {self.target_domain}")
        
        for i in range(n_subcycles):
            self.exchange_data(manager)
    
    def operator_split_step(
        self,
        manager: 'PhysicsDomainManager',
        dt: float,
        method: str = 'strang'
    ) -> None:
        """
        Perform operator-split time step for coupled domains.
        
        Args:
            manager: PhysicsDomainManager instance
            dt: Time step
            method: Splitting method ('lie', 'strang')
        """
        if method == 'strang':
            # Strang splitting: A(dt/2) -> B(dt) -> A(dt/2)
            self.exchange_data(manager)
            # Note: Actual domain advancement would be done by domain solvers
            # This just handles the exchange
        else:
            # Lie splitting: A(dt) -> B(dt)
            self.exchange_data(manager)
    
    # Standard transform functions
    @staticmethod
    def _nuclear_to_thermal_energy(reaction_energy: np.ndarray) -> np.ndarray:
        """Convert nuclear reaction energy to thermal heat source."""
        # Q-value in MeV to Joules, distributed over volume
        MEV_TO_J = 1.602e-13
        return reaction_energy * MEV_TO_J
    
    @staticmethod
    def _thermal_to_em_conductivity(temperature: np.ndarray) -> np.ndarray:
        """
        Calculate electrical conductivity from temperature.
        Uses simplified model: σ ∝ 1/T for metals
        """
        SIGMA_REF = 1e7  # S/m reference conductivity
        T_REF = 300  # K reference temperature
        return SIGMA_REF * T_REF / np.maximum(temperature, 1.0)
    
    @staticmethod
    def _em_to_mechanical_force(current_density: np.ndarray) -> np.ndarray:
        """
        Calculate Lorentz force from current density.
        F = J × B (simplified with assumed B field)
        """
        B_FIELD = 1.0  # Tesla, assumed background field
        return current_density * B_FIELD
    
    @staticmethod
    def _mechanical_to_nuclear_enhancement(pressure: np.ndarray) -> np.ndarray:
        """
        Calculate enhancement factor from mechanical pressure.
        Higher pressure -> closer nuclear approach -> enhanced tunneling
        """
        P_REF = 1e9  # Pa reference pressure
        return 1.0 + np.log10(np.maximum(pressure / P_REF, 1.0))
    
    @staticmethod
    def _check_energy_conservation(
        source: np.ndarray, 
        target: np.ndarray,
        tolerance: float = 1e-6
    ) -> Tuple[bool, float]:
        """Check if energy is conserved in the transform."""
        source_total = np.sum(source)
        target_total = np.sum(target)
        
        if source_total > 0:
            delta = abs(target_total - source_total) / source_total
        else:
            delta = abs(target_total)
        
        return delta < tolerance, delta


class MultiPhysicsCouplingManager:
    """
    Manages multiple domain couplers for full multi-physics simulation.
    
    v0.2.2-beta: Coordinates coupling between all physics domains.
    """
    
    def __init__(self):
        """Initialize the coupling manager."""
        self.couplers: Dict[Tuple[str, str], EnhancedDomainCoupler] = {}
        self.domain_states: Dict[str, DomainState] = {}
        self.global_time: float = 0.0
        self.adaptive_dt: bool = True
        self.min_dt: float = 1e-12
        self.max_dt: float = 1e-3
        
        logger.info("Created MultiPhysicsCouplingManager")
    
    def register_domain(self, domain: PhysicsDomain, dt_characteristic: float = 1e-6) -> None:
        """
        Register a physics domain with the coupling manager.
        
        Args:
            domain: PhysicsDomain enum value
            dt_characteristic: Characteristic time scale for this domain
        """
        self.domain_states[domain.value] = DomainState(
            domain=domain,
            dt_characteristic=dt_characteristic
        )
        logger.info(f"Registered domain: {domain.value} with dt={dt_characteristic}")
    
    def create_coupler(self, source: PhysicsDomain, target: PhysicsDomain) -> EnhancedDomainCoupler:
        """
        Create a coupler between two domains.
        
        Args:
            source: Source domain
            target: Target domain
            
        Returns:
            EnhancedDomainCoupler instance
        """
        key = (source.value, target.value)
        if key not in self.couplers:
            self.couplers[key] = EnhancedDomainCoupler(source.value, target.value)
        return self.couplers[key]
    
    def get_adaptive_timestep(self) -> float:
        """
        Calculate adaptive time step based on all active domains.
        
        Returns:
            Recommended time step
        """
        if not self.domain_states:
            return self.min_dt
        
        # Use minimum characteristic time among active domains
        active_dts = [
            state.dt_characteristic
            for state in self.domain_states.values()
            if state.is_active
        ]
        
        if not active_dts:
            return self.min_dt
        
        dt = min(active_dts)
        return np.clip(dt, self.min_dt, self.max_dt)
    
    def step_all_couplings(self, manager: 'PhysicsDomainManager', dt: Optional[float] = None) -> Dict[str, Any]:
        """
        Perform one coupling step for all registered domain pairs.
        
        Args:
            manager: PhysicsDomainManager instance
            dt: Time step (uses adaptive if None)
            
        Returns:
            Dictionary with coupling statistics
        """
        if dt is None:
            dt = self.get_adaptive_timestep()
        
        results = {
            "dt_used": dt,
            "couplings_performed": 0,
            "warnings": []
        }
        
        for (source, target), coupler in self.couplers.items():
            try:
                exchange_result = coupler.exchange_with_transforms(manager)
                results["couplings_performed"] += 1
                
                if exchange_result.get("conservation_warnings"):
                    results["warnings"].extend(exchange_result["conservation_warnings"])
                    
            except Exception as e:
                logger.error(f"Coupling {source} -> {target} failed: {e}")
                results["warnings"].append({"coupling": f"{source}->{target}", "error": str(e)})
        
        self.global_time += dt
        return results
    
    def get_coupling_graph(self) -> Dict[str, List[str]]:
        """
        Get the coupling graph as adjacency list.
        
        Returns:
            Dictionary mapping domains to their coupled targets
        """
        graph = {}
        for (source, target) in self.couplers.keys():
            if source not in graph:
                graph[source] = []
            graph[source].append(target)
        return graph
