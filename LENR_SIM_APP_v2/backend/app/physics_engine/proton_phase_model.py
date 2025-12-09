"""
Proton Phase Transition Model for LENR

Models proton state transitions through multiple force regimes:
FREE (EM) -> SCREENED (EM+lattice) -> CAPTURE_READY (Weak) -> NUCLEAR (Strong)

Based on the unified LENR theory framework sections:
- 2.1: Electron Screening
- 2.2: Halo Electrons  
- 2.3: Double-Layer QED
- 2.4: Neutron Formation via Electron Capture

Author: Conscious Energies
"""

import numpy as np
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
from scipy import constants as const
import logging

logger = logging.getLogger(__name__)


class ProtonPhase(Enum):
    """Proton phase states in LENR progression."""
    FREE = "free"
    SCREENED = "screened"
    CAPTURE_READY = "capture_ready"
    NUCLEAR = "nuclear"


@dataclass
class PhaseThresholds:
    """Threshold conditions for phase transitions from theory paper."""
    # FREE -> SCREENED
    screening_energy_ev: float = 10.0  # Section 2.1: 10-100 eV screening
    min_loading_ratio: float = 0.7
    min_temperature: float = 200.0  # K
    
    # SCREENED -> CAPTURE_READY
    overlap_probability: float = 1e-3  # Section 2.2: P_overlap ~ 10^-3
    electric_field_threshold: float = 1e8  # V/m, Section 2.3
    capture_loading_ratio: float = 0.85
    
    # CAPTURE_READY -> NUCLEAR
    tunneling_enhancement: float = 1e5  # Significant enhancement needed
    nuclear_loading_ratio: float = 0.9
    defect_density_threshold: float = 1e16  # m^-3


@dataclass
class ProtonState:
    """State of a single proton in the system."""
    phase: ProtonPhase = ProtonPhase.FREE
    position: np.ndarray = None
    velocity: np.ndarray = None
    
    # Physics state
    screening_energy: float = 0.0  # eV
    overlap_probability: float = 0.0
    tunneling_enhancement: float = 1.0
    local_field: float = 0.0  # V/m
    
    # Transition tracking
    time_in_phase: float = 0.0
    transition_probability: float = 0.0
    
    def __post_init__(self):
        if self.position is None:
            self.position = np.zeros(3)
        if self.velocity is None:
            self.velocity = np.zeros(3)


