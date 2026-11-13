"""Numeric agreement gates between Lean anchors and the canonical Python engine."""
from __future__ import annotations

import ast
import math
from pathlib import Path

from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
from app.physics_engine.decision_oracle import (
    Q_DD_HE4_MEV,
    TWO_BODY_LOG10_N_EVENTS,
    evaluate_determination,
)
from app.physics_engine.many_body.fgr_model import MAX_COLLECTIVE_FACTOR
from app.physics_engine.open_questions import TRAP_SEP_M


def _find_repo_root(start: Path) -> Path:
    """Find the checkout root from a test path without relying on cwd."""
    for candidate in (start, *start.parents):
        lean_dir = candidate / "formalization" / "lean" / "LenrFormal"
        backend_dir = candidate / "LENR_SIM_APP_v2" / "backend"
        if lean_dir.is_dir() and backend_dir.is_dir():
            return candidate
    raise RuntimeError(
        f"Could not locate repository root from {start}; expected both "
        "formalization/lean/LenrFormal and LENR_SIM_APP_v2/backend"
    )


REPO_ROOT = _find_repo_root(Path(__file__).resolve())
LEAN_DIR = REPO_ROOT / "formalization" / "lean" / "LenrFormal"


def _lean_definition_rhs(path: Path, symbol: str) -> str:
    """Return the right-hand side of one top-level Lean ``def`` declaration."""
    matches: list[tuple[int, str]] = []
    for line_number, raw_line in enumerate(
        path.read_text(encoding="utf-8").splitlines(), start=1
    ):
        declaration, separator, rhs = raw_line.partition(":=")
        if not separator:
            continue
        words = declaration.strip().split(maxsplit=2)
        if len(words) >= 2 and words[0] == "def" and words[1] == symbol:
            matches.append((line_number, rhs.split("--", maxsplit=1)[0].strip()))

    location = path.relative_to(REPO_ROOT)
    assert matches, f"Lean definition {symbol!r} not found in {location}"
    assert len(matches) == 1, (
        f"Lean definition {symbol!r} appears multiple times in {location}: "
        f"lines {[line for line, _ in matches]}"
    )
    line_number, rhs = matches[0]
    assert rhs, f"Lean definition {symbol!r} has no RHS at {location}:{line_number}"
    return rhs


def _evaluate_lean_integer(path: Path, symbol: str) -> int:
    """Evaluate the integer-only expression subset used by numeric Lean anchors."""
    expression = _lean_definition_rhs(path, symbol).replace(": Int", "")
    try:
        parsed = ast.parse(expression, mode="eval")
    except SyntaxError as exc:
        raise AssertionError(
            f"Lean definition {symbol!r} is not a supported integer expression: "
            f"{expression!r}"
        ) from exc

    def evaluate(node: ast.AST) -> int:
        if isinstance(node, ast.Expression):
            return evaluate(node.body)
        if isinstance(node, ast.Constant) and type(node.value) is int:
            return node.value
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
            return -evaluate(node.operand)
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.UAdd):
            return evaluate(node.operand)
        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Add):
            return evaluate(node.left) + evaluate(node.right)
        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Sub):
            return evaluate(node.left) - evaluate(node.right)
        if isinstance(node, ast.BinOp) and isinstance(node.op, ast.Mult):
            return evaluate(node.left) * evaluate(node.right)
        raise AssertionError(
            f"Lean definition {symbol!r} uses an unsupported integer expression: "
            f"{expression!r}"
        )

    return evaluate(parsed)


def _lean_nat_min_cap(path: Path, symbol: str) -> int:
    """Read the cap from a ``Nat.min <argument> <integer>`` Lean definition."""
    rhs = _lean_definition_rhs(path, symbol)
    words = rhs.split()
    assert len(words) == 3 and words[0] == "Nat.min", (
        f"Lean definition {symbol!r} must have form "
        f"'Nat.min <argument> <integer>', got {rhs!r}"
    )
    try:
        return int(words[2])
    except ValueError as exc:
        raise AssertionError(
            f"Lean definition {symbol!r} has a non-integer Nat.min cap: {words[2]!r}"
        ) from exc


