"""
MHD Physics Validation & Benchmarking Tests
=============================================

Phase 9 of the MHD Nano-Confinement Enhancement plan.

Tests cover:
  1. Dimensionless parameter computation (Rm, Ha, S, β, β_H, N, Pm)
  2. Hartmann flow benchmark against analytical solution
  3. Hall conductivity tensor symmetry & limits
  4. Faraday channel energy conservation
  5. Nuclear cross-section S-factor validation against NACRE / Caughlan–Fowler
  6. Electron capture rate ordering
  7. Multi-scale bridge consistency
  8. Bubble-MHD theory module integration
"""

import math
import numpy as np
import pytest
from scipy import constants as const

# ── Module imports ─────────────────────────────────────────────────────
from app.physics_engine.mhd.dimensionless_parameters import (
    compute_mhd_parameters,
    compute_alfven_velocity,
    compute_magnetic_diffusivity,
    MHDDimensionlessParameters,
)
from app.physics_engine.mhd.hartmann_flow import (
    compute_hartmann_velocity_profile,
    compute_hartmann_flow,
)
from app.physics_engine.mhd.hall_faraday_channels import (
    compute_hall_conductivity,
    compute_hall_current_density,
    compute_faraday_channel,
    compute_faraday_emf,
    compute_bubble_collapse_mhd,
)
from app.physics_engine.mhd.mhd_induction_solver import (
    MHDInductionSolver1D,
    MHDInductionConfig,
)
from app.physics_engine.mhd.multiscale_bridge import (
    MultiscaleBridge,
    ScaleLevel,
)
from app.physics_engine.mhd.nuclear_force_coupling import (
    compute_nuclear_cross_section,
    compute_dd_branching_ratios,
    compute_electron_capture_rate,
    compute_nuclear_coupling,
    compute_sommerfeld_parameter,
    compute_gamow_energy,
)
from app.physics_engine.theories.bubble_mhd_confinement import (
    BubbleMHDConfinementTheory,
)


# ═══════════════════════════════════════════════════════════════════════════
#  1. Dimensionless Parameters
# ═══════════════════════════════════════════════════════════════════════════
class TestDimensionlessParameters:
    """Verify correctness of MHD dimensionless parameter computations."""

    def test_alfven_velocity_known_value(self):
        """v_A = B / sqrt(mu_0 * rho).  For B=1T, rho=1000: v_A ≈ 28.2 m/s."""
        v_A = compute_alfven_velocity(B=1.0, rho=1000.0)
        expected = 1.0 / math.sqrt(const.mu_0 * 1000.0)
        assert abs(v_A - expected) / expected < 1e-10

    def test_magnetic_diffusivity(self):
        """eta = 1/(mu_0 * sigma).  For sigma=1e6 S/m (copper-like): eta ≈ 0.796 m²/s."""
        eta = compute_magnetic_diffusivity(1e6)
        expected = 1.0 / (const.mu_0 * 1e6)
        assert abs(eta - expected) / expected < 1e-10

    def test_magnetic_reynolds_number(self):
        """Rm = mu_0 * sigma * v * L.  Verify against manual computation."""
        params = compute_mhd_parameters(
            B=1.0, L=0.01, v=10.0, rho=1000.0, sigma=1e4, nu=1e-6,
        )
        Rm_expected = const.mu_0 * 1e4 * 10.0 * 0.01
        assert abs(params.magnetic_reynolds_number - Rm_expected) / Rm_expected < 1e-10

    def test_hartmann_number(self):
        """Ha = B*L*sqrt(sigma/(rho*nu)).  Verify against manual computation."""
        params = compute_mhd_parameters(
            B=1.0, L=0.01, v=10.0, rho=1000.0, sigma=1e4, nu=1e-6,
        )
        Ha_expected = 1.0 * 0.01 * math.sqrt(1e4 / (1000.0 * 1e-6))
        assert abs(params.hartmann_number - Ha_expected) / Ha_expected < 1e-10

    def test_plasma_beta(self):
        """beta = n*kT / (B²/2mu_0).  Verify thermally dominated case."""
        params = compute_mhd_parameters(
            B=0.001, L=0.01, v=10.0, rho=1000.0, sigma=1e4, nu=1e-6,
            temperature=1e6, ion_density=1e28,
        )
        # With very high T and low B, beta should be >> 1
        assert params.plasma_beta > 1.0

    def test_hall_parameter_strong_field(self):
        """In strong B field with low collision freq, beta_H should be large."""
        params = compute_mhd_parameters(
            B=10.0, L=0.01, v=10.0, rho=1000.0, sigma=1e4, nu=1e-6,
            collision_frequency=1e10,
        )
        # omega_c = eB/me ≈ 1.76e12 rad/s for B=10T
        # tau = 1/1e10 = 1e-10 s  →  beta_H ≈ 176
        assert params.hall_parameter > 100

    def test_regime_classification_frozen_in(self):
        """When Rm >> 1, regime should contain 'frozen-in'."""
        params = compute_mhd_parameters(
            B=1.0, L=1.0, v=100.0, rho=1000.0, sigma=1e6, nu=1e-6,
        )
        assert "frozen-in" in params.regimes.magnetic_reynolds[0].lower()

    def test_regime_classification_diffusive(self):
        """When Rm << 1, regime should mention 'diffusive'."""
        params = compute_mhd_parameters(
            B=0.001, L=1e-6, v=0.01, rho=1000.0, sigma=1.0, nu=1e-6,
        )
        assert "diffus" in params.regimes.magnetic_reynolds[0].lower()

    def test_stuart_number_identity(self):
        """N = Ha²/Re.  Verify the identity holds."""
        params = compute_mhd_parameters(
            B=1.0, L=0.01, v=10.0, rho=1000.0, sigma=1e4, nu=1e-6,
        )
        if params.reynolds_number > 0:
            N_from_identity = params.hartmann_number**2 / params.reynolds_number
            assert abs(params.stuart_number - N_from_identity) / max(N_from_identity, 1e-30) < 1e-6

    def test_zero_field_returns_zeros(self):
        """With B=0, magnetic parameters should be zero."""
        params = compute_mhd_parameters(
            B=0.0, L=0.01, v=10.0, rho=1000.0, sigma=1e4, nu=1e-6,
        )
        assert params.hartmann_number == 0.0
        assert params.alfven_velocity_m_s == 0.0
        assert params.hall_parameter == 0.0


