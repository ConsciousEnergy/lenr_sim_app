"""Decision oracle (Oracle B) — hypothesis comparison, not a nature theorem.

Scores chemical/null vs two_body vs trapped_state vs three_body under explicit
skeptical priors. Never emits LENR_PROVED or P(LENR)=x% as a fact of nature.
"""
from __future__ import annotations

import math
from typing import Any, Dict, List, Mapping, Optional, Tuple

from scipy import constants as const

Q_DD_HE4_MEV = 23.8
MILES_MEV_MIN = 20.0
MILES_MEV_MAX = 28.0
TWO_BODY_LOG10_N_EVENTS = -40.0
E_CHARGE = const.e

HYPOTHESES: Tuple[str, ...] = (
    "chemical_null",
    "two_body",
    "trapped_state",
    "three_body",
)

# Skeptical defaults: two_body reference + competitive null. SPEC modes small.
DEFAULT_PRIORS: Dict[str, float] = {
    "chemical_null": 0.35,
    "two_body": 0.50,
    "trapped_state": 0.10,
    "three_body": 0.05,
}

FORBIDDEN_STATUS = ("LENR_PROVED", "LENR_DISPROVED_AS_THEOREM")


def _normalize_priors(priors: Optional[Mapping[str, float]]) -> Dict[str, float]:
    merged = dict(DEFAULT_PRIORS)
    if priors:
        for key, value in priors.items():
            if key in merged and value is not None:
                merged[key] = max(float(value), 0.0)
    total = sum(merged.values()) or 1.0
    return {k: v / total for k, v in merged.items()}


def miles_q_mev(excess_power_w: float, he4_atoms_per_s: float) -> Optional[float]:
    """Q (MeV/He) from simultaneous heat and helium rates. None if undefined."""
    if excess_power_w <= 0.0 or he4_atoms_per_s <= 0.0:
        return None
    joule_per_atom = excess_power_w / he4_atoms_per_s
    return joule_per_atom / (E_CHARGE * 1e6)


def _log_evidence(
    *,
    hypothesis: str,
    rate_mode: str,
    q_mev: Optional[float],
    sigma_q_w: Optional[float],
    gamma_cps_ul: Optional[float],
    two_body_log10_n: float,
    unphysical: bool,
) -> float:
    """Approximate log-evidence (nats of a toy scoring model, not MCMC)."""
    score = 0.0
    if hypothesis == "two_body":
        score += two_body_log10_n * 2.302585  # ln(10) * log10 N_events
        if q_mev is not None and MILES_MEV_MIN <= q_mev <= MILES_MEV_MAX:
            score += 1.0  # ash consistency does not close the rate budget
    elif hypothesis == "chemical_null":
        if q_mev is None:
            score += 0.5
        elif q_mev < MILES_MEV_MIN or q_mev > MILES_MEV_MAX:
            score += 1.5
        else:
            score -= 2.0
        if gamma_cps_ul is not None and gamma_cps_ul <= 0.0:
            score += 0.2
    elif hypothesis == "trapped_state":
        score -= 2.0  # SPEC penalty (skeptical prior on occupation)
        if rate_mode == "trapped_state":
            score += 0.5
        if q_mev is not None and MILES_MEV_MIN <= q_mev <= MILES_MEV_MAX:
            score += 1.0
        if unphysical:
            score -= 8.0
    else:  # three_body
        score -= 2.5
        if rate_mode == "three_body":
            score += 0.5
        if unphysical:
            score -= 8.0
    if sigma_q_w is not None and sigma_q_w <= 0:
        score -= 1.0
    return score


def _softmax(log_scores: Mapping[str, float], priors: Mapping[str, float]) -> Dict[str, float]:
    weighted = {h: log_scores[h] + math.log(max(priors[h], 1e-300)) for h in HYPOTHESES}
    m = max(weighted.values())
    exps = {h: math.exp(weighted[h] - m) for h in HYPOTHESES}
    z = sum(exps.values()) or 1.0
    return {h: exps[h] / z for h in HYPOTHESES}