def _scaled_python_integer(value: float, scale: float, symbol: str) -> int:
    """Scale a Python engine value while rejecting silent truncation."""
    scaled = float(value) * scale
    rounded = round(scaled)
    assert math.isclose(scaled, rounded, rel_tol=0.0, abs_tol=1e-9), (
        f"{symbol} * {scale:g} must be integral for Lean comparison, got {scaled!r}"
    )
    return int(rounded)


def _assert_agreement(
    *,
    lean_path: Path,
    lean_symbol: str,
    lean_value: int,
    python_symbol: str,
    python_value: int,
    expected_value: int,
) -> None:
    assert python_value == expected_value, (
        f"{python_symbol} = {python_value}, expected canonical anchor {expected_value}"
    )
    assert lean_value == python_value, (
        f"{lean_path.relative_to(REPO_ROOT)}::{lean_symbol} = {lean_value}, "
        f"but {python_symbol} = {python_value}"
    )


def test_max_enhancement_factor_agrees_with_lean() -> None:
    lean_path = LEAN_DIR / "Constants.lean"
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="maxEnhancementFactor",
        lean_value=_evaluate_lean_integer(lean_path, "maxEnhancementFactor"),
        python_symbol="MAX_ENHANCEMENT_FACTOR",
        python_value=_scaled_python_integer(
            MAX_ENHANCEMENT_FACTOR, 1.0, "MAX_ENHANCEMENT_FACTOR"
        ),
        expected_value=100_000,
    )


def test_max_collective_factor_agrees_with_lean() -> None:
    lean_path = LEAN_DIR / "NBody.lean"
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="collective",
        lean_value=_lean_nat_min_cap(lean_path, "collective"),
        python_symbol="MAX_COLLECTIVE_FACTOR",
        python_value=_scaled_python_integer(
            MAX_COLLECTIVE_FACTOR, 1.0, "MAX_COLLECTIVE_FACTOR"
        ),
        expected_value=1_000_000,
    )


def test_nuclear_radius_agrees_with_lean_overlap_anchor() -> None:
    from app.physics_engine.constants import NUCLEAR_RADIUS_FM

    lean_path = LEAN_DIR / "Overlap.lean"
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="nuclearRadius_fm",
        lean_value=_evaluate_lean_integer(lean_path, "nuclearRadius_fm"),
        python_symbol="NUCLEAR_RADIUS_FM",
        python_value=_scaled_python_integer(
            NUCLEAR_RADIUS_FM, 1.0, "NUCLEAR_RADIUS_FM"
        ),
        expected_value=5,
    )


def test_dd_he4_q_value_agrees_with_lean_kev_anchor() -> None:
    lean_path = LEAN_DIR / "Constants.lean"
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="qDD_He4_keV",
        lean_value=_evaluate_lean_integer(lean_path, "qDD_He4_keV"),
        python_symbol="Q_DD_HE4_MEV * 1000",
        python_value=_scaled_python_integer(
            Q_DD_HE4_MEV, 1_000.0, "Q_DD_HE4_MEV"
        ),
        expected_value=23_800,
    )


def test_trap_separation_agrees_with_lean_pm_anchor() -> None:
    lean_path = LEAN_DIR / "NBody.lean"
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="trapSep_pm",
        lean_value=_evaluate_lean_integer(lean_path, "trapSep_pm"),
        python_symbol="TRAP_SEP_M * 1e12",
        python_value=_scaled_python_integer(TRAP_SEP_M, 1e12, "TRAP_SEP_M"),
        expected_value=25,
    )


