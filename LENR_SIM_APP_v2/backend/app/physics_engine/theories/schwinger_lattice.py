"""
Schwinger — Nuclear Energy in an Atomic Lattice (historical-control scaffold).

Julian Schwinger approached CMNS from mainstream QFT/nuclear physics. This
module is an ARA Wave-1 **scaffold**: provenance, predicted signatures,
H₂O-in-D₂O (HD) sensitivity parameter, and falsifiers — **no invented
quantitative nuclear rate law**.

Primary sources (LENR-CANR):
  - Schwinger J. Cold Fusion: A Hypothesis
  - Schwinger J. Nuclear Energy in an Atomic Lattice
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata
from app.physics_engine.workbench_enrichment import catalog_entry

logger = logging.getLogger(__name__)

_PRIMARY = [
    "Schwinger J. Cold Fusion: A Hypothesis (LENR-CANR acrobat/SchwingerJcoldfusion.pdf)",
    "Schwinger J. Nuclear Energy in an Atomic Lattice (LENR-CANR acrobat/SchwingerJnuclearene.pdf)",
]

_WB = catalog_entry("schwinger_lattice")


class SchwingerLatticeTheory:
    """Schwinger NEAL historical-control scaffold (no invented rate law)."""

    @property
    def theory_id(self) -> str:
        return "schwinger_lattice"

    @property
    def theory_name(self) -> str:
        return "Schwinger — Nuclear Energy in an Atomic Lattice"

    @property
    def description(self) -> str:
        return (
            "Historical-control scaffold for Schwinger's lattice-coupled nuclear "
            "hypothesis (strongly deuterated Pd, possible HD as well as DD, "
            "nuclear energy into lattice excitations rather than hard gamma, "
            "H₂O/D₂O admixture as a critical experiment). No invented quantitative "
            "rate law — qualitative / parameterized sensitivity only."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "h_fraction_in_d2o": {
                "default": 0.01,
                "description": (
                    "H fraction in D₂O electrolyte (Schwinger HD critical experiment)"
                ),
            },
            "lattice_coherence_label": {
                "default": "unspecified",
                "description": "Collective lattice region label (not a rate law)",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        loading = float(conditions.get("loading_ratio", 0) or 0)
        return loading > 0.5

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        h_frac = float(config.get("h_fraction_in_d2o", 0.01) or 0.01)
        h_frac = max(0.0, min(1.0, h_frac))
        coherence = str(config.get("lattice_coherence_label", "unspecified"))
        loading = float(conditions.get("loading_ratio", 0.9) or 0.9)

        # Qualitative HD-sensitivity index only — not a nuclear rate.
        # Peaks at small H admixture (order ~1%), falls toward pure H or pure D.
        hd_sensitivity = 4.0 * h_frac * (1.0 - h_frac)

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=1.0,
            reaction_rate_modifier=1.0,
            energy_output_watts=0.0,
            observables={
                "h_fraction_in_d2o": h_frac,
                "hd_sensitivity_index": hd_sensitivity,
                "loading_ratio": loading,
                "phenomenological_only": 1.0,
                "product_He3_hd_channel": 1.0 if h_frac > 0 else 0.0,
                "product_He4": 0.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
            },
            parameters_used={
                "temperature": float(conditions.get("temperature", 300.0)),
                "loading_ratio": loading,
                "h_fraction_in_d2o": h_frac,
            },
            is_applicable=self.is_applicable(conditions),
            confidence=0.25,
            claim_tier="speculative_exploratory",
            evidence_class="exploratory",
            references=list(_PRIMARY),
            primary_sources=list(_PRIMARY),
            theory_model_version="schwinger_lattice_p0_scaffold_v1",
            author_equations_vs_simulator_approximations={
                "nuclear_rate_law": "not_implemented_no_invented_author_rate",
                "hd_sensitivity_index": "simulator_qualitative_parameterization",
                "lattice_coherence_label": coherence,
            },
            free_or_fitted_parameters=[
                {
                    "name": "h_fraction_in_d2o",
                    "kind": "experimental_knob",
                    "source": "Schwinger_HD_critical_experiment",
                },
            ],
            source_domain_limits=[
                "Historical-control scaffold only.",
                "Do not invent a Schwinger fusion rate to fit heat.",
                "Interactive H/D discrimination UI deferred to ARA P2.",
            ],
            model_fidelity="phenomenological",
            empirical_support="speculative",
            falsification_conditions=[
                "If heat shows no sensitivity to small H₂O admixture where the "
                "HD hypothesis requires it, do not cite this scaffold as support.",
            ],
            predicted_signatures=list(_WB.get("predicted_signatures", [])),
            falsifiers=list(_WB.get("falsifiers", [])),
            taxonomy_kind="named_theory",
            equation_citations=list(_WB.get("equation_citations", [])),
            identifiability_warnings=list(_WB.get("identifiability_warnings", [])),
            historical_parents=list(_WB.get("historical_parents", [])),
            display_model_version=str(_WB.get("display_model_version", "")),
            provenance={
                "implementation_role": "historical_control_scaffold",
                "no_invented_rate_law": True,
                "control_role": "",
                "hd_critical_experiment": True,
                "p1_rebuild_status": "not_started",
            },
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=list(_PRIMARY),
            category="historical_control",
            primary_sources=list(_PRIMARY),
            theory_model_version="schwinger_lattice_p0_scaffold_v1",
            model_fidelity="phenomenological",
            empirical_support="speculative",
            control_role="",
            predicted_signatures=list(_WB.get("predicted_signatures", [])),
            falsifiers=list(_WB.get("falsifiers", [])),
            taxonomy_kind="named_theory",
            equation_citations=list(_WB.get("equation_citations", [])),
            identifiability_warnings=list(_WB.get("identifiability_warnings", [])),
            historical_parents=list(_WB.get("historical_parents", [])),
            display_model_version=str(_WB.get("display_model_version", "")),
        )
