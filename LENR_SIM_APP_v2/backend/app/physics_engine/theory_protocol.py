"""
Theory Module Protocol and Data Structures for LENR Theory Testbed

Defines the common interface that all theory modules must implement,
enabling composable, selectable, and independently testable theories.

Each theory module represents a distinct LENR mechanism (electron screening,
coherent QED, Hydroton, NAE, etc.) and produces a TheoryContribution that
the TheoryPipeline orchestrator combines into unified results.
"""

from __future__ import annotations

from typing import Protocol, Dict, Any, List, Optional, runtime_checkable
from dataclasses import dataclass, field


@dataclass
class TheoryContribution:
    """Result from a single theory module calculation.

    Attributes:
        theory_id: Unique machine-readable identifier (e.g. ``electron_screening``).
        theory_name: Human-readable display name.
        enhancement_factor: Multiplicative factor applied to the base tunnelling rate.
        reaction_rate_modifier: Multiplier on the base fusion reaction rate.
        energy_output_watts: Direct energy contribution in watts (if applicable).
        observables: Theory-specific outputs (He-4 rate, neutron rate, photon
            cascade count, etc.).
        parameters_used: Snapshot of input parameters consumed by the calculation.
        is_applicable: Whether the theory's physical assumptions are satisfied
            under the supplied conditions.
        confidence: 0-1 measure of how well the supplied conditions match the
            theory's regime of validity.
        references: Academic references for the theory.
    """

    theory_id: str
    theory_name: str
    enhancement_factor: float = 1.0
    reaction_rate_modifier: float = 1.0
    energy_output_watts: float = 0.0
    observables: Dict[str, float] = field(default_factory=dict)
    parameters_used: Dict[str, float] = field(default_factory=dict)
    is_applicable: bool = True
    confidence: float = 0.0
    references: List[str] = field(default_factory=list)
    confidence_breakdown: Dict[str, Any] = field(default_factory=dict)
    uncertainty_interval: Dict[str, float] = field(default_factory=dict)
    falsification_conditions: List[str] = field(default_factory=list)
    evidence_class: str = "exploratory"
    reproducibility_tier: str = "exploratory"
    claim_tier: str = "speculative_exploratory"
    provenance: Dict[str, Any] = field(default_factory=dict)
    # ARA P0 additive fidelity / provenance (optional; additive contract).
    primary_sources: List[str] = field(default_factory=list)
    theory_model_version: str = ""
    author_equations_vs_simulator_approximations: Dict[str, str] = field(
        default_factory=dict
    )
    free_or_fitted_parameters: List[Dict[str, Any]] = field(default_factory=list)
    source_domain_limits: List[str] = field(default_factory=list)
    model_fidelity: str = "approximate"  # fidelity axis ≠ empirical support
    empirical_support: str = "speculative"  # independent of model_fidelity


@dataclass
class TheoryMetadata:
    """Descriptive metadata for a theory, returned by the list endpoint."""

    theory_id: str
    theory_name: str
    description: str
    configurable_parameters: Dict[str, Any]
    references: List[str] = field(default_factory=list)
    category: str = "general"
    primary_sources: List[str] = field(default_factory=list)
    theory_model_version: str = ""
    model_fidelity: str = "approximate"
    empirical_support: str = "speculative"
    control_role: str = ""  # "", "baseline", "null", "shared_mechanism"


@runtime_checkable
class TheoryModule(Protocol):
    """Protocol that all LENR theory modules must satisfy.

    Implementations are structural (duck-typed): any class that exposes
    the required properties and methods is considered a ``TheoryModule``
    even without explicit inheritance.
    """

    @property
    def theory_id(self) -> str:
        """Unique machine-readable identifier."""
        ...

    @property
    def theory_name(self) -> str:
        """Human-readable display name."""
        ...

    @property
    def description(self) -> str:
        """Short prose description of the theory."""
        ...

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        """Dict mapping parameter names to their default values / metadata."""
        ...

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        """Return ``True`` if the theory's physical assumptions hold."""
        ...

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        """Run the theory calculation and return a contribution."""
        ...

    def get_metadata(self) -> TheoryMetadata:
        """Return serialisable metadata about this theory."""
        ...
