"""
Phase 4.2: End-to-end integration tests for the simulation pipeline.

Tests the full theory pipeline (theory_pipeline.py / coupled execution),
physics theory outputs (ElectronScreening, HagelsteinPhonon, Casimir),
and simulation API endpoints with corrected physics.
"""

import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Minimal config and conditions for pipeline runs
# ---------------------------------------------------------------------------

MINIMAL_CONDITIONS = {
    "temperature": 300.0,
    "loading_ratio": 0.9,
    "pressure": 101325.0,
    "electron_density": 6.8e28,
}


# ---------------------------------------------------------------------------
# Theory pipeline integration tests
# ---------------------------------------------------------------------------

class TestTheoryPipelineIntegration:
    """Run the full theory pipeline with minimal config."""

    def test_pipeline_run_minimal_config(self):
        """Run theory pipeline.run() with minimal conditions."""
        from app.physics_engine.theory_pipeline import get_default_pipeline

        pipeline = get_default_pipeline()
        result = pipeline.run(
            conditions=MINIMAL_CONDITIONS,
            enabled_theories=["electron_screening", "hagelstein_phonon", "casimir_confinement"],
        )
        assert result is not None
        assert len(result.contributions) >= 3
        assert result.combined_enhancement >= 1.0
        assert result.enabled_theories

    def test_pipeline_run_coupled_minimal_config(self):
        """Run theory pipeline.run_coupled() with minimal config."""
        from app.physics_engine.theory_pipeline import get_default_pipeline

        pipeline = get_default_pipeline()
        result = pipeline.run_coupled(
            conditions=MINIMAL_CONDITIONS,
            enabled_theories=["electron_screening", "hagelstein_phonon", "casimir_confinement"],
        )
        assert result is not None
        assert len(result.contributions) >= 3
        assert result.combined_enhancement >= 1.0
        assert "conditions" in dir(result)
        # Coupled run enriches conditions
        assert "temperature" in result.conditions


# ---------------------------------------------------------------------------
# ElectronScreeningTheory: screening_regime and salpeter_valid
# ---------------------------------------------------------------------------

class TestElectronScreeningPhysics:
    """Verify ElectronScreeningTheory returns screening_regime and salpeter_valid."""

    def test_thomas_fermi_returns_regime_and_salpeter_valid(self):
        """thomas_fermi model must return screening_regime and salpeter_valid."""
        from app.physics_engine.theories.electron_screening import ElectronScreeningTheory

        theory = ElectronScreeningTheory()
        contrib = theory.calculate(
            MINIMAL_CONDITIONS,
            config={"screening_model": "thomas_fermi"},
        )
        assert contrib.is_applicable
        obs = contrib.observables
        assert "screening_regime" in obs
        assert "salpeter_valid" in obs
        assert obs["screening_regime"] in ("weak", "intermediate", "strong")
        assert isinstance(obs["salpeter_valid"], bool)

    def test_strong_model_returns_regime_and_salpeter_valid(self):
        """strong model must return screening_regime and salpeter_valid."""
        from app.physics_engine.theories.electron_screening import ElectronScreeningTheory

        theory = ElectronScreeningTheory()
        contrib = theory.calculate(
            MINIMAL_CONDITIONS,
            config={"screening_model": "strong"},
        )
        assert contrib.is_applicable
        obs = contrib.observables
        assert "screening_regime" in obs
        assert "salpeter_valid" in obs


# ---------------------------------------------------------------------------
# HagelsteinPhononTheory: naive_ruled_out when mechanism=naive and coupling < E_phonon
# ---------------------------------------------------------------------------

class TestHagelsteinPhononPhysics:
    """Verify HagelsteinPhononTheory returns naive_ruled_out for naive mechanism."""

    def test_naive_mechanism_low_coupling_returns_naive_ruled_out(self):
        """mechanism=naive and coupling < E_phonon must yield naive_ruled_out=True."""
        from app.physics_engine.theories.hagelstein_phonon import HagelsteinPhononTheory

        theory = HagelsteinPhononTheory()
        # coupling_strength=1e-30 yields g_coupling < E_phonon (~4e-20 J), so naive_ruled_out=True
        contrib = theory.calculate(
            MINIMAL_CONDITIONS,
            config={
                "mechanism": "naive",
                "coupling_strength": 1e-30,
                "phonon_frequency_Hz": 1e13,
            },
        )
        assert contrib.is_applicable
        obs = contrib.observables
        assert "naive_ruled_out" in obs
        assert obs["naive_ruled_out"] is True


