# v0.3.9-beta — pre-launch release-quality-gate evidence

**Date:** 2026-10-26  
**Train:** `dev` markers `0.3.9-beta`  
**Tip recorded:** `64d0157`  
**Confirm:** `CONFIRM_SWARM_0_3_9` **unset** — not a cutover arm.

Canonical gate write-ups live on the shared governance train docs (append-only
sections; science claim / `EQ-OPEN-*` text untouched):

- [`../v0.3.6-beta/VERIFICATION_GATE_REPORT.md`](../v0.3.6-beta/VERIFICATION_GATE_REPORT.md) — “v0.3.9-beta pre-launch RQG”
- [`../v0.3.6-beta/RELEASE_EVIDENCE_PACK.md`](../v0.3.6-beta/RELEASE_EVIDENCE_PACK.md) — same date pack
- [`../v0.3.6-beta/RUBRIC_GOVERNANCE.md`](../v0.3.6-beta/RUBRIC_GOVERNANCE.md) — H2c ops rubric delta
- [`../v0.3.6-beta/SECURITY_CI_HARDENING.md`](../v0.3.6-beta/SECURITY_CI_HARDENING.md) — pip-audit residual triage
- Root [`CHANGELOG.md`](../../../CHANGELOG.md) — Unreleased “H2c RQG + governance promote pack”

## Pass / fail summary

| Gate | Result |
|------|--------|
| Version consistency (4 surfaces) | **PASS** |
| `pip-audit` (CI ignore list) | **PASS** (13 ignored residuals) |
| Science + V&V release-blocking | **PASS** (53 + 3) |
| Full backend `pytest tests/ app/tests/` | **PASS** (1170 passed, 9 skipped) |
| Frontend high audit / lint / Jest / build | **PASS** |
| Export `lenr-run-export-v1` | **PASS** |
| Public Swarm cutover | **HOLD** (confirm unset; share 0.3.8-beta) |

See also Project-store summary `docs/rqg-039-prelaunch-evidence.md` (agent run).
