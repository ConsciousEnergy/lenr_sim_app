"""Campaign-level ranking of lab avenues for informativeness (Phase B).

Reuses reaction_rate UQ (``experimental_band``), collapse UQ, and
decision_oracle priors. Seeds from reviewer packs. Honesty:

- ``kind`` is ``scenario_table_not_posterior`` when ranking over model packs
- ``lenr_proved`` is always False
- EQ-OPEN-* statuses stay OPEN (never closed here)

Does not declare LENR proved.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple

from scipy import constants as const

from app.campaign.avenue_catalog import (
    CAVITATION_PACK_ID,
    DEFAULT_RATE_BAND,
    MILES_Q_BAND_MEV,
    OPEN_IDS,
    avenue_definitions,
)
from app.campaign.avenue_pack_io import (
    config_from_row,
    discover_seed_packs,
    load_pack_experiments,
    pack_coverage,
    representative_row,
)
from app.physics_engine.decision_oracle import (
    ANCHORED_PRIORS,
    DEFAULT_PRIORS,
    MILES_MEV_MAX,
    MILES_MEV_MIN,
    evaluate_determination,
    miles_q_mev,
)
from app.physics_engine.unified_lenr_model.reaction_rate_uq import (
    propagate_rate_uncertainty,
)

SCHEMA = "lenr-avenue-ranking-v1"
DISCLAIMER = (
    "Campaign-level avenue ranking over model-output packs and UQ/oracle "
    "machinery. Scenario table, not a laboratory posterior. Does not prove "
    "LENR. Does not close EQ-OPEN-*. Does not set lenr_proved."
)


def _rate_band_from_row(row: Mapping[str, Any]) -> Tuple[float, float]:
    rate = row.get("fusion_rate")
    results = row.get("results") or {}
    obs = results.get("observables") or {}
    if rate is None:
        rate = obs.get("reaction_rate")
    try:
        value = float(rate) if rate is not None else 0.0
    except (TypeError, ValueError):
        value = 0.0
    if value > 0.0:
        return (value / 10.0, value * 10.0)
    return DEFAULT_RATE_BAND


def _score_rate_uq(
    row: Mapping[str, Any],
    *,
    n_samples: int,
    seed: int,
) -> Dict[str, Any]:
    config = config_from_row(row)
    params = row.get("parameters") or {}
    mode = str(params.get("rate_mode") or "two_body")
    band = _rate_band_from_row(row)
    material_key = str(config.host_material.name).lower()
    prior = propagate_rate_uncertainty(
        config,
        mode=mode,
        n_samples=n_samples,
        seed=seed,
        experimental_band=None,
        material_key=material_key,
    )
    post = propagate_rate_uncertainty(
        config,
        mode=mode,
        n_samples=n_samples,
        seed=seed,
        experimental_band=band,
        material_key=material_key,
    )
    prior_width = max(
        prior.credible_interval["p95"] - prior.credible_interval["p05"], 0.0
    )
    post_width = max(
        post.credible_interval["p95"] - post.credible_interval["p05"], 0.0
    )
    prior_log = math.log10(max(prior_width, 1e-300))
    post_log = math.log10(max(post_width, 1e-300))
    return {
        "interval_kind_prior": prior.interval_kind,
        "interval_kind_posterior": post.interval_kind,
        "experimental_band": list(band),
        "width_shrink_log10": max(0.0, prior_log - post_log),
        "claim_tier": post.claim_tier,
    }


def _score_oracle_separation() -> Dict[str, Any]:
    """Bayes-factor style separation under Miles-band vs null observations."""
    null = evaluate_determination(rate_mode="two_body", observations={})
    q_target = 0.5 * (MILES_MEV_MIN + MILES_MEV_MAX)
    he4 = 1.0 / (q_target * const.e * 1e6)
    miles = evaluate_determination(
        rate_mode="trapped_state",
        observations={
            "excess_power_W": 1.0,
            "he4_atoms_per_s": he4,
            "sigma_Q_W": 0.1,
            "gamma_cps_ul": 1e-3,
        },
    )
    oracle_b = miles["oracle_b"]
    bf_trap = float(oracle_b.get("bayes_factor_trapped_vs_two_body") or 1.0)
    bf_null = float(oracle_b.get("bayes_factor_two_body_vs_null") or 1.0)
    separation = abs(math.log10(max(bf_trap, 1e-300))) + abs(
        math.log10(max(bf_null, 1e-300))
    )
    return {
        "null_status": null["status"],
        "miles_status": miles["status"],
        "priors_source_miles": oracle_b.get("priors_source"),
        "occurrence_anchored": oracle_b.get("occurrence_anchored"),
        "q_mev_check": miles_q_mev(1.0, he4),
        "miles_band_mev": list(MILES_Q_BAND_MEV),
        "log10_hypothesis_separation": separation,
        "next_measurement": list(miles.get("next_measurement") or []),
    }


def _score_collapse_uq(
    *,
    n_samples: int,
    seed: int,
    material: str = "palladium",
) -> Dict[str, Any]:
    from app.physics_engine.bubble_lattice_interaction import (
        BubbleLatticeInteraction,
        BubbleParameters,
        LatticeParameters,
    )
    from app.physics_engine.collapse_uq import propagate_collapse_uncertainty

    bubble = BubbleParameters(
        initial_radius=10e-6,
        driving_pressure=1.5e5,
        frequency=20e3,
        ambient_temperature=298.0,
    )
    model = BubbleLatticeInteraction(
        bubble, LatticeParameters.for_material(material)
    )
    result = propagate_collapse_uncertainty(
        model=model,
        compression_ratio=1000.0,
        temperature_ceiling=2.0e6,
        pressure_ceiling=1.0e10,
        n_samples=n_samples,
        seed=seed,
        material=material,
    )
    temp = result["observables"]["peak_temperature_k"]["credible_interval"]
    width = max(temp["p95"] - temp["p05"], 0.0)
    sens = result.get("sensitivity") or {}
    peak_sens = sens.get("peak_temperature") or {}
    top_sens = (
        max((float(v) for v in peak_sens.values()), default=0.0) if peak_sens else 0.0
    )
    return {
        "interval_kind": "predictive",
        "peak_temperature_width_k": width,
        "top_sensitivity": top_sens,
        "kind": "scenario_table_not_posterior",
    }


def _informativeness(
    *,
    oracle_rank: int,
    coverage: float,
    uq_shrink: float,
    separation: float,
    collapse_width_score: float,
    cavitation_boost: float,
) -> float:
    rank_score = 1.0 / float(max(oracle_rank, 1))
    return (
        0.35 * rank_score
        + 0.25 * min(coverage, 1.0)
        + 0.20 * min(uq_shrink / 5.0, 1.0)
        + 0.15 * min(separation / 5.0, 1.0)
        + 0.05 * min(collapse_width_score, 1.0)
        + cavitation_boost
    )


def rank_avenues(
    *,
    pack_ids: Optional[Sequence[str]] = None,
    n_uq_samples: int = 32,
    seed: int = 42,
) -> Dict[str, Any]:
    """Build campaign-level avenue ranking table (RORO). Never sets lenr_proved."""
    packs = discover_seed_packs(pack_ids)
    experiments: List[Dict[str, Any]] = []
    for pack_id in packs:
        experiments.extend(load_pack_experiments(pack_id))
    coverage = pack_coverage(experiments)
    oracle = _score_oracle_separation()
    separation = float(oracle["log10_hypothesis_separation"])
    has_cavitation_pack = CAVITATION_PACK_ID in packs
    collapse = _score_collapse_uq(n_samples=n_uq_samples, seed=seed)
    collapse_score = min(
        math.log10(max(collapse["peak_temperature_width_k"], 1.0)) / 6.0, 1.0
    )

    ranked: List[Dict[str, Any]] = []
    for avenue in avenue_definitions():
        stresses = list(avenue["stresses_open_ids"])
        cov = max((coverage.get(oid, 0.0) for oid in stresses), default=0.0)
        uq_meta: Dict[str, Any] = {"applied": False}
        uq_shrink = 0.0
        if avenue["uq_layer"] in {"reaction_rate_uq", "rate_and_oracle"}:
            row = representative_row(experiments, stresses)
            if row is not None:
                uq_meta = _score_rate_uq(row, n_samples=n_uq_samples, seed=seed)
                uq_meta["applied"] = True
                uq_shrink = float(uq_meta.get("width_shrink_log10") or 0.0)
        cav_boost = (
            0.15
            if avenue["id"] == "cavitation_collapse_uq" and has_cavitation_pack
            else 0.0
        )
        layer_collapse = collapse if avenue["uq_layer"] == "collapse_uq" else None
        score = _informativeness(
            oracle_rank=int(avenue["oracle_next_rank"]),
            coverage=cov,
            uq_shrink=uq_shrink if avenue["uq_layer"] != "collapse_uq" else 0.0,
            separation=(
                separation
                if avenue["uq_layer"] in {"oracle", "rate_and_oracle"}
                else 0.0
            ),
            collapse_width_score=(
                collapse_score if avenue["uq_layer"] == "collapse_uq" else 0.0
            ),
            cavitation_boost=cav_boost,
        )
        ranked.append(
            {
                "id": avenue["id"],
                "label": avenue["label"],
                "observable": avenue["observable"],
                "stresses_open_ids": stresses,
                "open_status": {oid: "OPEN" for oid in stresses},
                "ledger_rows": list(avenue["ledger_rows"]),
                "oracle_next_rank": avenue["oracle_next_rank"],
                "uq_layer": avenue["uq_layer"],
                "pack_coverage": cov,
                "informativeness_score": float(score),
                "rate_uq": uq_meta,
                "collapse_uq": layer_collapse,
                "optional_pack_id": avenue.get("optional_pack_id"),
                "optional_pack_present": (
                    has_cavitation_pack
                    if avenue.get("optional_pack_id") == CAVITATION_PACK_ID
                    else None
                ),
                "kind": "scenario_table_not_posterior",
                "lenr_proved": False,
            }
        )

    ranked.sort(key=lambda row: row["informativeness_score"], reverse=True)
    for index, row in enumerate(ranked, start=1):
        row["rank"] = index

    return {
        "schema": SCHEMA,
        "disclaimer": DISCLAIMER,
        "kind": "scenario_table_not_posterior",
        "lenr_proved": False,
        "forbidden": ["LENR_PROVED", "LENR_DISPROVED_AS_THEOREM"],
        "open_ids": list(OPEN_IDS),
        "open_status": {oid: "OPEN" for oid in OPEN_IDS},
        "pack_sources": packs,
        "n_experiments": len(experiments),
        "phase_a_pack_id": CAVITATION_PACK_ID,
        "phase_a_pack_present": has_cavitation_pack,
        "priors": {
            "default_skeptical": dict(DEFAULT_PRIORS),
            "occurrence_anchored": dict(ANCHORED_PRIORS),
        },
        "oracle_summary": {
            "log10_hypothesis_separation": separation,
            "priors_source_miles": oracle.get("priors_source_miles"),
            "occurrence_anchored": oracle.get("occurrence_anchored"),
            "miles_band_mev": list(MILES_Q_BAND_MEV),
            "next_measurement": oracle.get("next_measurement"),
        },
        "collapse_uq_summary": collapse,
        "avenues": ranked,
        "claim_tier": "speculative_exploratory",
        "notes": (
            "Scores blend decision_oracle next_measurement rank, pack OPEN-id "
            "coverage, reaction_rate UQ band-shrink, oracle hypothesis "
            "separation, and collapse UQ predictive width. Soft-boosts "
            f"{CAVITATION_PACK_ID} when that pack is on disk."
        ),
    }


def assert_ranking_honesty(payload: Mapping[str, Any]) -> None:
    """Raise AssertionError if ranking flips OPEN or sets lenr_proved."""
    if payload.get("lenr_proved") is not False:
        raise AssertionError("avenue ranking must set lenr_proved=False")
    if payload.get("kind") != "scenario_table_not_posterior":
        raise AssertionError("ranking table must be scenario_table_not_posterior")
    open_status = payload.get("open_status") or {}
    for oid in OPEN_IDS:
        if open_status.get(oid) != "OPEN":
            raise AssertionError(f"{oid} must remain OPEN")
    for avenue in payload.get("avenues") or []:
        if avenue.get("lenr_proved") is not False:
            raise AssertionError(f"avenue {avenue.get('id')} set lenr_proved")
        for oid, status in (avenue.get("open_status") or {}).items():
            if status != "OPEN":
                raise AssertionError(f"avenue flipped {oid} to {status}")


# Re-export pack discovery for callers / tests.
__all__ = [
    "SCHEMA",
    "DISCLAIMER",
    "rank_avenues",
    "assert_ranking_honesty",
    "discover_seed_packs",
    "load_pack_experiments",
]
