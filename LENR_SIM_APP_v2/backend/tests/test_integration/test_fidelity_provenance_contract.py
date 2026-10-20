"""Contract locks for ARA P0 additive fidelity / provenance fields.

Additive only: existing science-gate tokens and lenr-run-export-v1 remain.
New keys must always be present on per_theory rows (content may be empty lists).
"""

from __future__ import annotations

from fastapi.testclient import TestClient


def _client() -> TestClient:
    from app.main import app

    return TestClient(app)


_FIDELITY_KEYS = (
    "primary_sources",
    "theory_model_version",
    "author_equations_vs_simulator_approximations",
    "free_or_fitted_parameters",
    "source_domain_limits",
    "model_fidelity",
    "empirical_support",
    # ARA Oct 2026 workbench (additive)
    "predicted_signatures",
    "falsifiers",
    "taxonomy_kind",
    "equation_citations",
    "identifiability_warnings",
    "historical_parents",
    "display_model_version",
    "control_role",
)


def test_theories_list_exposes_fidelity_axes() -> None:
    resp = _client().get("/api/physics/theories")
    assert resp.status_code == 200
    rows = resp.json()
    assert isinstance(rows, list) and len(rows) >= 2
    ids = {r["theory_id"] for r in rows}
    assert "holmlid_udh" in ids
    assert "kim_bec" in ids
    assert "null_recombination" in ids
    holmlid = next(r for r in rows if r["theory_id"] == "holmlid_udh")
    kim = next(r for r in rows if r["theory_id"] == "kim_bec")
    assert holmlid["model_fidelity"]
    assert kim["model_fidelity"]
    assert holmlid["theory_id"] != kim["theory_id"]
    null = next(r for r in rows if r["theory_id"] == "null_recombination")
    assert null.get("control_role") == "null" or null["category"] in (
        "null_control",
        "control",
    )


def test_theories_run_per_theory_includes_additive_provenance() -> None:
    resp = _client().post(
        "/api/physics/theories/run",
        json={
            "conditions": {
                "temperature": 300.0,
                "loading_ratio": 0.9,
                "electron_density": 1e28,
            },
            "enabled_theories": ["widom_larsen", "holmlid_udh", "null_recombination"],
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["contract_version"].endswith("-science-gate-1")
    assert "composition_provenance" in data
    assert "multiplier_stack_warning" in data["composition_provenance"]
    per = data["per_theory"]
    assert len(per) >= 3
    for row in per:
        for key in _FIDELITY_KEYS:
            assert key in row, f"missing additive field {key} on {row.get('theory_id')}"
    widom = next(r for r in per if r["theory_id"] == "widom_larsen")
    assert widom["primary_sources"]
    assert widom["model_fidelity"]
    assert widom["empirical_support"]
    assert widom["provenance"].get("not_dd_tunneling") is True
    holmlid = next(r for r in per if r["theory_id"] == "holmlid_udh")
    assert holmlid["provenance"].get("not_kim_becnf") is True
    assert widom["taxonomy_kind"] == "named_theory"
    assert isinstance(widom["predicted_signatures"], list)
    assert isinstance(widom["falsifiers"], list)


def test_theories_list_exposes_workbench_and_schwinger() -> None:
    resp = _client().get("/api/physics/theories")
    assert resp.status_code == 200
    rows = resp.json()
    ids = {r["theory_id"] for r in rows}
    assert "schwinger_lattice" in ids
    storms = next(r for r in rows if r["theory_id"] == "nae_model")
    assert "Storms" in storms["theory_name"]
    assert storms.get("display_model_version")
    assert storms.get("taxonomy_kind") == "named_theory"
    schwinger = next(r for r in rows if r["theory_id"] == "schwinger_lattice")
    assert "Nuclear Energy in an Atomic Lattice" in schwinger["theory_name"]
    assert schwinger["predicted_signatures"]
    assert schwinger["falsifiers"]
    null = next(r for r in rows if r["theory_id"] == "null_recombination")
    assert null.get("control_role") == "null"