def test_fc_class_domain_covers_python_franck_condon_scan() -> None:
    """EQ-WH-FC-02: Python S grid / phonon order sit inside the Lean domain."""
    from app.physics_engine.many_body.wh_bounds import (
        DEFAULT_S_GRID,
        FC_TARGET_LOG10,
        franck_condon_tail,
    )

    lean_path = LEAN_DIR / "RadiationBounds.lean"
    s_grid_max = _evaluate_lean_integer(
        LEAN_DIR / "WorkingHypothesisBounds.lean", "sGridMax"
    )
    order_min = _evaluate_lean_integer(lean_path, "fcOrderMin")
    assert order_min == 300_048
    assert max(DEFAULT_S_GRID) <= s_grid_max

    fc = franck_condon_tail(q_mev=Q_DD_HE4_MEV, phonon_hz=1e13)
    assert fc["phonon_order_N"] >= order_min
    assert fc["target_log10"] == FC_TARGET_LOG10 == -11.0
    assert fc["meets_target"] is False
    assert max(fc["log10_p_n"]) < FC_TARGET_LOG10


def test_detector_flag_thresholds_agree_with_lean_rad_mirrors() -> None:
    """EQ-RAD-DET-01: Lean Bool mirrors share thresholds with branching_model."""
    import inspect

    from app.physics_engine.many_body.branching_model import (
        CD_RATIO_THERMAL_FLOOR,
        DETECTOR_UL_HONESTY_CLASS,
        MODERATOR_NULL_THERMAL_CEILING,
        branching_inconsistent_with_neutron_interpretation,
        branching_inconsistent_with_ul,
    )

    lean_path = LEAN_DIR / "RadiationBounds.lean"
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="cdRatioThermalFloorMilli",
        lean_value=_evaluate_lean_integer(lean_path, "cdRatioThermalFloorMilli"),
        python_symbol="CD_RATIO_THERMAL_FLOOR * 1000",
        python_value=_scaled_python_integer(
            CD_RATIO_THERMAL_FLOOR, 1_000.0, "CD_RATIO_THERMAL_FLOOR"
        ),
        expected_value=5_000,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="moderatorNullThermalCeilingMilli",
        lean_value=_evaluate_lean_integer(
            lean_path, "moderatorNullThermalCeilingMilli"
        ),
        python_symbol="MODERATOR_NULL_THERMAL_CEILING * 1000",
        python_value=_scaled_python_integer(
            MODERATOR_NULL_THERMAL_CEILING, 1_000.0, "MODERATOR_NULL_THERMAL_CEILING"
        ),
        expected_value=1_000,
    )
    cd_high_default = inspect.signature(
        branching_inconsistent_with_neutron_interpretation
    ).parameters["cd_wrapped_high_cps"].default
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="cdWrappedHighMilliCps",
        lean_value=_evaluate_lean_integer(lean_path, "cdWrappedHighMilliCps"),
        python_symbol="cd_wrapped_high_cps default * 1000",
        python_value=_scaled_python_integer(
            cd_high_default, 1_000.0, "cd_wrapped_high_cps"
        ),
        expected_value=1_000,
    )
    assert _lean_definition_rhs(lean_path, "detectorUlHonestyClass") == (
        f'"{DETECTOR_UL_HONESTY_CLASS}"'
    )
    # Twins of no_observation_no_neutron_flag / no_ul_no_branching_flag.
    assert branching_inconsistent_with_neutron_interpretation() is False
    assert branching_inconsistent_with_ul(0.5, None) is False


def test_two_body_event_budget_agrees_with_lean() -> None:
    lean_path = LEAN_DIR / "RateBudget.lean"
    oracle_result = evaluate_determination(rate_mode="two_body")
    python_budget = oracle_result["oracle_a"]["log10_n_events_two_body"]
    assert python_budget == TWO_BODY_LOG10_N_EVENTS, (
        "The two-body decision result drifted from TWO_BODY_LOG10_N_EVENTS: "
        f"{python_budget!r} != {TWO_BODY_LOG10_N_EVENTS!r}"
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="log10NEvents",
        lean_value=_evaluate_lean_integer(lean_path, "log10NEvents"),
        python_symbol="two-body decision-oracle log10 event budget",
        python_value=_scaled_python_integer(
            python_budget, 1.0, "two-body log10 event budget"
        ),
        expected_value=-40,
    )


