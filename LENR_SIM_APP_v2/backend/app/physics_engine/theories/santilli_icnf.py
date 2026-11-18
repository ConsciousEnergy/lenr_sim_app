"""
Santilli Intermediate Controlled Nuclear Fusion (ICNF) — phenomenological stub.

Framed from the 2013 ICNF conference confirmations (D+C→N arc / "warm" synthesis
path under hadronic-mechanics language). This v1 module is a **registry stub**:
regime guards, resolvable citations, and tightly bounded observables — **no**
invented Lie-admissible / magnecule rate law.

Primary path (author claim): D + C + TR → N-14 (+ ~10.3 MeV/event claimed).
Not lattice D+D→He⁴. Magnecule / JAS 2007 dynamics are cite-only related work.

References:
    Kadeisvili, Lynch & Yang (2013), Open Phys. Chem. J. 5, 17-27 — kadeisvili2013
    Santilli (2007), J. Appl. Sci. 7, 1679-1698 — santilli2007  (related; not modeled)
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata

logger = logging.getLogger(__name__)

_PRIMARY = [
    "Kadeisvili, Lynch & Yang (2013), Open Phys. Chem. J. 5, 17-27 — kadeisvili2013",
]
_RELATED = [
    "Santilli (2007), J. Appl. Sci. 7, 1679-1698 — santilli2007",
]
_REFS = _PRIMARY + [
    f"{_RELATED[0]}  # related; not modeled in v1",
]

_CARBONACEOUS = frozenset(
    {
        "c",
        "carbon",
        "graphite",
        "carbonaceous",
        "graphite_carbon",
        "carbon_graphite",
    }
)
_DEUTERIUM_LABELS = frozenset({"deuterium", "d2", "d", "deuteron"})
_ARC_TRIGGERS = frozenset({"arc", "plasma", "warm_arc", "plasma_trigger", "icnf_arc"})


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


class SantilliICNFTheory:
    """Santilli ICNF D+C→N phenomenological stub (no invented hadronic rate)."""

    @property
    def theory_id(self) -> str:
        return "santilli_icnf"

    @property
    def theory_name(self) -> str:
        return "Santilli ICNF (D+C→N, phenomenological)"

    @property
    def description(self) -> str:
        return (
            "Phenomenological stub for Santilli Intermediate Controlled Nuclear "
            "Fusion: arc / warm D+C→N synthesis claims (hadronic-mechanics framing). "
            "Not lattice D+D→He⁴. No invented rate law; magnecule dynamics deferred."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "arc_power_kw": {
                "default": 0.0,
                "description": "DC carbon-arc electrical power (kW); regime guard",
            },
            "deuterium_pressure_psi": {
                "default": 0.0,
                "description": "Sealed D₂ fill pressure (psi); regime guard",
            },
            "claimed_mass_defect_mev": {
                "default": 10.339,
                "description": (
                    "Author-claimed D+C→N mass-defect scale (MeV/event); "
                    "label only — model assumption, not a wattage driver"
                ),
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        """Require arc/plasma trigger + deuterium + carbonaceous electrode.

        Default Pd/D electrolysis packs (loading_ratio only) must stay inert.
        """
        if not self._has_arc_or_plasma_trigger(conditions):
            return False
        if not self._has_deuterium_fuel(conditions):
            return False
        if not self._has_carbonaceous_electrode(conditions):
            return False
        return True

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        if not self.is_applicable(conditions):
            return self._neutral("ICNF arc+D+C regime not satisfied")

        claimed_mev = float(
            config.get(
                "claimed_mass_defect_mev",
                conditions.get("claimed_mass_defect_mev", 10.339),
            )
            or 10.339
        )
        # Phenomenological stub: no invented hadronic enhancement or wattage.
        enhancement = min(1.0, MAX_ENHANCEMENT_FACTOR)

        arc_kw = float(
            conditions.get("arc_power_kw", config.get("arc_power_kw", 0.0)) or 0.0
        )
        d_psi = float(
            conditions.get(
                "deuterium_pressure_psi",
                config.get("deuterium_pressure_psi", 0.0),
            )
            or 0.0
        )
        host = str(
            conditions.get("host_material", conditions.get("electrode_material", ""))
            or ""
        )

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=enhancement,
            energy_output_watts=0.0,
            observables={
                "product_N14": 1.0,
                "product_He4": 0.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
                "claimed_mass_defect_mev": claimed_mev,
                "phenomenological_only": 1.0,
                "delta_D": 1.0,
            },
            parameters_used={
                "arc_power_kw": arc_kw,
                "deuterium_pressure_psi": d_psi,
                "claimed_mass_defect_mev": claimed_mev,
                "carbon_electrode": 1.0,
            },
            is_applicable=True,
            confidence=0.2,
            claim_tier="speculative_exploratory",
            evidence_class="exploratory",
            reproducibility_tier="exploratory",
            references=list(_REFS),
            primary_sources=list(_PRIMARY),
            theory_model_version="santilli_icnf_v1_pheno",
            author_equations_vs_simulator_approximations={
                "nuclear_rate_law": "not_implemented_no_invented_hadronic_rate",
                "claimed_mass_defect_mev": "author_claim_label_only_model_assumption",
                "energy_output_watts": "stub_zero_until_cite_gated_calorimetry",
                "magnecule_dynamics": "out_of_scope_v1_related_cite_only",
            },
            free_or_fitted_parameters=[
                {
                    "name": "claimed_mass_defect_mev",
                    "kind": "label",
                    "source": "kadeisvili2013_eq_1_1",
                },
            ],
            source_domain_limits=[
                "ICNF arc / warm D+C→N path only; not lattice D+D→He⁴.",
                "Hadronic mechanics / Lie-admissible operators not implemented.",
                "Magnecule chemistry and O+C→Si channels deferred.",
            ],
            model_fidelity="phenomenological",
            empirical_support="speculative",
            taxonomy_kind="named_theory",
            falsification_conditions=[
                "Significant external neutron or hard-gamma excess above background "
                "during claimed ICNF operation contradicts the 'no harmful radiation' claim.",
                "No reproducible N enrichment with D depletion under sealed D₂ + C-arc "
                "protocol after blank/impurity controls → do not treat stub as positive evidence.",
                "Calorimetry fully accounted by arc joule heating with no residual → "
                "do not cite excess-heat signature from this module.",
                "Attributing D+D→He⁴ primary yield to santilli_icnf is model misuse "
                "(out of Santilli ICNF spin/coupling laws for this path).",
            ],
            predicted_signatures=[
                {
                    "id": "product_N14",
                    "polarity": "positive",
                    "regime": "D2_C_arc_ICNF",
                },
                {
                    "id": "product_He4",
                    "polarity": "absent",
                    "regime": "D_C_to_N_primary_path",
                },
                {
                    "id": "product_neutrons",
                    "polarity": "absent_or_background",
                    "regime": "exterior_claim",
                },
                {
                    "id": "product_gamma",
                    "polarity": "absent_or_background",
                    "regime": "exterior_harmful_radiation_claim",
                },
            ],
            falsifiers=[
                {
                    "required_condition": "Claimed ICNF D₂ + carbon-arc run",
                    "prediction": "Exterior n/γ near background; N↑ with D↓",
                    "contradicting_observation": (
                        "Hard γ/n spectrum incompatible with ICNF radiation claims, "
                        "or no N enrichment under claimed arc conditions"
                    ),
                }
            ],
            provenance={
                "source": "kadeisvili2013",
                "validation_status": "unvalidated",
                "model_version": "santilli_icnf_v1_pheno",
                "implementation_role": "phenomenological_stub",
                "no_invented_rate_law": True,
                "related_not_modeled": ["santilli2007"],
                "host_or_electrode_material": host,
                "lenr_proved": False,
                "eq_open_closed": False,
                "discovery_moe": False,
            },
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=list(_REFS),
            category="mechanism",
            primary_sources=list(_PRIMARY),
            theory_model_version="santilli_icnf_v1_pheno",
            model_fidelity="phenomenological",
            empirical_support="speculative",
            taxonomy_kind="named_theory",
            display_model_version="Santilli ICNF v1 (phenomenological)",
            predicted_signatures=[
                {"id": "product_N14", "polarity": "positive", "regime": "D2_C_arc_ICNF"},
            ],
            falsifiers=[
                {
                    "required_condition": "Claimed ICNF D₂ + carbon-arc run",
                    "prediction": "Exterior n/γ near background; N↑ with D↓",
                    "contradicting_observation": (
                        "Hard γ/n spectrum or absent N enrichment under claimed conditions"
                    ),
                }
            ],
            identifiability_warnings=[
                "Enhancement and wattage are stubbed; do not fit industrial power from this module.",
            ],
            historical_parents=["santilli2007"],
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=1.0,
            reaction_rate_modifier=1.0,
            energy_output_watts=0.0,
            observables={
                "product_N14": 0.0,
                "product_He4": 0.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
                "phenomenological_only": 1.0,
            },
            parameters_used={},
            is_applicable=False,
            confidence=0.0,
            claim_tier="speculative_exploratory",
            evidence_class="exploratory",
            reproducibility_tier="exploratory",
            references=list(_REFS),
            primary_sources=list(_PRIMARY),
            theory_model_version="santilli_icnf_v1_pheno",
            model_fidelity="phenomenological",
            empirical_support="speculative",
            taxonomy_kind="named_theory",
            falsification_conditions=[
                "Module inert outside arc+D+C regime; do not cite as Pd/D electrolysis evidence.",
            ],
            provenance={
                "source": "kadeisvili2013",
                "validation_status": "unvalidated",
                "model_version": "santilli_icnf_v1_pheno",
                "implementation_role": "phenomenological_stub",
                "neutral_reason": reason,
                "lenr_proved": False,
            },
        )

    @staticmethod
    def _has_arc_or_plasma_trigger(conditions: Dict[str, Any]) -> bool:
        arc_kw = float(conditions.get("arc_power_kw", 0) or 0)
        if arc_kw > 0:
            return True
        if _truthy(conditions.get("plasma_trigger", False)):
            return True
        if _truthy(conditions.get("arc_trigger", False)):
            return True
        trigger = str(conditions.get("trigger_mode", "") or "").strip().lower()
        return trigger in _ARC_TRIGGERS

    @staticmethod
    def _has_deuterium_fuel(conditions: Dict[str, Any]) -> bool:
        d_psi = float(conditions.get("deuterium_pressure_psi", 0) or 0)
        if d_psi > 0:
            return True
        if float(conditions.get("deuterium_fraction", 0) or 0) > 0.5:
            return True
        reactant = str(conditions.get("reactant", "") or "").strip().lower()
        fuel = str(conditions.get("fuel", "") or "").strip().lower()
        return reactant in _DEUTERIUM_LABELS or fuel in _DEUTERIUM_LABELS

    @staticmethod
    def _has_carbonaceous_electrode(conditions: Dict[str, Any]) -> bool:
        if _truthy(conditions.get("carbon_electrode", False)):
            return True
        host = str(conditions.get("host_material", "") or "").strip().lower()
        electrode = str(conditions.get("electrode_material", "") or "").strip().lower()
        return host in _CARBONACEOUS or electrode in _CARBONACEOUS