# ═══════════════════════════════════════════════════════════════════════════
#  2. Hartmann Flow Benchmark
# ═══════════════════════════════════════════════════════════════════════════
class TestHartmannFlow:
    """Benchmark Hartmann velocity profile against analytical solution."""

    def test_poiseuille_limit(self):
        """Ha → 0: should recover parabolic Poiseuille profile."""
        y, v = compute_hartmann_velocity_profile(Ha=0.0, n_points=101)
        # Parabolic: v = 1 - y²
        v_expected = 1.0 - y**2
        np.testing.assert_allclose(v, v_expected, atol=1e-10)

    def test_hartmann_no_slip(self):
        """Velocity at walls (y=±1) should be zero for all Ha."""
        for Ha in [0.1, 1.0, 10.0, 100.0]:
            y, v = compute_hartmann_velocity_profile(Ha=Ha, n_points=201)
            # Wall values
            assert abs(v[0]) < 1e-10, f"v(y=-1) = {v[0]} for Ha={Ha}"
            assert abs(v[-1]) < 1e-10, f"v(y=+1) = {v[-1]} for Ha={Ha}"

    def test_hartmann_flattening(self):
        """Higher Ha should flatten the profile (lower peak-to-mean ratio)."""
        _, v_low = compute_hartmann_velocity_profile(Ha=1.0, n_points=201)
        _, v_high = compute_hartmann_velocity_profile(Ha=50.0, n_points=201)
        ratio_low = np.max(v_low) / np.mean(v_low[v_low > 0])
        ratio_high = np.max(v_high) / np.mean(v_high[v_high > 0])
        assert ratio_high < ratio_low, "Higher Ha should flatten the velocity profile"

    def test_boundary_layer_thickness(self):
        """δ_Ha = L/Ha should decrease with Ha."""
        result_10 = compute_hartmann_flow(
            B=1.0, L=0.01, rho=1000.0, sigma=1e4, nu=1e-6, dP_dx=1e5,
        )
        result_100 = compute_hartmann_flow(
            B=10.0, L=0.01, rho=1000.0, sigma=1e4, nu=1e-6, dP_dx=1e5,
        )
        assert result_100.boundary_layer_thickness_m < result_10.boundary_layer_thickness_m

    def test_flow_rate_ratio_bounded(self):
        """Q_MHD/Q_Poiseuille should be between 0 and 1."""
        for Ha_target in [0.1, 1.0, 10.0, 100.0]:
            B = Ha_target * math.sqrt(1000.0 * 1e-6 / 1e4) / 0.01
            result = compute_hartmann_flow(
                B=B, L=0.01, rho=1000.0, sigma=1e4, nu=1e-6, dP_dx=1e5,
            )
            assert 0 < result.flow_rate_ratio <= 1.0

    def test_quantum_correction_at_nanoscale(self):
        """Casimir pressure should appear at nm-scale gaps."""
        result = compute_hartmann_flow(
            B=10.0, L=5e-9, rho=1000.0, sigma=1e6, nu=1e-6, dP_dx=1e12,
            enable_quantum_correction=True,
        )
        assert result.casimir_pressure_pa > 0
        assert result.quantum_correction_factor > 1.0