def test_q4_double_layer_deficit_agrees_with_lean() -> None:
    from app.physics.weak_interaction import THRESHOLD_ELECTRON_MEV
    from app.physics_engine.open_question_details import (
        DOUBLE_LAYER_STATED_MEV,
        ELECTRON_CAPTURE_THRESHOLD_MEV,
    )

    lean_path = LEAN_DIR / "OpenQuestionBounds.lean"
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="doubleLayer_meV",
        lean_value=_evaluate_lean_integer(lean_path, "doubleLayer_meV"),
        python_symbol="DOUBLE_LAYER_STATED_MEV",
        python_value=DOUBLE_LAYER_STATED_MEV,
        expected_value=100,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="ecThreshold_meV",
        lean_value=_evaluate_lean_integer(lean_path, "ecThreshold_meV"),
        python_symbol="ELECTRON_CAPTURE_THRESHOLD_MEV",
        python_value=ELECTRON_CAPTURE_THRESHOLD_MEV,
        expected_value=782_000_000,
    )
    assert round(THRESHOLD_ELECTRON_MEV * 1e9) == ELECTRON_CAPTURE_THRESHOLD_MEV


def test_q5_integrated_yield_band_agrees_with_lean() -> None:
    from app.physics_engine.open_question_details import (
        INTEGRATED_YIELD_DISCREPANCY_HI,
        INTEGRATED_YIELD_DISCREPANCY_LO,
    )

    lean_path = LEAN_DIR / "OpenQuestionBounds.lean"
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="integratedYieldDiscrepancyLo",
        lean_value=_evaluate_lean_integer(lean_path, "integratedYieldDiscrepancyLo"),
        python_symbol="INTEGRATED_YIELD_DISCREPANCY_LO",
        python_value=INTEGRATED_YIELD_DISCREPANCY_LO,
        expected_value=100,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="integratedYieldDiscrepancyHi",
        lean_value=_evaluate_lean_integer(lean_path, "integratedYieldDiscrepancyHi"),
        python_symbol="INTEGRATED_YIELD_DISCREPANCY_HI",
        python_value=INTEGRATED_YIELD_DISCREPANCY_HI,
        expected_value=10_000,
    )


def test_collapse_bound_ceilings_agree_with_lean() -> None:
    from app.physics_engine.collapse_calculated_bounds import (
        COMPRESSIBILITY_MACH_THRESHOLD,
        COMPRESSIBILITY_MACH_THRESHOLD_X10,
        EMISSION_BAND_UPPER_K,
        MAX_COMPRESSION_RATIO,
        MOSS_ION_CEILING_K,
        SHOCK_PRESSURE_CEILING_PA,
        temperature_bound_k_nat,
    )

    lean_path = LEAN_DIR / "CollapseBounds.lean"
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="emissionBandUpper_K",
        lean_value=_evaluate_lean_integer(lean_path, "emissionBandUpper_K"),
        python_symbol="EMISSION_BAND_UPPER_K",
        python_value=_scaled_python_integer(
            EMISSION_BAND_UPPER_K, 1.0, "EMISSION_BAND_UPPER_K"
        ),
        expected_value=15_000,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="mossIonCeiling_K",
        lean_value=_evaluate_lean_integer(lean_path, "mossIonCeiling_K"),
        python_symbol="MOSS_ION_CEILING_K",
        python_value=_scaled_python_integer(
            MOSS_ION_CEILING_K, 1.0, "MOSS_ION_CEILING_K"
        ),
        expected_value=2_000_000,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="shockPressureCeiling_Pa",
        lean_value=_evaluate_lean_integer(lean_path, "shockPressureCeiling_Pa"),
        python_symbol="SHOCK_PRESSURE_CEILING_PA",
        python_value=_scaled_python_integer(
            SHOCK_PRESSURE_CEILING_PA, 1.0, "SHOCK_PRESSURE_CEILING_PA"
        ),
        expected_value=10_000_000_000,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="compressibilityMachThreshold_x10",
        lean_value=_evaluate_lean_integer(
            lean_path, "compressibilityMachThreshold_x10"
        ),
        python_symbol="COMPRESSIBILITY_MACH_THRESHOLD_X10",
        python_value=COMPRESSIBILITY_MACH_THRESHOLD_X10,
        expected_value=3,
    )
    assert COMPRESSIBILITY_MACH_THRESHOLD_X10 == _scaled_python_integer(
        COMPRESSIBILITY_MACH_THRESHOLD, 10.0, "COMPRESSIBILITY_MACH_THRESHOLD"
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="maxCompressionRatio",
        lean_value=_evaluate_lean_integer(lean_path, "maxCompressionRatio"),
        python_symbol="MAX_COMPRESSION_RATIO",
        python_value=MAX_COMPRESSION_RATIO,
        expected_value=1_000,
    )

    # Regime selector: Lean native_decide cases ↔ Python Nat mirror.
    assert temperature_bound_k_nat(peak_mach_x10=2, is_rayleigh_plesset=True) == int(
        EMISSION_BAND_UPPER_K
    )
    assert temperature_bound_k_nat(peak_mach_x10=3, is_rayleigh_plesset=True) == int(
        MOSS_ION_CEILING_K
    )
    assert temperature_bound_k_nat(peak_mach_x10=2, is_rayleigh_plesset=False) == int(
        MOSS_ION_CEILING_K
    )


