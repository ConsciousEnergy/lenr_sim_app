"""Czerski thermal-spike / ion-track DD fusion theory module.

Physics
-------
Low-energy deuteron beams in metal hydrides form collision-cascade ion tracks.
Electron–phonon coupling deposits a fraction of electronic excitation into a
nanometre-scale track, raising the local phonon temperature above melting and
enabling *thermal* DD fusion (near-rest CM protons) in addition to the
beam–target channel. Electron screening and the near-threshold 0+ resonance in
⁴He set the absolute plateau yield.

This module is accelerator-constrained phenomenology. It is **not** a proof of
electrolytic LENR and must not replace the ``two_body`` baseline (RR-006).

References
----------
Czerski et al., arXiv:2409.02112 — czerski2024a
Czerski et al., Phys. Rev. C 106, L011601 (2022) — czerski2022
ICCF-27 / Zakopane 2026 molecular-beam talks — czerski2026
"""

from __future__ import annotations

import logging
import math
from typing import Any, Dict, Optional

from scipy import constants as const

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.physics_engine.theory_protocol import TheoryContribution, TheoryMetadata
from app.physics_engine.unified_lenr_model.screening_data import (
    get_screening_potential,
)

logger = logging.getLogger(__name__)

KB = const.k
E_CHARGE = const.e
ALPHA = const.alpha
C = const.c
MP = const.m_p
MN = const.m_n
MD = MP + MN

# ZrD2 optical phonon energy (Czerski arXiv:2409.02112).
PHONON_ENERGY_EV = 0.100
# Fraction of electronic excitation coupled to the lattice (ion-track literature).
E_PH_FRACTION = 0.10  # model assumption
# Reference track temperature at 2 keV on ZrD2 (same paper).
T_TRACK_REF_K = 2540.0
E_BEAM_REF_KEV = 2.0
# Zakopane 2026: intact D3+ vs D2+ plateau yield ratio.
D3_OVER_D2_FACTOR = 1.5
Q_VALUE_MEV = 23.8