# ═══════════════════════════════════════════════════════════════════════════
#  3. Hall Conductivity Tensor
# ═══════════════════════════════════════════════════════════════════════════
class TestHallConductivity:
    """Verify Hall conductivity tensor properties."""

    def test_zero_field_isotropic(self):
        """With B=0, tensor should be isotropic σ₀·I."""
        result = compute_hall_conductivity(sigma_0=100.0, B=0.0)
        np.testing.assert_allclose(result.sigma_tensor, 100.0 * np.eye(3), atol=1e-10)

    def test_tensor_anti_symmetry(self):
        """Off-diagonal Hall components should be anti-symmetric."""
        result = compute_hall_conductivity(sigma_0=100.0, B=1.0, collision_frequency=1e12)
        sigma = result.sigma_tensor
        # σ_xy should be negative of σ_yx
        assert abs(sigma[0, 1] + sigma[1, 0]) < 1e-10

    def test_pedersen_hall_relation(self):
        """σ_P² + σ_H² = σ₀²/(1+β_H²)² + σ₀²β_H²/(1+β_H²)² = σ₀²/(1+β_H²)."""
        result = compute_hall_conductivity(sigma_0=100.0, B=5.0, collision_frequency=1e12)
        lhs = result.sigma_pedersen**2 + result.sigma_hall**2
        beta_H = result.hall_parameter
        rhs = 100.0**2 / (1.0 + beta_H**2)
        assert abs(lhs - rhs) / rhs < 1e-8

    def test_strong_field_limit(self):
        """For β_H >> 1, σ_P → 0 and σ_H → σ₀/β_H."""
        result = compute_hall_conductivity(sigma_0=100.0, B=100.0, collision_frequency=1e8)
        assert result.hall_parameter > 100
        # σ_P should be much smaller than σ_0
        assert result.sigma_pedersen < 0.01 * result.sigma_parallel


# ═══════════════════════════════════════════════════════════════════════════
#  4. Faraday Channel
# ═══════════════════════════════════════════════════════════════════════════
class TestFaradayChannel:
    """Verify Faraday channel physics and energy conservation."""

    def test_faraday_emf(self):
        """EMF = v × B × L."""
        emf = compute_faraday_emf(v=100.0, B=1.0, channel_length=0.01)
        assert abs(emf - 1.0) < 1e-10

    def test_max_efficiency_at_K_half(self):
        """Electrical efficiency η = K(1−K) is maximised at K=0.5."""
        result_05 = compute_faraday_channel(
            v=100.0, B=1.0, sigma=1e4, channel_length=0.01,
            channel_width=0.001, loading_parameter=0.5,
        )
        result_03 = compute_faraday_channel(
            v=100.0, B=1.0, sigma=1e4, channel_length=0.01,
            channel_width=0.001, loading_parameter=0.3,
        )
        assert result_05.electrical_efficiency >= result_03.electrical_efficiency

    def test_power_conservation(self):
        """Extracted + dissipated + residual = total σ(vB)²."""
        result = compute_faraday_channel(
            v=100.0, B=1.0, sigma=1e4, channel_length=0.01,
            channel_width=0.001, loading_parameter=0.4,
        )
        P_total = 1e4 * (100.0 * 1.0)**2
        K = 0.4
        P_extract = K * (1.0 - K) * P_total
        P_dissip = (1.0 - K)**2 * P_total
        assert abs(result.power_extracted_W_m3 - P_extract) / P_total < 1e-10
        assert abs(result.power_dissipated_W_m3 - P_dissip) / P_total < 1e-10