def test_weak_interaction_anchors_agree_with_lean() -> None:
    """Fermi G_F / threshold / Boltzmann / σ envelope vs WeakInteraction.lean."""
    from app.physics.weak_interaction import (
        G_F_GEV_INV2,
        THRESHOLD_ELECTRON_MEV,
        calculate_weak_interaction_cross_section,
    )

    lean_path = LEAN_DIR / "WeakInteraction.lean"
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="gF_x1e8",
        lean_value=_evaluate_lean_integer(lean_path, "gF_x1e8"),
        python_symbol="G_F_GEV_INV2 * 1e8",
        python_value=_scaled_python_integer(G_F_GEV_INV2, 1e8, "G_F_GEV_INV2"),
        expected_value=1166,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="threshold_eV",
        lean_value=_evaluate_lean_integer(lean_path, "threshold_eV"),
        python_symbol="THRESHOLD_ELECTRON_MEV * 1e6",
        python_value=_scaled_python_integer(
            THRESHOLD_ELECTRON_MEV, 1e6, "THRESHOLD_ELECTRON_MEV"
        ),
        expected_value=782_000,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="threshold_keV",
        lean_value=_evaluate_lean_integer(lean_path, "threshold_keV"),
        python_symbol="THRESHOLD_ELECTRON_MEV * 1e3",
        python_value=_scaled_python_integer(
            THRESHOLD_ELECTRON_MEV, 1e3, "THRESHOLD_ELECTRON_MEV"
        ),
        expected_value=782,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="boltzmannExponentFloor",
        lean_value=_evaluate_lean_integer(lean_path, "boltzmannExponentFloor"),
        python_symbol="taxonomy Boltzmann exponent floor",
        python_value=30_000,
        expected_value=30_000,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="kT_room_meV",
        lean_value=_evaluate_lean_integer(lean_path, "kT_room_meV"),
        python_symbol="room-temperature kT bookkeeping (meV)",
        python_value=26,
        expected_value=26,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="thermalExponentRoom",
        lean_value=_evaluate_lean_integer(lean_path, "thermalExponentRoom"),
        python_symbol="threshold_eV * 1000 // kT_room_meV",
        python_value=(782_000 * 1000) // 26,
        expected_value=30_076_923,
    )

    sigma_m2 = calculate_weak_interaction_cross_section(1e6)
    assert 0.0 < sigma_m2 < 1e-47
    lean_ceiling = _evaluate_lean_integer(lean_path, "sigma1MeV_negLog10Ceiling")
    assert lean_ceiling == 47
    assert -math.log10(sigma_m2) > lean_ceiling


