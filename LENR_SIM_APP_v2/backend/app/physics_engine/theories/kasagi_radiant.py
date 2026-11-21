"""
Kasagi radiant / BREMS spectral calorimetry pathway (ENG-HS-07 / HIP-05).

Couples ``radiant_calorimetry``, ``h2_absorb_pressure_pa``, and
``multilayer_stack`` into a cite-gated model_output heat channel distinct from
ambient electrolytic Miles seed assumptions.

Literature scale (kasagi2026 / JCMNS 41 / arXiv:2509.13847):
- NiCu multilayer radiant Q_ex ≈ 1.1 W
- Pure-Ni control ≈ 0.9 W
- σ_Q ≈ 0.08 W is literature MoE on corpus rows — this module does **not**
  invent or emit discovery σ; energy is model_output only.

References:
    Kasagi, Itoh, Shibasaki, Iwamura (2026), JCMNS 41, 62-72 — kasagi2026
    doi:10.70923/001c.163335 / arXiv:2509.13847
"""

from __future__ import annotations

import math
import re
from typing import Any, Dict, Optional, Tuple

from app.physics_engine.heating_mode import resolve_heating_mode
from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata

# Cite-gated literature peak scales (watts) — model_output drivers, not MoE.
_Q_NICU_W = 1.1
_Q_NI_CONTROL_W = 0.9
_P_ABSORB_REF_PA = 250.0
_T_REF_K = 1100.0

_PRIMARY_REFS = [
    "Kasagi, Itoh, Shibasaki, Iwamura (2026), JCMNS 41, 62-72 — kasagi2026",
    "Kasagi et al. (2026), arXiv:2509.13847 — doi:10.70923/001c.163335",
]


