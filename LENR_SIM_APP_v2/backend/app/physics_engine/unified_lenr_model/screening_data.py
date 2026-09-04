"""Measured electron-screening potentials for LENR host materials.

Single source of truth for screening-potential values, replacing scattered
hardcoded scalars (e.g. ``screening_potential = 800.0``) with cited,
material-dependent *ranges*. Addresses finding RR-007 / IL-004.

Experimental context (see docs/REVIEW_2026/TRACEABILITY_MATRIX.md):
- Gas-target d(d,p)t screening sits at the adiabatic limit U_e ~ 20-25 eV.
- Deuterated metals show strongly enhanced, material- and site-dependent values:
  Pd ~250-800 eV (up to ~18 keV in "hard" Pd), Ta/Zr ~300-320 eV, with a clear
  dependence on host lattice, impurities, and the deuteron's lattice position.
  This "anomalous screening" is unexplained by static Thomas-Fermi theory and is
  attributed to dynamic / coherent screening.

References:
- raiola2002: Raiola et al., d(d,p)t screening in deuterated metals (2002).
- huke2008: Huke et al., enhanced screening across the periodic table (2008).
- czerski2023: Electron screening in palladium, doi:10.1016/j.physletb.2023.137750.
- screeningreview2024: Particles 7(3):50 (2024), doi:10.3390/particles7030050.
- pines2020theory: Pines et al., Phys. Rev. C 101, 044609 (2020) (Ue~347 eV ErD3).

These ranges are intended as priors for the Phase 5 uncertainty quantification,
not as single deterministic constants.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

from app.data.dataset_io import screening_priors

# Adiabatic (gas-target) limit common to all hosts (eV).
ADIABATIC_LIMIT_EV: float = float(screening_priors().get("adiabatic_limit_eV", 25.0))


@dataclass(frozen=True)
class ScreeningPotentialRange:
    """Cited screening-potential range for a host material (all eV)."""

    material: str
    minimum: float
    typical: float
    maximum: float
    citations: List[str]
    note: str = ""

    def as_uq_prior(self) -> Dict[str, float]:
        """Return a bounded prior dict for UQ sampling (RORO)."""
        return {
            "min_eV": float(self.minimum),
            "typical_eV": float(self.typical),
            "max_eV": float(self.maximum),
            "adiabatic_limit_eV": ADIABATIC_LIMIT_EV,
        }


def _ranges_from_dataset() -> Dict[str, ScreeningPotentialRange]:
    rows = screening_priors().get("materials") or []
    ranges: Dict[str, ScreeningPotentialRange] = {}
    for row in rows:
        material = str(row["material"]).strip().lower()
        ranges[material] = ScreeningPotentialRange(
            material=material,
            minimum=float(row["minimum_eV"]),
            typical=float(row["typical_eV"]),
            maximum=float(row["maximum_eV"]),
            citations=list(row.get("citations") or []),
            note=str(row.get("note") or ""),
        )
    return ranges


# Material key -> measured range. ``typical`` preserves the legacy scalar
# defaults used elsewhere in the engine so behavior is unchanged by default.
MEASURED_SCREENING_POTENTIAL_EV: Dict[str, ScreeningPotentialRange] = (
    _ranges_from_dataset()
)


def get_screening_potential_range(material: str) -> ScreeningPotentialRange:
    """Return the cited screening-potential range for ``material``.

    Falls back to palladium (the best-characterised host) for unknown materials.
    """
    key = (material or "").strip().lower()
    return MEASURED_SCREENING_POTENTIAL_EV.get(
        key, MEASURED_SCREENING_POTENTIAL_EV["palladium"]
    )


def get_screening_potential(material: str) -> float:
    """Return the typical (point-estimate) screening potential in eV.

    Backward-compatible accessor that reproduces the legacy scalar defaults.
    """
    return get_screening_potential_range(material).typical