def test_ec_cm_budget_bound_anchors_agree_with_lean() -> None:
    """EQ-OPEN-EC-BOUND-01 caps vs engine; BOUNDED only, Q4 stays OPEN."""
    from app.physics_engine.open_question_details import (
        DOUBLE_LAYER_STATED_MEV,
        ELECTRON_CAPTURE_THRESHOLD_MEV,
        build_electron_capture_question,
        ElectronCaptureQuestionInput,
    )
    from app.physics_engine.unified_lenr_model.config import (
        DEFAULT_DELTA_V_FALLBACK_V,
        H2_WORK_FUNCTION_EV,
        get_double_layer_potential,
        get_material_work_function,
    )

    lean_path = LEAN_DIR / "WeakInteraction.lean"
    lean = {
        symbol: _evaluate_lean_integer(lean_path, symbol)
        for symbol in (
            "threshold_meV",
            "cmBudgetLo_meV",
            "cmBudgetHi_meV",
            "doubleLayerLo_meV",
            "doubleLayerHi_meV",
            "workFunctionMaxLookup_meV",
            "h2WorkFunction_meV",
            "minConcentrationAtCmCap",
        )
    }
    assert lean["threshold_meV"] == ELECTRON_CAPTURE_THRESHOLD_MEV
    assert lean["doubleLayerLo_meV"] == DOUBLE_LAYER_STATED_MEV
    assert lean["doubleLayerLo_meV"] == _scaled_python_integer(
        DEFAULT_DELTA_V_FALLBACK_V, 1e3, "DEFAULT_DELTA_V_FALLBACK_V"
    )
    assert lean["h2WorkFunction_meV"] == _scaled_python_integer(
        H2_WORK_FUNCTION_EV, 1e3, "H2_WORK_FUNCTION_EV"
    )
    lookup_materials = (
        "palladium", "nickel", "titanium", "lithium", "graphite",
        "carbon", "silicon_carbide", "zirconium", "iridium",
    )
    max_lookup_ev = max(get_material_work_function(m) for m in lookup_materials)
    assert lean["workFunctionMaxLookup_meV"] == _scaled_python_integer(
        max_lookup_ev, 1e3, "max lookup work function"
    )
    assert (lean["cmBudgetLo_meV"], lean["cmBudgetHi_meV"]) == (10_000, 100_000)
    assert lean["doubleLayerHi_meV"] <= lean["cmBudgetHi_meV"] < lean["threshold_meV"]
    assert lean["minConcentrationAtCmCap"] * lean["cmBudgetHi_meV"] == lean["threshold_meV"]

    # Engine double-layer potentials for lookup materials at room temperature
    # stay inside the Lean band (eV per electron == V for unit charge).
    for material in lookup_materials:
        delta_v_mev = get_double_layer_potential(material, 1e29, 300.0) * 1e3
        assert lean["doubleLayerLo_meV"] <= delta_v_mev + 1e-9
        assert delta_v_mev <= lean["doubleLayerHi_meV"]

    q_ec = build_electron_capture_question(
        ElectronCaptureQuestionInput(mode="two_body", rate_provenance={})
    )
    assert q_ec["status"] == "OPEN"
    assert q_ec["occurrence_claimed"] is False


