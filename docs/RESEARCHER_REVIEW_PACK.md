# Researcher review pack

Canonical long-form guide:
[`LENR_SIM_APP_v2/docs/v0.3.6-beta/RESEARCHER_REVIEW_PACK.md`](../LENR_SIM_APP_v2/docs/v0.3.6-beta/RESEARCHER_REVIEW_PACK.md)

A production mirror ships under
`LENR_SIM_APP_v2/backend/app/served_docs/RESEARCHER_REVIEW_PACK.md` so
`GET /api/docs/researcher-review-pack` works in Docker images that do not
include repository-root `docs/`.

## Honesty (read first)

- Extra simulations are **model outputs**. They do not prove LENR occurs.
- They do **not** close any `EQ-OPEN-*` obligation.
- `lenr_proved` remains false.
- Dashboard theory counts include null/control and phenomenological entries —
  they are not a count of validated mechanisms.
- Heat–helium correlation rows are empirical (EMP) associations, not nuclear
  confirmation.

## Quick hydrate (from `LENR_SIM_APP_v2/backend`)

```bash
python -m app.scripts.seed_database --force --hydrate-demo
# or:
python -m app.scripts.import_reviewer_pack --in ../datasets/reviewer_packs/q_campaign_demo
```

Committed demo pack: `LENR_SIM_APP_v2/datasets/reviewer_packs/q_campaign_demo/`.
Smoke fixture: `LENR_SIM_APP_v2/datasets/reviewer_packs/smoke/`.

See the canonical guide for campaign presets, export/import, and what Analytics
N does and does not mean.