class ProtonPhaseModel:
    """
    Models proton phase transitions in LENR systems.
    
    Tracks protons as they progress through force regimes:
    1. FREE: Normal EM-dominated behavior
    2. SCREENED: Electron cloud reduces Coulomb barrier
    3. CAPTURE_READY: Halo electron overlap enables weak interaction
    4. NUCLEAR: Strong force engagement possible
    """
    
    # Physical constants
    HBAR = const.hbar
    E_CHARGE = const.e
    KB = const.k
    EPS0 = const.epsilon_0
    ME = const.m_e
    MP = const.m_p
    ALPHA = const.alpha
    A0 = const.physical_constants['Bohr radius'][0]
    
    def __init__(self, thresholds: Optional[PhaseThresholds] = None):
        self.thresholds = thresholds or PhaseThresholds()
        self.protons: List[ProtonState] = []
        
    def initialize_protons(self, count: int, region_bounds: Dict[str, float] = None):
        """Initialize proton population with random positions."""
        bounds = region_bounds or {"min": -3, "max": 3, "y_center": 0}
        
        self.protons = []
        for _ in range(count):
            proton = ProtonState(
                phase=ProtonPhase.FREE,
                position=np.array([
                    np.random.uniform(bounds["min"], bounds["max"]),
                    bounds.get("y_center", 0) + np.random.uniform(-2, 2),
                    np.random.uniform(bounds["min"], bounds["max"])
                ]),
                velocity=np.random.randn(3) * 0.01
            )
            self.protons.append(proton)
        
        logger.info(f"Initialized {count} protons in FREE state")
        return self.protons
    
    def calculate_screening_energy(
        self,
        temperature: float,
        electron_density: float,
        local_field: float = 0
    ) -> float:
        """
        Calculate electron screening energy.
        
        From Section 2.1: Debye screening model
        U_s = Z₁Z₂e²/(4πε₀λ_D)
        """
        # Debye screening length
        lambda_d = np.sqrt(self.EPS0 * self.KB * temperature / 
                         (electron_density * self.E_CHARGE**2))
        
        # Screening potential (Z1=Z2=1 for H-H)
        U_screen_j = self.E_CHARGE**2 / (4 * np.pi * self.EPS0 * lambda_d)
        U_screen_ev = U_screen_j / self.E_CHARGE
        
        # Field enhancement
        if local_field > 1e6:
            field_factor = 1 + (local_field / 1e8)**0.5
            U_screen_ev *= field_factor
        
        return min(U_screen_ev, 100.0)  # Cap at 100 eV per theory
    
    def calculate_overlap_probability(
        self,
        screening_energy: float,
        temperature: float,
        orbital_extension: float = 10.0  # in units of a0
    ) -> float:
        """
        Calculate halo electron-nucleus overlap probability.
        
        From Section 2.2:
        P_overlap = (1/πa³) * exp(-2r₀/a)
        """
        # Extended orbital radius
        a = orbital_extension * self.A0  # m
        
        # Nuclear core radius
        r0 = 1e-15  # ~1 fm
        
        # Base overlap probability
        P_base = (1 / (np.pi * a**3)) * np.exp(-2 * r0 / a)
        
        # Screening enhancement factor
        E_thermal = self.KB * temperature / self.E_CHARGE  # eV
        if E_thermal > 0.001:
            screening_factor = np.exp(screening_energy / (10 * E_thermal))
        else:
            screening_factor = 1.0
        
        P_overlap = P_base * min(screening_factor, 1e6)
        
        return min(P_overlap, 0.1)  # Physical limit
    
    def calculate_tunneling_enhancement(
        self,
        screening_energy: float,
        temperature: float,
        electric_field: float,
        loading_ratio: float
    ) -> float:
        """
        Calculate total tunneling enhancement factor.
        
        Combines screening, field, and coherence effects.
        Target: 10³-10⁵ under optimal conditions (Section 5.1)
        """
        # Thermal energy
        E_thermal = self.KB * temperature
        
        # Screening enhancement
        U_s = screening_energy * self.E_CHARGE
        if E_thermal > 0:
            f_screen = np.exp(min(U_s / E_thermal, 20))
        else:
            f_screen = 1.0
        
        # QED field enhancement
        E_critical = 1e8
        f_qed = 1 + (electric_field / E_critical)**2
        
        # Coherence enhancement (loading dependent)
        if loading_ratio > 0.85:
            f_coherence = 1 + 10 * (loading_ratio - 0.85)
        else:
            f_coherence = 1.0
        
        total = f_screen * f_qed * f_coherence
        
        # Cap at theoretical maximum from paper
        return min(total, 1e8)
    
    def determine_phase(self, proton: ProtonState, conditions: Dict[str, float]) -> ProtonPhase:
        """
        Determine proton phase based on local conditions.
        """
        temperature = conditions.get("temperature", 300)
        electric_field = conditions.get("electric_field", 1e6)
        electron_density = conditions.get("electron_density", 1e28)
        loading_ratio = conditions.get("loading_ratio", 0.5)
        defect_density = conditions.get("defect_density", 1e15)
        
        # Calculate state parameters
        screening = self.calculate_screening_energy(temperature, electron_density, electric_field)
        overlap = self.calculate_overlap_probability(screening, temperature)
        enhancement = self.calculate_tunneling_enhancement(
            screening, temperature, electric_field, loading_ratio
        )
        
        # Update proton state
        proton.screening_energy = screening
        proton.overlap_probability = overlap
        proton.tunneling_enhancement = enhancement
        proton.local_field = electric_field
        
        # Phase determination logic
        th = self.thresholds
        
        # Check NUCLEAR conditions
        if (enhancement > th.tunneling_enhancement and
            loading_ratio > th.nuclear_loading_ratio and
            defect_density > th.defect_density_threshold):
            return ProtonPhase.NUCLEAR
        
        # Check CAPTURE_READY conditions
        if (overlap > th.overlap_probability and
            electric_field > th.electric_field_threshold * 0.5 and
            loading_ratio > th.capture_loading_ratio):
            return ProtonPhase.CAPTURE_READY
        
        # Check SCREENED conditions
        if (screening > th.screening_energy_ev and
            loading_ratio > th.min_loading_ratio and
            temperature > th.min_temperature):
            return ProtonPhase.SCREENED
        
        return ProtonPhase.FREE
    
    def update_protons(self, conditions: Dict[str, float], dt: float = 0.001):
        """
        Update all proton states based on current conditions.
        """
        phase_counts = {phase: 0 for phase in ProtonPhase}
        
        for proton in self.protons:
            old_phase = proton.phase
            new_phase = self.determine_phase(proton, conditions)
            
            if new_phase != old_phase:
                proton.phase = new_phase
                proton.time_in_phase = 0
                logger.debug(f"Proton transitioned: {old_phase.value} -> {new_phase.value}")
            else:
                proton.time_in_phase += dt
            
            phase_counts[proton.phase] += 1
        
        return phase_counts
    
    def get_phase_distribution(self) -> Dict[str, float]:
        """Get normalized distribution of protons across phases."""
        if not self.protons:
            return {phase.value: 0.0 for phase in ProtonPhase}
        
        counts = {phase.value: 0 for phase in ProtonPhase}
        for proton in self.protons:
            counts[proton.phase.value] += 1
        
        total = len(self.protons)
        return {phase: count / total for phase, count in counts.items()}
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get statistical summary of proton population."""
        if not self.protons:
            return {}
        
        screenings = [p.screening_energy for p in self.protons]
        overlaps = [p.overlap_probability for p in self.protons]
        enhancements = [p.tunneling_enhancement for p in self.protons]
        
        return {
            "count": len(self.protons),
            "distribution": self.get_phase_distribution(),
            "screening_energy": {
                "mean": np.mean(screenings),
                "max": np.max(screenings),
                "min": np.min(screenings)
            },
            "overlap_probability": {
                "mean": np.mean(overlaps),
                "max": np.max(overlaps)
            },
            "tunneling_enhancement": {
                "mean": np.mean(enhancements),
                "max": np.max(enhancements)
            }
        }
    
    def simulate_collapse_sequence(
        self,
        normalized_times: np.ndarray,
        base_conditions: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """
        Simulate proton phase evolution through bubble collapse.
        """
        results = []
        
        for t in normalized_times:
            # Modify conditions based on collapse phase
            conditions = base_conditions.copy()
            
            if t < 0.4:  # Expansion
                factor = 1.0
            elif t < 0.55:  # Collapse
                factor = 1 + 10 * ((t - 0.4) / 0.15)**2
            elif t < 0.6:  # Minimum
                factor = 10.0
            elif t < 0.7:  # Rebound
                factor = 5.0
            else:  # Recovery
                factor = 1.0 + 4 * (1 - (t - 0.7) / 0.3)
            
            conditions["electric_field"] = base_conditions.get("electric_field", 1e6) * factor
            conditions["temperature"] = base_conditions.get("temperature", 300) * (1 + factor * 0.1)
            
            phase_counts = self.update_protons(conditions)
            distribution = self.get_phase_distribution()
            
            results.append({
                "time": t,
                "phase_distribution": distribution,
                "conditions": conditions,
                "statistics": self.get_statistics()
            })
        
        return results


def get_phase_info(phase: ProtonPhase) -> Dict[str, Any]:
    """Get human-readable info about a phase."""
    info = {
        ProtonPhase.FREE: {
            "name": "Free (EM)",
            "description": "Electromagnetic force dominated, normal hydrogen behavior",
            "force_regime": "electromagnetic",
            "color": "#3498db"
        },
        ProtonPhase.SCREENED: {
            "name": "Screened",
            "description": "Electron screening active, Coulomb barrier lowered by 10-100 eV",
            "force_regime": "electromagnetic_screened", 
            "color": "#00ffff"
        },
        ProtonPhase.CAPTURE_READY: {
            "name": "Capture Ready",
            "description": "Halo electron overlap enables weak force coupling (p + e⁻ → n + νₑ)",
            "force_regime": "weak",
            "color": "#f1c40f"
        },
        ProtonPhase.NUCLEAR: {
            "name": "Nuclear Active",
            "description": "Strong force engagement, fusion/transmutation possible",
            "force_regime": "strong",
            "color": "#ff4500"
        }
    }
    return info.get(phase, {})