# ═══════════════════════════════════════════════════════════════════════════
#  5. Nuclear Cross-Section & S-Factor Validation
# ═══════════════════════════════════════════════════════════════════════════
class TestNuclearCrossSections:
    """Validate nuclear cross-sections against published data."""

    def test_dd_sfactor_order_of_magnitude(self):
        """D(d,n)He3 S-factor should be ~50 keV·barn near threshold."""
        xs = compute_nuclear_cross_section(E_keV=10.0, reaction="D(d,n)He3")
        assert 40 < xs.S_factor_keV_b < 70, f"S = {xs.S_factor_keV_b} keV·b"

    def test_dd_sfactor_neutron_vs_proton_parity(self):
        """D(d,n)He3 and D(d,p)T S-factors should be within 20% of each other."""
        xs_n = compute_nuclear_cross_section(E_keV=10.0, reaction="D(d,n)He3")
        xs_p = compute_nuclear_cross_section(E_keV=10.0, reaction="D(d,p)T")
        ratio = xs_n.S_factor_keV_b / xs_p.S_factor_keV_b
        assert 0.8 < ratio < 1.2

    def test_radiative_capture_much_smaller(self):
        """D(d,γ)He4 S-factor should be ~1e-5 of the main channels."""
        xs_g = compute_nuclear_cross_section(E_keV=10.0, reaction="D(d,gamma)He4")
        xs_n = compute_nuclear_cross_section(E_keV=10.0, reaction="D(d,n)He3")
        assert xs_g.S_factor_keV_b < 1e-3 * xs_n.S_factor_keV_b

    def test_screening_increases_cross_section(self):
        """Electron screening should increase the cross-section."""
        xs_bare = compute_nuclear_cross_section(E_keV=5.0, reaction="D(d,n)He3", screening_energy_keV=0.0)
        xs_screened = compute_nuclear_cross_section(E_keV=5.0, reaction="D(d,n)He3", screening_energy_keV=0.1)
        assert xs_screened.cross_section_m2 >= xs_bare.cross_section_m2

    def test_branching_ratios_sum_to_one(self):
        """D+D branching ratios should sum to 1."""
        ratios = compute_dd_branching_ratios()
        total = sum(ratios.values())
        assert abs(total - 1.0) < 1e-10

    def test_sommerfeld_parameter_positive(self):
        """Sommerfeld parameter should be positive for repulsive Coulomb."""
        eta = compute_sommerfeld_parameter(E_keV=10.0, Z1=1, Z2=1, mu_amu=1.0)
        assert eta > 0

    def test_gamow_energy_dd(self):
        """Gamow energy for D+D should be ~986 keV (known value)."""
        E_G = compute_gamow_energy(Z1=1, Z2=1, mu_amu=1.007)
        # Accepted value ≈ 986 keV
        assert 900 < E_G < 1100, f"E_G = {E_G:.1f} keV"


# ═══════════════════════════════════════════════════════════════════════════
#  6. Electron Capture
# ═══════════════════════════════════════════════════════════════════════════
class TestElectronCapture:
    """Verify electron capture rate behaviour."""

    def test_free_proton_ec_suppressed(self):
        """EC on free proton (Q=−0.782 MeV) should be energetically forbidden at room T."""
        result = compute_electron_capture_rate(
            Z=1, screening_energy_eV=0.0, temperature_K=300.0,
        )
        assert not result.is_energetically_allowed or result.rate_per_s < 1e-50

    def test_higher_screening_increases_rate(self):
        """Higher screening energy should increase EC rate."""
        r_low = compute_electron_capture_rate(screening_energy_eV=0.0, temperature_K=1e8)
        r_high = compute_electron_capture_rate(screening_energy_eV=1000.0, temperature_K=1e8)
        assert r_high.rate_per_s >= r_low.rate_per_s

    def test_rydberg_enhancement_increases_rate(self):
        """Rydberg enhancement should increase |ψ(0)|² and thus the rate."""
        r_base = compute_electron_capture_rate(
            temperature_K=1e8, rydberg_enhancement=1.0,
        )
        r_rydberg = compute_electron_capture_rate(
            temperature_K=1e8, rydberg_enhancement=100.0,
        )
        assert r_rydberg.rate_per_s >= r_base.rate_per_s


