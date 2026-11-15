"""BDS-304: literature / MoE / Bayesian SQL columns + seed honesty.

Alembic 003 adds first-class queryable fields. Miles instrument_precision
stays non-discovery; EQ-OPEN remain OPEN; never lenr_proved.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest
from sqlalchemy import Boolean, Float, JSON, String, Text

from app.data.baseline_experiments import get_baseline_experiments
from app.data.dataset_io import iccf27_literature_records
from app.models.database_models import AnalyticsSnapshot, Experiment
from app.services.literature_moe_persistence import (
    literature_moe_columns_from_record,
    merge_bayesian_into_results,
)


ALEMBIC_VERSIONS = (
    Path(__file__).resolve().parents[2] / "alembic" / "versions"
)


def _load_migration(module_stem: str):
    path = next(ALEMBIC_VERSIONS.glob(f"*{module_stem}*.py"))
    spec = importlib.util.spec_from_file_location(path.stem, path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_alembic_003_revises_002_and_adds_literature_moe_columns() -> None:
    mig_002 = _load_migration("002_theory_runs")
    mig_003 = _load_migration("003_literature_moe_bayesian")
    assert mig_002.revision == "002"
    assert mig_003.revision == "003"
    assert mig_003.down_revision == "002"
    assert mig_002.down_revision == "001"

    source = Path(mig_003.__file__).read_text(encoding="utf-8")
    for column in (
        "literature_id",
        "claim_tag",
        "citation_key",
        "open_question_ids",
        "sigma_q_w",
        "moe_provenance",
        "moe_citation_keys",
        "s_heat",
        "discovery_grade_eligible",
        "bayesian_summary",
    ):
        assert f'"{column}"' in source or f"'{column}'" in source
    assert "analytics_snapshots" in source
    assert "downgrade" in source


def test_experiment_orm_exposes_literature_moe_bayesian_columns() -> None:
    columns = {column.name: column for column in Experiment.__table__.columns}
    assert columns["literature_id"].type.length == 120
    assert isinstance(columns["claim_tag"].type, String)
    assert isinstance(columns["sigma_q_w"].type, Float)
    assert isinstance(columns["moe_provenance"].type, String)
    assert isinstance(columns["moe_citation_keys"].type, JSON)
    assert isinstance(columns["moe_notes"].type, Text)
    assert isinstance(columns["s_heat"].type, Float)
    assert isinstance(columns["discovery_grade_eligible"].type, Boolean)
    assert isinstance(columns["bayesian_summary"].type, JSON)
    assert columns["discovery_grade_eligible"].nullable is False

    snapshot_cols = {
        column.name: column for column in AnalyticsSnapshot.__table__.columns
    }
    assert "bayesian_summary" in snapshot_cols

    index_names = {index.name for index in Experiment.__table__.indexes}
    assert "ix_experiments_lit_claim" in index_names
    assert "ix_experiments_discovery_grade" in index_names


def test_miles_seed_columns_instrument_precision_non_discovery() -> None:
    miles = next(
        row
        for row in get_baseline_experiments()
        if row["literature_id"] == "miles-1993"
    )
    columns = literature_moe_columns_from_record(miles)

    assert columns["literature_id"] == "miles-1993"
    assert columns["claim_tag"] == "EMP"
    assert columns["citation_key"] == "miles1993"
    assert columns["sigma_q_w"] == 0.02
    assert (
        columns["moe_provenance"]
        == "literature_reported_instrument_precision"
    )
    assert "miles1993" in (columns["moe_citation_keys"] or [])
    assert columns["s_heat"] == 0.52 / 0.02
    assert columns["discovery_grade_eligible"] is False
    summary = columns["bayesian_summary"]
    assert summary["lenr_proved"] is False
    assert summary["discovery_grade_eligible"] is False
    assert all(status == "OPEN" for status in summary["eq_open_status"].values())

    merged = merge_bayesian_into_results(miles.get("results"), columns)
    assert merged["lenr_proved"] is False
    assert merged["discovery_grade_eligible"] is False
    assert merged["bayesian_summary"]["lenr_proved"] is False


def test_mckubre_seed_columns_omit_fabricated_sigma_q() -> None:
    mckubre = next(
        row
        for row in get_baseline_experiments()
        if row["literature_id"] == "mckubre-sri-p13-p14-1992"
    )
    columns = literature_moe_columns_from_record(mckubre)
    assert columns["sigma_q_w"] is None
    assert columns["sigma_q_instrument_floor_w"] == 0.01
    assert (
        columns["moe_provenance"]
        == "literature_reported_instrument_floor"
    )
    assert columns["s_heat"] is None
    assert columns["discovery_grade_eligible"] is False
    assert columns["bayesian_summary"]["lenr_proved"] is False


def test_deninno_instrument_precision_columns_non_discovery() -> None:
    deninno = next(
        row
        for row in get_baseline_experiments()
        if row["literature_id"] == "deninno-tid-1995"
    )
    columns = literature_moe_columns_from_record(deninno)
    assert columns["sigma_q_w"] == 0.02
    assert (
        columns["moe_provenance"]
        == "literature_reported_instrument_precision"
    )
    assert columns["discovery_grade_eligible"] is False
    assert all(
        status == "OPEN"
        for status in columns["bayesian_summary"]["eq_open_status"].values()
    )


def test_kasagi_iccf_columns_can_flag_discovery_without_lenr_proved() -> None:
    """Analytics flag only — EQ-OPEN stay OPEN; never prove LENR."""
    nicu = next(
        row
        for row in iccf27_literature_records()
        if row["literature_id"] == "kasagi-nicu-radiant-2026"
    )
    columns = literature_moe_columns_from_record(nicu)
    assert columns["moe_provenance"] == "literature_reported"
    assert columns["sigma_q_w"] == 0.08
    assert columns["discovery_grade_eligible"] is True
    assert columns["bayesian_summary"]["lenr_proved"] is False
    assert all(
        status == "OPEN"
        for status in columns["bayesian_summary"]["eq_open_status"].values()
    )


def test_none_top_level_moe_falls_back_to_parameters() -> None:
    """Explicit None on the record must not block parameter MoE values."""
    columns = literature_moe_columns_from_record(
        {
            "excess_heat_watts": 1.0,
            "sigma_Q_W": None,
            "sigma_Q_instrument_floor_W": None,
            "moe_provenance": None,
            "parameters": {
                "sigma_Q_W": 0.08,
                "moe_provenance": "literature_reported",
                "moe_citation_keys": ["kasagi2026"],
                "literature_peak_excess_power_W": 1.1,
            },
            "moe_sigma_q_pairing_verified": True,
        }
    )
    assert columns["sigma_q_w"] == 0.08
    assert columns["moe_provenance"] == "literature_reported"
    assert columns["s_heat"] == 1.1 / 0.08


def test_preserves_measured_excess_power_fields() -> None:
    columns = literature_moe_columns_from_record(
        {
            "excess_heat_watts": 99.0,  # seed scale — must lose to measured
            "measured_excess_power_W": 0.4,
            "sigma_Q_W": 0.02,
            "moe_provenance": "literature_reported",
            "moe_citation_keys": ["miles1993"],
            "moe_sigma_q_pairing_verified": True,
        }
    )
    assert columns["s_heat"] == 0.4 / 0.02
    assert columns["bayesian_summary"]["q_source"] == "measured_excess_power_W"
    assert columns["bayesian_summary"]["q_is_seed_scale"] is False

    reported = literature_moe_columns_from_record(
        {
            "excess_heat_watts": 99.0,
            "excess_heat_watts_reported": 0.52,
            "sigma_Q_W": 0.02,
            "moe_provenance": "literature_reported_instrument_precision",
            "moe_citation_keys": ["miles1993"],
        }
    )
    assert reported["s_heat"] == 0.52 / 0.02
    assert reported["bayesian_summary"]["q_source"] == "excess_heat_watts_reported"
    assert reported["discovery_grade_eligible"] is False


def test_results_envelope_sigma_preferred_over_parameter_sigma() -> None:
    """Same-envelope Q+σ: do not pair results.q_ex_w with a different params σ."""
    columns = literature_moe_columns_from_record(
        {
            "excess_heat_watts": 0.0,
            "parameters": {"sigma_Q_W": 0.01},
            "results": {
                "q_ex_w": 0.4,
                "sigma_Q_W": 0.2,
                "moe_provenance": "literature_reported",
                "moe_citation_keys": ["kasagi2026"],
            },
        }
    )
    assert columns["sigma_q_w"] == 0.2
    assert columns["s_heat"] == 0.4 / 0.2  # not 0.4/0.01 = 40
    assert columns["moe_provenance"] == "literature_reported"
    assert columns["moe_citation_keys"] == ["kasagi2026"]
    assert columns["bayesian_summary"]["moe_sigma_q_pairing_verified"] is True
    # S_heat=2 < 5 → analytics flag stays false (pairing ok, bar not met)
    assert columns["discovery_grade_eligible"] is False


def test_mismatched_top_level_sigma_blocks_implicit_pairing() -> None:
    columns = literature_moe_columns_from_record(
        {
            "excess_heat_watts": 0.0,
            "sigma_Q_W": 0.01,  # conflicts with results envelope
            "moe_provenance": "literature_reported",
            "moe_citation_keys": ["kasagi2026"],
            "results": {"q_ex_w": 0.4, "sigma_Q_W": 0.2},
        }
    )
    assert columns["sigma_q_w"] == 0.01
    assert columns["s_heat"] == 0.4 / 0.01
    assert columns["moe_sigma_q_pairing_verified"] is False
    assert columns["discovery_grade_eligible"] is False


def test_invalid_measured_q_treated_as_missing_not_500() -> None:
    columns = literature_moe_columns_from_record(
        {
            "excess_heat_watts": 1.0,
            "parameters": {"measured_excess_power_W": "unknown"},
            "results": {"q_ex_w": "bad"},
            "sigma_Q_W": 0.02,
            "moe_provenance": "literature_reported_instrument_precision",
            "moe_citation_keys": ["miles1993"],
        }
    )
    assert columns["bayesian_summary"]["q_source"] == "excess_heat_watts"
    assert columns["s_heat"] == 1.0 / 0.02
    assert columns["discovery_grade_eligible"] is False


def test_non_finite_sigma_rejected() -> None:
    columns = literature_moe_columns_from_record(
        {
            "excess_heat_watts": 1.0,
            "sigma_Q_W": "NaN",
            "parameters": {"sigma_Q_W": 0.02},
            "moe_provenance": "literature_reported_instrument_precision",
            "moe_citation_keys": ["miles1993"],
        }
    )
    assert columns["sigma_q_w"] == 0.02


def test_measured_q_round_trip_via_results_and_to_dict() -> None:
    columns = literature_moe_columns_from_record(
        {
            "excess_heat_watts": 99.0,
            "measured_excess_power_W": 0.4,
            "sigma_Q_W": 0.02,
            "moe_provenance": "literature_reported",
            "moe_citation_keys": ["miles1993"],
            "moe_sigma_q_pairing_verified": True,
        }
    )
    merged = merge_bayesian_into_results({}, columns)
    assert merged["measured_excess_power_W"] == 0.4
    reloaded = literature_moe_columns_from_record(
        {
            "excess_heat_watts": 99.0,
            "sigma_Q_W": 0.02,
            "moe_provenance": "literature_reported",
            "moe_citation_keys": ["miles1993"],
            "moe_sigma_q_pairing_verified": True,
            "results": merged,
        }
    )
    assert reloaded["s_heat"] == 0.4 / 0.02
    assert reloaded["bayesian_summary"]["q_is_seed_scale"] is False

    experiment = Experiment(
        id="00000000-0000-0000-0000-000000000099",
        name="measured-q round trip",
        excess_heat_watts=99.0,
        sigma_q_w=0.02,
        moe_provenance="literature_reported",
        discovery_grade_eligible=False,
        bayesian_summary=columns["bayesian_summary"],
        results_json=merged,
    )
    payload = experiment.to_dict()
    assert payload["measured_excess_power_W"] == 0.4


def test_to_dict_falls_back_to_parameter_lists_when_sql_null() -> None:
    experiment = Experiment(
        id="00000000-0000-0000-0000-000000000098",
        name="upgrade null lists",
        open_question_ids=None,
        moe_citation_keys=None,
        parameters_json={
            "open_question_ids": ["EQ-OPEN-YIELD-01"],
            "moe_citation_keys": ["miles1993"],
        },
    )
    payload = experiment.to_dict()
    assert payload["open_question_ids"] == ["EQ-OPEN-YIELD-01"]
    assert payload["moe_citation_keys"] == ["miles1993"]


def test_merge_overwrites_caller_supplied_significance() -> None:
    columns = {
        "s_heat": None,
        "discovery_grade_eligible": False,
        "sigma_q_w": 0.02,
        "moe_provenance": "literature_reported_instrument_precision",
        "moe_citation_keys": ["miles1993"],
        "bayesian_summary": {
            "s_heat": None,
            "discovery_grade_eligible": False,
            "lenr_proved": False,
            "eq_open_status": {"EQ-OPEN-YIELD-01": "OPEN"},
        },
    }
    merged = merge_bayesian_into_results(
        {
            "s_heat": 999.0,
            "discovery_grade_eligible": True,
            "lenr_proved": True,
        },
        columns,
    )
    assert merged["s_heat"] is None
    assert merged["discovery_grade_eligible"] is False
    assert merged["lenr_proved"] is False
    assert merged["bayesian_summary"]["discovery_grade_eligible"] is False


def test_experiment_to_dict_includes_literature_moe_fields() -> None:
    columns = literature_moe_columns_from_record(
        next(
            row
            for row in get_baseline_experiments()
            if row["literature_id"] == "miles-1993"
        )
    )
    experiment = Experiment(
        id="00000000-0000-0000-0000-000000000001",
        name="Miles heat-He",
        is_baseline=True,
        literature_id=columns["literature_id"],
        claim_tag=columns["claim_tag"],
        citation_key=columns["citation_key"],
        doi=columns["doi"],
        open_question_ids=columns["open_question_ids"],
        sigma_q_w=columns["sigma_q_w"],
        moe_provenance=columns["moe_provenance"],
        moe_citation_keys=columns["moe_citation_keys"],
        s_heat=columns["s_heat"],
        discovery_grade_eligible=False,
        bayesian_summary=columns["bayesian_summary"],
    )
    payload = experiment.to_dict()
    assert payload["literature_id"] == "miles-1993"
    assert payload["sigma_Q_W"] == 0.02
    assert payload["moe_provenance"] == (
        "literature_reported_instrument_precision"
    )
    assert payload["discovery_grade_eligible"] is False
    assert payload["bayesian_summary"]["lenr_proved"] is False


def test_alembic_003_upgrade_downgrade_on_sqlite(tmp_path) -> None:
    """Apply 001→002→003 then downgrade 003 against isolated SQLite."""
    pytest.importorskip("alembic")
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    from sqlalchemy import create_engine, text

    db_path = tmp_path / "bds304_alembic.db"
    engine = create_engine(f"sqlite:///{db_path}")
    mig_001 = _load_migration("001_initial")
    mig_002 = _load_migration("002_theory_runs")
    mig_003 = _load_migration("003_literature_moe_bayesian")

    with engine.begin() as conn:
        ctx = MigrationContext.configure(conn)
        with Operations.context(ctx):
            mig_001.upgrade()
            mig_002.upgrade()
            mig_003.upgrade()

        cols = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info(experiments)"))
        }
        assert "literature_id" in cols
        assert "sigma_q_w" in cols
        assert "moe_provenance" in cols
        assert "s_heat" in cols
        assert "discovery_grade_eligible" in cols
        assert "bayesian_summary" in cols
        snap_cols = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info(analytics_snapshots)"))
        }
        assert "bayesian_summary" in snap_cols

        with Operations.context(MigrationContext.configure(conn)):
            mig_003.downgrade()

        cols_after = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info(experiments)"))
        }
        assert "literature_id" not in cols_after
        assert "sigma_q_w" not in cols_after
        assert "bayesian_summary" not in cols_after
        snap_after = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info(analytics_snapshots)"))
        }
        assert "bayesian_summary" not in snap_after

    engine.dispose()