def _truthy(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def _parse_bilayer_count(stack: Optional[str]) -> Tuple[int, bool]:
    """Return (bilayer_count, has_multilayer_flag) from stack string."""
    if not stack or not str(stack).strip():
        return 0, False
    text = str(stack).strip()
    match = re.search(r"(\d+)\s*[x×]", text, flags=re.IGNORECASE)
    if match:
        return max(int(match.group(1)), 1), True
    # Any non-empty stack description still counts as multilayer present.
    return 1, True


def _is_radiant_regime(conditions: Dict[str, Any]) -> bool:
    if _truthy(conditions.get("radiant_calorimetry")):
        return True
    mode = resolve_heating_mode(conditions)
    return mode == "radiant"


class KasagiRadiantTheory:
    """BREMS / radiant-spectrum heat pathway for Kasagi-class Ni–H cells."""

    @property
    def theory_id(self) -> str:
        return "kasagi_radiant"

    @property
    def theory_name(self) -> str:
        return "Kasagi Radiant BREMS Calorimetry"

    @property
    def description(self) -> str:
        return (
            "Radiant-spectrum / BREMS calorimetry pathway for H₂ desorption from "
            "Ni or NiCu multilayer hosts. Couples multilayer stack and absorb "
            "pressure into cite-gated model_output heat (≈0.9–1.1 W literature "
            "scale). Not electrolytic Miles seed; not discovery MoE."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "q_nicu_watts": {
                "default": _Q_NICU_W,
                "description": "Cite-gated NiCu multilayer radiant Q scale (W)",
            },
            "q_ni_control_watts": {
                "default": _Q_NI_CONTROL_W,
                "description": "Cite-gated pure-Ni radiant control Q scale (W)",
            },
            "absorb_pressure_ref_pa": {
                "default": _P_ABSORB_REF_PA,
                "description": "Reference H₂ absorb pressure (Pa)",
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        return _is_radiant_regime(conditions)

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        if not self.is_applicable(conditions):
            return self._neutral("radiant_calorimetry / heating_mode=radiant required")

        T = float(conditions.get("temperature", 300.0) or 300.0)
        loading = float(conditions.get("loading_ratio", 0.4) or 0.4)
        p_absorb = conditions.get("h2_absorb_pressure_pa")
        if p_absorb is None:
            p_absorb = conditions.get("pressure", _P_ABSORB_REF_PA)
        p_absorb = float(p_absorb or _P_ABSORB_REF_PA)
        stack = conditions.get("multilayer_stack") or config.get("multilayer_stack")
        bilayer_count, has_multilayer = _parse_bilayer_count(
            str(stack) if stack is not None else None
        )

        q_nicu = float(config.get("q_nicu_watts", _Q_NICU_W))
        q_ni = float(config.get("q_ni_control_watts", _Q_NI_CONTROL_W))
        p_ref = float(config.get("absorb_pressure_ref_pa", _P_ABSORB_REF_PA))

        # Base scale: multilayer NiCu vs pure-Ni control.
        base_q = q_nicu if has_multilayer else q_ni
        # Mild bilayer count boost (6× stack → 1.0; fewer bilayers demote slightly).
        if has_multilayer:
            bilayer_factor = min(max(bilayer_count / 6.0, 0.5), 1.15)
        else:
            bilayer_factor = 1.0
        # Absorb-pressure proximity to Kasagi ~250 Pa protocol.
        pressure_factor = math.exp(-((math.log10(max(p_absorb, 1.0)) - math.log10(p_ref)) ** 2))
        # Temperature window around ~1100 K desorption protocol.
        temp_factor = 1.0 / (1.0 + math.exp(-(T - 900.0) / 80.0))
        temp_factor *= math.exp(-((T - _T_REF_K) / 250.0) ** 2)
        # Loading soft factor (Kasagi L ~0.35–0.40).
        loading_factor = math.exp(-((loading - 0.40) / 0.25) ** 2)

        energy_watts = (
            base_q * bilayer_factor * pressure_factor * temp_factor * loading_factor
        )
        # Bound to literature neighborhood; refuse runaway watts.
        energy_watts = float(min(max(energy_watts, 0.0), max(q_nicu, q_ni) * 1.25))

        confidence = 0.55 * pressure_factor * temp_factor
        if has_multilayer:
            confidence = min(confidence + 0.15, 0.85)

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=1.0,  # calorimetry pathway, not barrier enhancer
            reaction_rate_modifier=1.0,
            energy_output_watts=energy_watts,
            observables={
                "radiant_pathway": "brems_spectral",
                "model_output_heat_W": energy_watts,
                "literature_q_nicu_W": q_nicu,
                "literature_q_ni_control_W": q_ni,
                "has_multilayer": has_multilayer,
                "bilayer_count": bilayer_count,
                "h2_absorb_pressure_pa": p_absorb,
                "pressure_factor": pressure_factor,
                "temperature_factor": temp_factor,
                "loading_factor": loading_factor,
                "bilayer_factor": bilayer_factor,
                "product_He4": 0.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
                "honesty_class": "model_output",
                "not_discovery_moe": True,
            },
            parameters_used={
                "temperature": T,
                "loading_ratio": loading,
                "h2_absorb_pressure_pa": p_absorb,
                "multilayer_stack": str(stack) if stack else "",
                "radiant_calorimetry": 1.0,
                "heating_mode": "radiant",
            },
            is_applicable=True,
            confidence=float(confidence),
            # Governance vocabulary tier (never invent discovery / EMP upgrade).
            claim_tier="speculative_exploratory",
            evidence_class="exploratory",
            provenance={
                "source": "kasagi2026",
                "validation_status": "unvalidated",
                "model_version": "hip05-eng-hs-07-v1",
                "is_model_output": True,
                "honesty_class": "model_output",
                "not_discovery_claim": True,
                "lenr_proved": False,
                "eq_open_closed": False,
                "discovery_moe": False,
                "pathway": "radiant_brems_spectral",
                "note": (
                    "Coupled radiant path uses cite-gated Kasagi Q scales as "
                    "model_output drivers; does not invent σ_Q or raise claim tiers."
                ),
            },
            falsification_conditions=[
                "Invalid if radiant_calorimetry is false / heating_mode ≠ radiant.",
                "Invalid if treated as literature MoE or discovery-grade σ_Q.",
                "Invalid if used to close EQ-OPEN-* or flip lenr_proved.",
            ],
            references=list(_PRIMARY_REFS),
            model_fidelity="phenomenological",
            empirical_support="partial",
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=list(_PRIMARY_REFS),
            category="measurement",
            model_fidelity="phenomenological",
            empirical_support="partial",
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=1.0,
            reaction_rate_modifier=1.0,
            energy_output_watts=0.0,
            observables={"inapplicable_reason": reason, "not_discovery_moe": True},
            parameters_used={},
            is_applicable=False,
            confidence=0.0,
            claim_tier="speculative_exploratory",
            evidence_class="exploratory",
            provenance={
                "source": "kasagi2026",
                "validation_status": "unvalidated",
                "is_model_output": True,
                "honesty_class": "model_output",
                "lenr_proved": False,
                "discovery_moe": False,
            },
            references=list(_PRIMARY_REFS),
        )