def test_collapse_uq_percentiles_agree_with_lean() -> None:
    from app.physics_engine.collapse_uq import (
        COMPRESSION_RATIO_TOLERANCE,
        PERCENTILE_KEYS,
        PERCENTILES,
        POLYTROPIC_INDEX_TOLERANCE,
        SAMPLED_DIMENSION_COUNT,
        SAMPLED_DIMENSIONS,
    )

    lean_path = LEAN_DIR / "CollapseBounds.lean"
    lean_percentiles = [
        _evaluate_lean_integer(lean_path, "uqPercentileP05"),
        _evaluate_lean_integer(lean_path, "uqPercentileP25"),
        _evaluate_lean_integer(lean_path, "uqPercentileP50"),
        _evaluate_lean_integer(lean_path, "uqPercentileP75"),
        _evaluate_lean_integer(lean_path, "uqPercentileP95"),
    ]
    python_percentiles = [
        _scaled_python_integer(value, 1.0, f"PERCENTILES[{index}]")
        for index, value in enumerate(PERCENTILES)
    ]
    assert python_percentiles == [5, 25, 50, 75, 95]
    assert lean_percentiles == python_percentiles
    assert PERCENTILE_KEYS == ("p05", "p25", "p50", "p75", "p95")
    assert len(PERCENTILE_KEYS) == len(PERCENTILES)

    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="compressionRatioTolerancePct",
        lean_value=_evaluate_lean_integer(lean_path, "compressionRatioTolerancePct"),
        python_symbol="COMPRESSION_RATIO_TOLERANCE * 100",
        python_value=_scaled_python_integer(
            COMPRESSION_RATIO_TOLERANCE, 100.0, "COMPRESSION_RATIO_TOLERANCE"
        ),
        expected_value=20,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="polytropicIndexTolerancePct",
        lean_value=_evaluate_lean_integer(lean_path, "polytropicIndexTolerancePct"),
        python_symbol="POLYTROPIC_INDEX_TOLERANCE * 100",
        python_value=_scaled_python_integer(
            POLYTROPIC_INDEX_TOLERANCE, 100.0, "POLYTROPIC_INDEX_TOLERANCE"
        ),
        expected_value=5,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="uqSampledDimensionCount",
        lean_value=_evaluate_lean_integer(lean_path, "uqSampledDimensionCount"),
        python_symbol="SAMPLED_DIMENSION_COUNT",
        python_value=SAMPLED_DIMENSION_COUNT,
        expected_value=3,
    )
    assert SAMPLED_DIMENSIONS == (
        "screening_potential_ev",
        "compression_ratio",
        "polytropic_index",
    )


def test_collapse_rp_domain_and_reporting_clamp_agree_with_lean() -> None:
    """EQ-BBL-RP-DOM-01 / EQ-BBL-LIM-01 bookkeeping vs Python clamps."""
    from app.physics_engine.bubble_lattice_interaction import BubbleLatticeInteraction
    from app.physics_engine.collapse_calculated_bounds import (
        COMPRESSIBILITY_MACH_THRESHOLD,
        MAX_COMPRESSION_RATIO,
        MOSS_ION_CEILING_K,
        SHOCK_PRESSURE_CEILING_PA,
        build_reporting_limits,
        is_rp_domain,
        temperature_bound_k_nat,
    )

    lean_path = LEAN_DIR / "CollapseBounds.lean"
    assert is_rp_domain(peak_mach=0.2) is True
    assert is_rp_domain(peak_mach=COMPRESSIBILITY_MACH_THRESHOLD) is False
    assert is_rp_domain(peak_mach=0.5) is False

    assert BubbleLatticeInteraction.MAX_COMPRESSION_RATIO == MAX_COMPRESSION_RATIO
    assert _evaluate_lean_integer(lean_path, "maxCompressionRatio") == (
        BubbleLatticeInteraction.MAX_COMPRESSION_RATIO
    )

    # Saturated temperature under Moss ceiling clamps to the bound.
    limits = build_reporting_limits(
        temperature_raw_k=3.0e8,
        pressure_raw_pa=5.0e10,
        compression_ratio=2_000.0,
        max_compression_ratio=float(MAX_COMPRESSION_RATIO),
        peak_mach=0.5,
        dynamics_mode="keller_miksis",
    )
    assert limits["temperature_k"]["value"] == MOSS_ION_CEILING_K
    assert limits["temperature_k"]["is_saturated"] is True
    assert limits["pressure_pa"]["value"] == SHOCK_PRESSURE_CEILING_PA
    assert limits["pressure_pa"]["is_saturated"] is True
    assert limits["compression_ratio"]["calculated_bound"] == float(
        MAX_COMPRESSION_RATIO
    )
    assert temperature_bound_k_nat(
        peak_mach_x10=5, is_rayleigh_plesset=False
    ) == int(MOSS_ION_CEILING_K)