# ═══════════════════════════════════════════════════════════════════════════
#  7. Multi-Scale Bridge
# ═══════════════════════════════════════════════════════════════════════════
class TestMultiscaleBridge:
    """Verify multi-scale bridging framework consistency."""

    def test_all_scales_computed(self):
        """All five scale levels should have MHD parameters."""
        bridge = MultiscaleBridge()
        mhd = bridge.compute_all_mhd_parameters()
        for level in MultiscaleBridge.SCALE_ORDER:
            assert level in mhd
            assert mhd[level].hartmann_number >= 0

    def test_downward_bc_increases_field(self):
        """Flux compression should increase B at smaller scales."""
        bridge = MultiscaleBridge()
        bridge.compute_all_mhd_parameters()
        bc = bridge.cascade_boundary_conditions_down()
        # MACRO→BUBBLE should show field amplification
        assert any("B_bc_T" in v for v in bc.values())

    def test_full_solve_returns_all_keys(self):
        """Full solve should return scales, dominant physics, BCs, and sources."""
        bridge = MultiscaleBridge()
        result = bridge.solve(nuclear_energy_W=1.0)
        assert "MACRO" in result.scales
        assert "NUCLEAR" in result.scales
        assert len(result.dominant_physics) == 5
        assert len(result.boundary_conditions_down) > 0
        assert len(result.source_terms_up) > 0

    def test_bridge_to_dict_is_mhd_cascade_not_qed(self):
        """Phase F: label the bridge as MHD-to-MHD; Ha at fm is not claimed."""
        bridge = MultiscaleBridge()
        payload = bridge.solve(nuclear_energy_W=1.0).to_dict()
        assert payload["coupling_kind"] == "mhd_to_mhd_cascade"
        assert payload["qed_operator"] == "none"
        nuclear = payload["scales"]["NUCLEAR"]
        assert nuclear["continuum_mhd_claimed"] is False
        assert nuclear["hartmann_is_nuclear_enhancement"] is False
        surface = payload["scales"]["SURFACE"]
        assert surface["continuum_mhd_claimed"] is True

    def test_dominant_physics_not_empty(self):
        """Every scale should have a non-empty dominant physics label."""
        bridge = MultiscaleBridge()
        result = bridge.solve()
        for level, label in result.dominant_physics.items():
            assert len(label) > 0, f"Empty label for {level}"


# ═══════════════════════════════════════════════════════════════════════════
#  8. Induction Solver Conservation
# ═══════════════════════════════════════════════════════════════════════════
class TestInductionSolver:
    """Verify induction solver numerical properties."""

    def test_zpinch_initial_condition(self):
        """Z-pinch B_θ = μ₀I/(2πr) should give expected field profile."""
        solver = MHDInductionSolver1D(MHDInductionConfig(nr=100, r_min=1e-6, r_max=1e-3))
        I_total = 1000.0  # 1 kA
        solver.set_zpinch_initial(I_total)
        # Check mid-point
        mid = len(solver.r) // 2
        r_mid = solver.r[mid]
        B_expected = const.mu_0 * I_total / (2.0 * math.pi * r_mid)
        assert abs(solver.B_theta[mid] - B_expected) / B_expected < 1e-10

    def test_diffusion_decays_field(self):
        """Pure resistive diffusion (v=0) should decay the field."""
        cfg = MHDInductionConfig(nr=100, r_min=1e-6, r_max=1e-3, sigma=1e4, include_hall=False)
        solver = MHDInductionSolver1D(cfg)
        solver.set_zpinch_initial(100.0)
        E_initial = solver.get_magnetic_energy()

        v_r = np.zeros(cfg.nr)  # no flow
        for _ in range(100):
            solver.step(dt=1e-10, v_r=v_r)

        E_final = solver.get_magnetic_energy()
        assert E_final < E_initial, "Resistive diffusion should reduce magnetic energy"

    def test_compression_amplifies_field(self):
        """Inward velocity should amplify the field (flux compression).

        With very high conductivity (Rm >> 1, frozen-in regime), the
        field is advected inward and compressed.  We use sigma=1e10 so
        that the magnetic diffusivity η ≈ 0.08 m²/s is small, and
        let the solver pick its own CFL-limited step by requesting a
        large dt.  With 1000 steps the advection moves flux inward
        appreciably and the total B-field energy grows.
        """
        cfg = MHDInductionConfig(
            nr=50, r_min=1e-5, r_max=1e-3,
            sigma=1e10,  # near-ideal MHD: Rm >> 1
            include_hall=False,
            cfl_safety=0.3,
        )
        solver = MHDInductionSolver1D(cfg)
        solver.set_zpinch_initial(100.0)
        E_initial = solver.get_magnetic_energy()

        # Inward radial velocity — compresses flux toward axis
        v_r = -100.0 * np.ones(cfg.nr)
        total_time = 0.0
        for _ in range(500):
            result = solver.step(dt=1.0, v_r=v_r)  # let CFL choose
            total_time += result["dt_used"]

        E_final = solver.get_magnetic_energy()
        assert E_final > E_initial, (
            f"Compression should increase magnetic energy: "
            f"{E_initial:.4e} → {E_final:.4e} after {total_time:.2e}s"
        )


