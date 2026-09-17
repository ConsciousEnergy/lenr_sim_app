"""
Shoulders EVOs / charge clusters — phenomenological stub (ARA P0).

Kenneth Shoulders' high-density charge clusters / EVOs are treated here as a
**phenomenological** registry module only. No invented nuclear rate law is
attributed to the author. Full branch-network dynamics are deferred to ARA P1.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata

logger = logging.getLogger(__name__)

_PRIMARY = [
    "Shoulders K. (1991) EVOs / charge clusters (phenomenological reports)",
    "Shoulders K. & Shoulders S. (1996) observations of charge clusters",
]


class ShouldersEVOTheory:
    """Phenomenological Shoulders EVO / charge-cluster stub (no invented rates)."""

    @property
    def theory_id(self) -> str:
        return "shoulders_evo"

    @property
    def theory_name(self) -> str:
        return "Shoulders EVO / charge clusters (phenomenological)"

    @property
    def description(self) -> str:
        return (
            "Registry stub for Shoulders high-density charge clusters / EVOs. "
            "Phenomenological labels only — no invented nuclear rate law. "
            "Branch networks queued for ARA P1 (0.3.9)."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "cluster_charge_q": {
                "default": 1e8,
                "description": "Reported cluster charge scale (exploratory free param)",
            },
            "observer_geometry": {
                "default": "unspecified",
                "description": "Observation geometry label (not a rate law)",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        return float(conditions.get("temperature", 0) or 0) > 0

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        q = float(config.get("cluster_charge_q", 1e8) or 1e8)
        geom = str(config.get("observer_geometry", "unspecified"))
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=1.0,
            reaction_rate_modifier=1.0,
            energy_output_watts=0.0,
            observables={
                "cluster_charge_q": q,
                "phenomenological_only": 1.0,
                "product_He4": 0.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
            },
            parameters_used={
                "temperature": float(conditions.get("temperature", 300.0)),
                "cluster_charge_q": q,
            },
            is_applicable=True,
            confidence=0.2,
            claim_tier="speculative_exploratory",
            evidence_class="exploratory",
            references=list(_PRIMARY),
            primary_sources=list(_PRIMARY),
            theory_model_version="shoulders_evo_p0_pheno_v1",
            author_equations_vs_simulator_approximations={
                "nuclear_rate_law": "not_implemented_no_invented_author_rate",
                "cluster_charge_q": "exploratory_free_parameter",
                "observer_geometry": geom,
            },
            free_or_fitted_parameters=[
                {"name": "cluster_charge_q", "kind": "free", "source": "simulator"},
            ],
            source_domain_limits=[
                "Phenomenological EVO / charge-cluster reports only.",
                "Do not attribute invented fusion rates to Shoulders.",
            ],
            model_fidelity="phenomenological",
            empirical_support="speculative",
            falsification_conditions=[
                "If charged-cluster signatures are absent under claimed drive geometry, "
                "do not cite this stub as positive evidence.",
            ],
            provenance={
                "implementation_role": "phenomenological_stub",
                "no_invented_rate_law": True,
                "p1_rebuild_status": "started_scaffold",
                "p1_rebuild_targets": [
                    "phenomenological_branch_network",
                    "no_invented_author_rate_laws",
                ],
            },
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=list(_PRIMARY),
            category="mechanism",
            primary_sources=list(_PRIMARY),
            theory_model_version="shoulders_evo_p0_pheno_v1",
            model_fidelity="phenomenological",
            empirical_support="speculative",
        )