def evaluate_determination(
    *,
    rate_mode: str = "two_body",
    route_mode: str = "legacy_unified_model",
    two_body_log10_n_events: float = TWO_BODY_LOG10_N_EVENTS,
    unphysical: bool = False,
    observations: Optional[Mapping[str, Any]] = None,
    priors: Optional[Mapping[str, float]] = None,
    uq_interval_kind: Optional[str] = None,
) -> Dict[str, Any]:
    """RORO: named-hypothesis determination. Never sets lenr_occurs."""
    obs = dict(observations or {})
    pi = _normalize_priors(priors)
    mode = (rate_mode or "two_body").strip().lower()
    if mode not in {"two_body", "trapped_state", "three_body"}:
        mode = "two_body"

    if route_mode == "local_fallback":
        return {
            "status": "INCONCLUSIVE",
            "oracle_a": {
                "two_body_budget_closes": False,
                "lean_theorems": [],
                "note": "local_fallback: Oracle A not evaluated on schematic client values.",
            },
            "oracle_b": {
                "hypotheses": [],
                "priors": pi,
                "priors_source": "default_skeptical",
                "note": "UNAVAILABLE on local_fallback",
            },
            "oracle_emp": {"miles_band_gate": None, "evaluated": False},
            "next_measurement": [],
            "forbidden": list(FORBIDDEN_STATUS),
            "disclaimer": (
                "Determination under named hypotheses. Not LENR_PROVED. "
                "local_fallback must not look closed."
            ),
        }

    power = obs.get("excess_power_W")
    he4 = obs.get("he4_atoms_per_s")
    q_mev = None
    if power is not None and he4 is not None:
        q_mev = miles_q_mev(float(power), float(he4))

    sigma_q = obs.get("sigma_Q_W")
    gamma_ul = obs.get("gamma_cps_ul")
    log_ev = {
        h: _log_evidence(
            hypothesis=h,
            rate_mode=mode,
            q_mev=q_mev,
            sigma_q_w=float(sigma_q) if sigma_q is not None else None,
            gamma_cps_ul=float(gamma_ul) if gamma_ul is not None else None,
            two_body_log10_n=float(two_body_log10_n_events),
            unphysical=bool(unphysical),
        )
        for h in HYPOTHESES
    }
    posterior = _softmax(log_ev, pi)

    def bayes_factor(num: str, den: str) -> float:
        """p(D|Hi)/p(D|Hj) from log-evidence; priors are reported separately."""
        return float(math.exp(log_ev[num] - log_ev[den]))

    miles_in_band = q_mev is not None and MILES_MEV_MIN <= q_mev <= MILES_MEV_MAX
    has_lab = any(
        obs.get(k) is not None
        for k in ("excess_power_W", "he4_atoms_per_s", "sigma_Q_W", "gamma_cps_ul")
    )
    p4 = obs.get("p_4_occupation")
    sigma_q = float(sigma_q) if sigma_q is not None else None
    power_w = float(power) if power is not None else None
    snr = None
    if sigma_q is not None and sigma_q > 0 and power_w is not None:
        snr = abs(power_w) / sigma_q
    null_excess_falsified = (
        miles_in_band
        and snr is not None
        and snr >= 3.0
        and mode != "two_body"
    )

    if unphysical:
        status = "UNPHYSICAL_POWER_DENSITY"
    elif mode == "two_body" and two_body_log10_n_events < 0:
        status = "RATE_BUDGET_DOES_NOT_CLOSE"
    elif mode in {"trapped_state", "three_body"} and not has_lab:
        status = "PRIOR_SENSITIVE_SPEC"
    elif mode == "trapped_state" and has_lab and p4 is None:
        status = "MEV_GAP_CHANNEL_UNCONSTRAINED"
    elif null_excess_falsified:
        status = "FALSIFIED_UNDER_H0"
    elif miles_in_band:
        status = "EMP_CONSISTENT_NUCLEAR_ASH"
    elif has_lab:
        status = "SPEC_SCENARIO_ODDS"
    elif sigma_q is not None:
        status = "WOULD_BE_DETECTABLE_IF"
    else:
        status = "INCONCLUSIVE"

    if status in FORBIDDEN_STATUS:
        status = "INCONCLUSIVE"

    ig: List[Dict[str, Any]] = [
        {
            "observable": "he4",
            "rank": 1,
            "rationale": "Separates nuclear ash from chemical_null (Miles EMP band).",
        },
        {
            "observable": "gamma_ul",
            "rank": 2,
            "rationale": "Efficiency-corrected 23.8 MeV γ UL addresses EQ-OPEN-RAD-01.",
        },
        {
            "observable": "sigma_Q",
            "rank": 3,
            "rationale": "Calorimetry resolution for WOULD_BE_DETECTABLE_IF / SNR.",
        },
        {
            "observable": "p_4_occupation",
            "rank": 4,
            "rationale": "Constrains EQ-TSC-OCC-OPEN; never auto-flips two_body default.",
        },
    ]

    ln10 = math.log(10.0)
    hypotheses_out = [
        {
            "id": h,
            "log_evidence": log_ev[h],
            "posterior": posterior[h],
            "log10_bayes_vs_null": (log_ev[h] - log_ev["chemical_null"]) / ln10,
            "log10_bayes_vs_two_body": (log_ev[h] - log_ev["two_body"]) / ln10,
            "claim_tier": (
                "established_reference" if h == "two_body"
                else ("null" if h == "chemical_null" else "speculative_exploratory")
            ),
        }
        for h in HYPOTHESES
    ]

    return {
        "status": status,
        "oracle_a": {
            "two_body_budget_closes": False,
            "log10_n_events_two_body": two_body_log10_n_events,
            "lean_theorems": [
                "EQ-RATE-2B-NC-01",
                "EQ-PHONON-N-01",
                "EQ-RATE-COND-01",
            ],
            "note": "Lean certifies identities and does-not-close under stated defs.",
        },
        "oracle_b": {
            "hypotheses": hypotheses_out,
            "priors": pi,
            "priors_source": "user" if priors else "default_skeptical",
            "bayes_factor_trapped_vs_two_body": bayes_factor("trapped_state", "two_body"),
            "bayes_factor_three_body_vs_two_body": bayes_factor("three_body", "two_body"),
            "bayes_factor_two_body_vs_null": bayes_factor("two_body", "chemical_null"),
            "interval_kind": uq_interval_kind or "none",
            "method": "approximate_log_evidence_softmax",
            "engine_fusion_probability_is_not_the_prior": True,
        },
        "oracle_emp": {
            "evaluated": q_mev is not None,
            "q_mev_per_he4": q_mev,
            "miles_band_gate": miles_in_band if q_mev is not None else None,
            "miles_band_mev": [MILES_MEV_MIN, MILES_MEV_MAX],
            "note": "Miles conversion is THM; heat-He correlation is EMP.",
        },
        "next_measurement": ig,
        "forbidden": list(FORBIDDEN_STATUS),
        "disclaimer": (
            "Determination under named hypotheses and optional user data. "
            "Not LENR_PROVED. Bayes odds do not flip EQ-OPEN-* rows."
        ),
    }
