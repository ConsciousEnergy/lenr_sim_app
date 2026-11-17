# Researcher review pack (v0.3.9-beta)

Canonical production markdown is mirrored under
`LENR_SIM_APP_v2/backend/app/served_docs/RESEARCHER_REVIEW_PACK.md` so
`GET /api/docs/researcher-review-pack` works in Docker images that do not
include repository-root `docs/`. The API prefers that bundled copy for this slug.

Historical long-form path (pre-0.3.9 branding):
[`LENR_SIM_APP_v2/docs/v0.3.6-beta/RESEARCHER_REVIEW_PACK.md`](../LENR_SIM_APP_v2/docs/v0.3.6-beta/RESEARCHER_REVIEW_PACK.md)

## Honesty (read first)

- Extra simulations are **model outputs**. They do not prove LENR occurs.
- They do **not** close any `EQ-OPEN-*` obligation.
- `lenr_proved` remains false.

## Do not conflate surfaces

| Surface | Route / path |
|---------|--------------|
| Paper packets A–E | `/docs/reviewer-packets` |
| Campaign JSON packs | `LENR_SIM_APP_v2/datasets/reviewer_packs/` (+ `GET /api/docs/campaign-packs`) |
| Researcher review pack (this doc) | `/docs/researcher-review-pack` |

See the served `RESEARCHER_REVIEW_PACK.md` for hydrate/export commands on the
**0.3.9-beta** train.
