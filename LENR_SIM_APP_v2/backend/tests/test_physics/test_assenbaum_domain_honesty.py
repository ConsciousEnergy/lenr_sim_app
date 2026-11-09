"""Assenbaum domain honesty (EQ-ASSEN-DOM-01) vs Lean / RR-007 adiabatic floor.

Hard invariants for this suite:
- Do not claim the Assenbaum formula when U_e >= E_kin.
- Do not conflate Assenbaum domain with the adiabatic gas-target floor.
- Do not close EQ-OPEN-* or set lenr_proved.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from app.physics_engine.screening_kernel import (
    LEAN_THERMAL_E_KIN_EV,
    LEAN_THERMAL_U_E_EV,
    SCREENING_MODEL_ID,
    assenbaum_applicable,
    assenbaum_formula_claimed,
    compute_screening_enhancement,
)
from app.physics_engine.unified_lenr_model.screening_data import ADIABATIC_LIMIT_EV


def _repo_root() -> Path:
    start = Path(__file__).resolve()
    for candidate in (start, *start.parents):
        if (candidate / "formalization" / "lean" / "LenrFormal").is_dir():
            return candidate
    raise RuntimeError("repository root not found")


class TestAssenbaumDomainPredicate:
    def test_matches_lean_thermal_not_applicable_anchor(self) -> None:
        # Lean Assenbaum.thermal_not_applicable: U_e=300000 meV, E=100 meV.
        assert LEAN_THERMAL_U_E_EV == pytest.approx(300.0)
        assert LEAN_THERMAL_E_KIN_EV == pytest.approx(0.1)
        assert assenbaum_applicable(LEAN_THERMAL_U_E_EV, LEAN_THERMAL_E_KIN_EV) is False
        assert assenbaum_formula_claimed(LEAN_THERMAL_U_E_EV, LEAN_THERMAL_E_KIN_EV) is False

    def test_applicable_when_u_e_strictly_below_e_kin(self) -> None:
        assert assenbaum_applicable(20.0, 100.0) is True
        assert assenbaum_formula_claimed(20.0, 100.0) is True

    def test_boundary_equality_is_not_claimed(self) -> None:
        # Lean uses strict < ; U_e == E_kin ⇒ not applicable / not claimed.
        assert assenbaum_applicable(50.0, 50.0) is False
        assert assenbaum_formula_claimed(50.0, 50.0) is False


class TestScreeningKernelDomainHonesty:
    def test_thermal_palladium_is_outside_assenbaum_domain(self) -> None:
        report = compute_screening_enhancement(temperature_k=300.0, material="palladium")
        assert report["model"] == SCREENING_MODEL_ID
        assert report["assenbaum_applicable"] is False
        assert report["formula_claimed"] is False
        assert report["domain_equation_id"] == "EQ-ASSEN-DOM-01"
        assert report["screening_potential_ev"] > report["thermal_energy_ev"]

    def test_high_energy_keeps_formula_claimable(self) -> None:
        # E_kin large enough that typical Pd U_e sits inside U_e < E.
        report = compute_screening_enhancement(
            temperature_k=1.0e10,  # ~1.3 MeV thermal scale
            material="palladium",
            screening_potential_ev=300.0,
        )
        assert report["screening_potential_ev"] < report["thermal_energy_ev"]
        assert report["assenbaum_applicable"] is True
        assert report["formula_claimed"] is True

    def test_adiabatic_flag_is_independent_of_assenbaum_domain(self) -> None:
        # Gas-target-scale U_e below adiabatic floor, still U_e >> thermal E.
        report = compute_screening_enhancement(
            temperature_k=300.0,
            material="palladium",
            screening_potential_ev=20.0,
        )
        assert report["screening_potential_ev"] < ADIABATIC_LIMIT_EV
        assert report["exceeds_adiabatic_limit"] is False
        assert report["assenbaum_applicable"] is False
        assert report["formula_claimed"] is False

    def test_metal_host_can_exceed_adiabatic_and_still_fail_assenbaum(self) -> None:
        report = compute_screening_enhancement(temperature_k=320.0, material="palladium")
        assert report["exceeds_adiabatic_limit"] is True
        assert report["assenbaum_applicable"] is False

    def test_unified_screening_wrapper_exposes_domain_fields(self) -> None:
        from app.physics_engine.unified_lenr_model.config import SimulationConfig
        from app.physics_engine.unified_lenr_model.screening import (
            calculate_electron_screening,
        )

        result = calculate_electron_screening(SimulationConfig(temperature=300.0))
        params = result.parameters
        assert params["assenbaum_applicable"] is False
        assert params["formula_claimed"] is False
        assert params["domain_equation_id"] == "EQ-ASSEN-DOM-01"
        assert params["exceeds_adiabatic_limit"] is True


class TestLeanAssenbaumCrosswalk:
    def test_lean_applicable_def_is_strict_less_than(self) -> None:
        lean = (_repo_root() / "formalization/lean/LenrFormal/Assenbaum.lean").read_text(
            encoding="utf-8"
        )
        assert "def applicable (U_e E_kin : Nat) : Prop := U_e < E_kin" in lean
        assert "def formulaClaimed (U_e E_kin : Nat) : Prop := applicable U_e E_kin" in lean
        assert "theorem thermal_not_applicable" in lean
        assert "¬ applicable 300000 100" in lean
        assert "theorem not_applicable_implies_not_claimed" in lean

    def test_open_obligations_and_lenr_proved_untouched(self) -> None:
        root = _repo_root()
        open_lean = (root / "formalization/lean/LenrFormal/OpenObligations.lean").read_text(
            encoding="utf-8"
        )
        for eq_id in (
            "EQ-OPEN-MEV-01",
            "EQ-OPEN-RAD-01",
            "EQ-OPEN-RATE-01",
            "EQ-OPEN-EC-01",
            "EQ-OPEN-YIELD-01",
        ):
            assert eq_id in open_lean
        crosswalk = (root / "formalization/lean/LenrFormal/PaperCrosswalk.lean").read_text(
            encoding="utf-8"
        )
        assert "theorem lenr_proved_false : lenrProved = false" in crosswalk