def test_weight_honesty_locks_agree_with_lean() -> None:
    """EQ-WT-TIER-01 / EQ-WT-SCENARIO-01: Lean percent locks mirror theory_scoring."""
    from app.physics_engine.theory_scoring import (
        CLAIM_TIER_MULTIPLIER,
        W_COMPLETENESS,
        W_CROSS_THEORY,
        W_EXPERIMENTAL,
        W_PHYSICAL,
        W_SENSITIVITY,
    )

    lean_path = LEAN_DIR / "WeightHonesty.lean"
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="tierValidatedPct",
        lean_value=_evaluate_lean_integer(lean_path, "tierValidatedPct"),
        python_symbol="CLAIM_TIER_MULTIPLIER[validated_lenr_mechanism]*100",
        python_value=_scaled_python_integer(
            CLAIM_TIER_MULTIPLIER["validated_lenr_mechanism"],
            100.0,
            "validated_lenr_mechanism",
        ),
        expected_value=100,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="tierEmpiricalPct",
        lean_value=_evaluate_lean_integer(lean_path, "tierEmpiricalPct"),
        python_symbol="CLAIM_TIER_MULTIPLIER[empirical_lenr_correlation]*100",
        python_value=_scaled_python_integer(
            CLAIM_TIER_MULTIPLIER["empirical_lenr_correlation"],
            100.0,
            "empirical_lenr_correlation",
        ),
        expected_value=90,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="tierSpeculativePct",
        lean_value=_evaluate_lean_integer(lean_path, "tierSpeculativePct"),
        python_symbol="CLAIM_TIER_MULTIPLIER[speculative_exploratory]*100",
        python_value=_scaled_python_integer(
            CLAIM_TIER_MULTIPLIER["speculative_exploratory"],
            100.0,
            "speculative_exploratory",
        ),
        expected_value=30,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="tierCrossRegimePct",
        lean_value=_evaluate_lean_integer(lean_path, "tierCrossRegimePct"),
        python_symbol="CLAIM_TIER_MULTIPLIER[cross_regime_extrapolation]*100",
        python_value=_scaled_python_integer(
            CLAIM_TIER_MULTIPLIER["cross_regime_extrapolation"],
            100.0,
            "cross_regime_extrapolation",
        ),
        expected_value=20,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="wPhysicalPct",
        lean_value=_evaluate_lean_integer(lean_path, "wPhysicalPct"),
        python_symbol="W_PHYSICAL*100",
        python_value=_scaled_python_integer(W_PHYSICAL, 100.0, "W_PHYSICAL"),
        expected_value=25,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="wExperimentalPct",
        lean_value=_evaluate_lean_integer(lean_path, "wExperimentalPct"),
        python_symbol="W_EXPERIMENTAL*100",
        python_value=_scaled_python_integer(W_EXPERIMENTAL, 100.0, "W_EXPERIMENTAL"),
        expected_value=25,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="wSensitivityPct",
        lean_value=_evaluate_lean_integer(lean_path, "wSensitivityPct"),
        python_symbol="W_SENSITIVITY*100",
        python_value=_scaled_python_integer(W_SENSITIVITY, 100.0, "W_SENSITIVITY"),
        expected_value=15,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="wCrossTheoryPct",
        lean_value=_evaluate_lean_integer(lean_path, "wCrossTheoryPct"),
        python_symbol="W_CROSS_THEORY*100",
        python_value=_scaled_python_integer(W_CROSS_THEORY, 100.0, "W_CROSS_THEORY"),
        expected_value=15,
    )
    _assert_agreement(
        lean_path=lean_path,
        lean_symbol="wCompletenessPct",
        lean_value=_evaluate_lean_integer(lean_path, "wCompletenessPct"),
        python_symbol="W_COMPLETENESS*100",
        python_value=_scaled_python_integer(W_COMPLETENESS, 100.0, "W_COMPLETENESS"),
        expected_value=20,
    )
    assert _lean_definition_rhs(lean_path, "scenarioTableKind") == (
        '"scenario_table_not_posterior"'
    )
    assert _lean_definition_rhs(lean_path, "lenrProved") == "false"