# ---------------------------------------------------------------------------
# Casimir: domain_valid and warning for d < 2 nm
# ---------------------------------------------------------------------------

class TestCasimirPhysics:
    """Verify Casimir returns domain_valid and warning for d < 2 nm."""

    def test_casimir_d_lt_2nm_returns_domain_valid_and_warning(self):
        """Casimir with separation < 2 nm must return domain_valid=False and warning."""
        from app.physics_engine.theories.casimir_confinement import CasimirConfinementTheory

        theory = CasimirConfinementTheory()
        contrib = theory.calculate(
            MINIMAL_CONDITIONS,
            config={"separation_nm": 1.5},
        )
        assert contrib.is_applicable
        obs = contrib.observables
        assert "domain_valid" in obs
        assert obs["domain_valid"] is False
        assert "warning" in obs
        assert "2 nm" in obs["warning"] or "2nm" in obs["warning"].lower()

    def test_casimir_d_ge_2nm_returns_domain_valid_true(self):
        """Casimir with separation >= 2 nm must return domain_valid=True."""
        from app.physics_engine.theories.casimir_confinement import CasimirConfinementTheory

        theory = CasimirConfinementTheory()
        contrib = theory.calculate(
            MINIMAL_CONDITIONS,
            config={"separation_nm": 3.0},
        )
        assert contrib.is_applicable
        obs = contrib.observables
        assert obs["domain_valid"] is True


# ---------------------------------------------------------------------------
# API endpoints: simulation and theory pipeline
# ---------------------------------------------------------------------------

@pytest.fixture
def client():
    """Test client for API integration tests."""
    from app.main import app
    return TestClient(app)


class TestSimulationAPI:
    """Verify simulation and theory API endpoints return coherent results."""

    def test_theories_list_endpoint(self, client):
        """GET /api/physics/theories returns theory list."""
        response = client.get("/api/physics/theories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        ids = [t["theory_id"] for t in data]
        assert "electron_screening" in ids
        assert "hagelstein_phonon" in ids
        assert "casimir_confinement" in ids

    def test_theories_run_endpoint_minimal(self, client):
        """POST /api/physics/theories/run returns combined enhancement."""
        response = client.post(
            "/api/physics/theories/run",
            json={
                "conditions": MINIMAL_CONDITIONS,
                "enabled_theories": ["electron_screening", "hagelstein_phonon", "casimir_confinement"],
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "combined_enhancement" in data
        assert "per_theory" in data
        assert data["combined_enhancement"] >= 1.0
        assert len(data["per_theory"]) >= 3

    def test_single_theory_electron_screening_via_api(self, client):
        """POST /api/physics/theories/electron_screening/run returns regime and salpeter_valid."""
        response = client.post(
            "/api/physics/theories/electron_screening/run",
            json={
                "conditions": MINIMAL_CONDITIONS,
                "config": {"screening_model": "thomas_fermi"},
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "observables" in data
        obs = data["observables"]
        assert "screening_regime" in obs
        assert "salpeter_valid" in obs

    def test_single_theory_hagelstein_naive_via_api(self, client):
        """POST hagelstein_phonon with mechanism=naive returns naive_ruled_out."""
        response = client.post(
            "/api/physics/theories/hagelstein_phonon/run",
            json={
                "conditions": MINIMAL_CONDITIONS,
                "config": {"mechanism": "naive", "coupling_strength": 1e-30},
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "observables" in data
        assert data["observables"].get("naive_ruled_out") is True

    def test_single_theory_casimir_d_lt_2nm_via_api(self, client):
        """POST casimir_confinement with d<2nm returns domain_valid and warning."""
        response = client.post(
            "/api/physics/theories/casimir_confinement/run",
            json={
                "conditions": MINIMAL_CONDITIONS,
                "config": {"separation_nm": 1.5},
            },
        )
        assert response.status_code == 200
        data = response.json()
        obs = data.get("observables", {})
        assert obs.get("domain_valid") is False
        assert "warning" in obs

    def test_run_coupled_via_analytics_api(self, client):
        """POST /api/analytics/theories/run-coupled returns coherent results."""
        response = client.post(
            "/api/analytics/theories/run-coupled",
            json={
                "conditions": MINIMAL_CONDITIONS,
                "enabled_theories": ["electron_screening", "casimir_confinement"],
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "contributions" in data
        assert "combined_enhancement" in data
        assert "execution_order" in data
        assert data["combined_enhancement"] >= 1.0