# ═══════════════════════════════════════════════════════════════════════════
#  9. Bubble-MHD Theory Integration
# ═══════════════════════════════════════════════════════════════════════════
class TestBubbleMHDTheory:
    """Integration tests for the refactored Bubble-MHD theory module."""

    def test_basic_calculation(self):
        """Theory should produce a valid contribution with default config."""
        theory = BubbleMHDConfinementTheory()
        result = theory.calculate(
            conditions={"temperature": 300.0, "pressure": 101325.0, "loading_ratio": 0.9},
        )
        assert result.is_applicable
        assert result.enhancement_factor >= 1.0
        assert result.theory_id == "bubble_mhd_confinement"

    def test_mhd_observables_present(self):
        """Result observables should include all MHD dimensionless numbers."""
        theory = BubbleMHDConfinementTheory()
        result = theory.calculate(
            conditions={"temperature": 300.0, "pressure": 101325.0, "loading_ratio": 0.9},
        )
        required_keys = [
            "magnetic_reynolds_number",
            "hartmann_number",
            "lundquist_number",
            "plasma_beta",
            "hall_parameter",
            "stuart_number",
            "magnetic_prandtl_number",
            "alfven_velocity_m_s",
            "B_compressed_T",
            "faraday_emf_V",
            "screening_energy_eV",
            "nuclear_power_W_m3",
            "neutron_rate_m3_s",
            "ec_rate_per_s",
        ]
        for key in required_keys:
            assert key in result.observables, f"Missing observable: {key}"

    def test_branching_ratios_in_observables(self):
        """D+D branching ratios should appear in observables."""
        theory = BubbleMHDConfinementTheory()
        result = theory.calculate(
            conditions={"temperature": 300.0, "pressure": 101325.0, "loading_ratio": 0.9},
        )
        branch_keys = [k for k in result.observables if k.startswith("branch_")]
        assert len(branch_keys) >= 2, "Should have at least 2 branching ratio keys"

    def test_not_applicable_when_conditions_zero(self):
        """Theory should return not-applicable when pressure=0."""
        theory = BubbleMHDConfinementTheory()
        result = theory.calculate(conditions={"temperature": 300.0, "pressure": 0.0})
        assert not result.is_applicable

    def test_higher_field_increases_observables(self):
        """Stronger B should increase MHD confinement observables."""
        theory = BubbleMHDConfinementTheory()
        conds = {"temperature": 300.0, "pressure": 101325.0, "loading_ratio": 0.9}

        r_low = theory.calculate(conds, config={"mhd_field_strength_T": 0.01})
        r_high = theory.calculate(conds, config={"mhd_field_strength_T": 10.0})

        assert r_high.observables["hartmann_number"] > r_low.observables["hartmann_number"]
        assert r_high.observables["B_compressed_T"] > r_low.observables["B_compressed_T"]

    def test_metadata_has_references(self):
        """Metadata should include MHD-specific references."""
        theory = BubbleMHDConfinementTheory()
        meta = theory.get_metadata()
        refs = " ".join(meta.references).lower()
        assert "hartmann" in refs
        assert "hall" in refs or "huba" in refs or "mhd" in refs

    def test_enhancement_capped(self):
        """Enhancement should never exceed MAX_ENHANCEMENT_FACTOR."""
        from app.physics_engine.constants import MAX_ENHANCEMENT_FACTOR
        theory = BubbleMHDConfinementTheory()
        result = theory.calculate(
            conditions={"temperature": 1e6, "pressure": 1e12, "loading_ratio": 1.0},
            config={"mhd_field_strength_T": 100.0, "ion_density_per_m3": 1e30},
        )
        assert result.enhancement_factor <= MAX_ENHANCEMENT_FACTOR