class CzerskiThermalSpikeTheory:
    """Ion-track thermal-spike enhancement of low-energy DD fusion."""

    @property
    def theory_id(self) -> str:
        return "czerski_thermal_spike"

    @property
    def theory_name(self) -> str:
        return "Czerski Thermal Spike (ion tracks)"

    @property
    def description(self) -> str:
        return (
            "Beam-induced ion tracks heat a nanometre volume via electron–phonon "
            "coupling; thermal DD fusion in the track is enhanced by material "
            "electron screening and the ⁴He threshold resonance. Accelerator "
            "phenomenology — not an electrolytic LENR proof."
        )

    @property
    def configurable_parameters(self) -> Dict[str, Any]:
        return {
            "phonon_energy_eV": {
                "default": PHONON_ENERGY_EV,
                "description": "Optical phonon energy (eV); ZrD2 cited 0.100 eV",
            },
            "e_ph_fraction": {
                "default": E_PH_FRACTION,
                "description": "Electron–phonon energy fraction (model assumption ~0.1)",
            },
            "molecular_beam_species": {
                "default": "D1",
                "description": "D1, D2, or D3 molecular projectile",
                "options": ["D1", "D2", "D3"],
            },
        }

    def is_applicable(self, conditions: Dict[str, float]) -> bool:
        """Beam-gated: stay inert on electrolytic Pd-D so composition stays additive."""
        if float(conditions.get("temperature", 0) or 0) <= 0:
            return False
        beam = float(
            conditions.get("beam_energy_kev", 0.0) or 0.0
        )
        analog = bool(conditions.get("analog_cascade"))
        return beam > 0.0 or analog

    def calculate(
        self,
        conditions: Dict[str, float],
        config: Optional[Dict[str, Any]] = None,
    ) -> TheoryContribution:
        config = config or {}
        if not self.is_applicable(conditions):
            return self._neutral("requires beam_energy_kev > 0 or analog_cascade")

        t_bulk = float(conditions.get("temperature", 300.0) or 300.0)
        beam_kev = float(
            config.get("beam_energy_kev", conditions.get("beam_energy_kev", 0.0)) or 0.0
        )
        analog = beam_kev <= 0.0
        if analog:
            beam_kev = 0.5  # lattice-cascade analog; low confidence

        species = str(
            config.get(
                "molecular_beam_species",
                conditions.get("molecular_beam_species", "D1"),
            )
            or "D1"
        ).upper()
        mol_factor = D3_OVER_D2_FACTOR if species in {"D3", "D3+"} else 1.0

        host = str(
            conditions.get("host_material")
            or conditions.get("material")
            or "palladium"
        ).strip().lower()
        u_e = float(get_screening_potential(host))

        t_track = min(5000.0, max(t_bulk, T_TRACK_REF_K * (beam_kev / E_BEAM_REF_KEV)))
        e_ph_frac = float(config.get("e_ph_fraction", E_PH_FRACTION))
        t_track = t_bulk + e_ph_frac * (t_track - t_bulk)

        def _gamow_exponent(temp_k: float) -> float:
            energy_j = 1.5 * KB * max(temp_k, 1.0) + u_e * E_CHARGE
            mu = MD / 2.0
            eta = ALPHA * math.sqrt(mu * C * C / (2.0 * max(energy_j, 1e-30)))
            return min(2.0 * math.pi * eta, 500.0)

        exp_bulk = _gamow_exponent(t_bulk)
        exp_track = _gamow_exponent(t_track)
        p_bulk = math.exp(-exp_bulk)
        p_track = math.exp(-exp_track)
        ratio = p_track / max(p_bulk, 1e-300)
        enhancement = min(max(1.0, ratio * mol_factor), MAX_ENHANCEMENT_FACTOR)

        confidence = 0.15 if analog else min(0.45, 0.20 + 0.05 * min(beam_kev, 5.0))
        host_label = host.replace("_", " ")

        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            enhancement_factor=enhancement,
            reaction_rate_modifier=enhancement,
            energy_output_watts=0.0,
            observables={
                "T_track_K": float(t_track),
                "T_bulk_K": float(t_bulk),
                "beam_energy_kev": float(beam_kev),
                "analog_cascade": 1.0 if analog else 0.0,
                "U_e_eV": float(u_e),
                "mol_factor": float(mol_factor),
                "phonon_energy_eV": float(PHONON_ENERGY_EV),
                "product_He4": 1.0,
                "product_neutrons": 0.0,
                "product_gamma": 0.0,
                "product_tritium": 1.0,
            },
            parameters_used={
                "temperature": t_bulk,
                "beam_energy_kev": beam_kev,
                "host_material": host,
                "U_e_eV": u_e,
                "molecular_beam_species": species,
            },
            is_applicable=True,
            confidence=confidence,
            references=[
                "Czerski et al., Observation of Thermal Deuteron-Deuteron Fusion "
                "in Ion Tracks, arXiv:2409.02112 — czerski2024a",
                "Czerski et al., Phys. Rev. C 106, L011601 (2022) — czerski2022",
                "Thulichery et al., Zakopane 2026 / ICCF-27 thermal-spike talks — czerski2026",
            ],
            primary_sources=[
                "Czerski et al., arXiv:2409.02112 — czerski2024a",
            ],
            theory_model_version="czerski_thermal_spike_p0_v1",
            author_equations_vs_simulator_approximations={
                "track_temperature": (
                    "author: TRIM + e-ph coupling for ZrD2 at 2 keV; "
                    "simulator: linear scale of cited 2540 K with beam_energy_kev"
                ),
                "enhancement": (
                    "simulator Gamow ratio at T_track vs T_bulk with screening U_e; "
                    "not a full resonance + diffusion calculation"
                ),
            },
            free_or_fitted_parameters=[
                {"name": "e_ph_fraction", "value": e_ph_frac, "label": "model assumption"},
                {"name": "phonon_energy_eV", "value": PHONON_ENERGY_EV, "label": "cited ZrD2"},
            ],
            source_domain_limits=[
                "UHV accelerator metal hydrides (Zr, Ti, Pd); not electrolytic cells.",
                "Does not close EQ-OPEN-RATE-01.",
            ],
            model_fidelity="approximate",
            empirical_support="partial",
            claim_tier="speculative_exploratory",
            evidence_class="partial",
            reproducibility_tier="exploratory",
            falsification_conditions=[
                "Yield plateau below ~2.5 keV disappears on UHV-clean defect-free targets "
                "once screening is the adiabatic ~25 eV gas limit.",
                "Proton spectra show only the beam–target kinematic peak "
                "(no near-rest thermal component).",
                f"D3+/D2+ plateau ratio far from {D3_OVER_D2_FACTOR} on the same {host_label} host.",
            ],
            provenance={
                "source": "czerski2024a",
                "validation_status": "accelerator_constrained",
                "author_family": "czerski_ion_track",
                "not_electrolytic_lenr_proof": True,
            },
        )

    def get_metadata(self) -> TheoryMetadata:
        return TheoryMetadata(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            description=self.description,
            configurable_parameters=self.configurable_parameters,
            references=[
                "Czerski et al., arXiv:2409.02112 — czerski2024a",
                "Czerski et al., Phys. Rev. C 106, L011601 (2022) — czerski2022",
            ],
            category="mechanism",
            primary_sources=["Czerski et al., arXiv:2409.02112 — czerski2024a"],
            theory_model_version="czerski_thermal_spike_p0_v1",
            model_fidelity="approximate",
            empirical_support="partial",
        )

    def _neutral(self, reason: str) -> TheoryContribution:
        logger.debug("Czerski thermal spike not applicable: %s", reason)
        return TheoryContribution(
            theory_id=self.theory_id,
            theory_name=self.theory_name,
            is_applicable=False,
            confidence=0.0,
        )
