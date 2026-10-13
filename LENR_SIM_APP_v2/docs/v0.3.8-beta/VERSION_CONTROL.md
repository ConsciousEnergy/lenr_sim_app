# Version control for v0.3.8-beta (Swarm migration prep)

This document is the **implementation map** for the `dev` integration train.
It does **not** authorize public Swarm cutover. Cutover remains gated by
`CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9` in
[`../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`](../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md).

## Branch and version model

| Ref | Markers | Deploy | Purpose |
|-----|---------|--------|---------|
| `main` + tag `v0.3.7-beta` | `0.3.7-beta` | Compose share ship only (`deploy.yml` on `main` + `v*` tags) | Live public beta |
| `dev` | `0.3.8-beta` | **No** auto VPS ship | Integration for Swarm prep, science, deps |
| Short-lived `consciousenergy/*` / `feat/*` | inherit base | PR → **`dev`** (default) or `main` (0.3.7 hotfix only) | Topic changes |

Policy source of truth: [`.github/BRANCHING.md`](../../../.github/BRANCHING.md).  
Agent map: [`AGENTS.md`](../../../AGENTS.md).  
Dependabot: `target-branch: dev` in [`.github/dependabot.yml`](../../../.github/dependabot.yml)
(read from default branch `main` after that config is on tip).

```mermaid
flowchart LR
  mainLine[main_0_3_7_beta]
  tag037[tag_v0_3_7_beta]
  devLine[dev_0_3_8_beta]
  feat[short_lived_PRs]
  staging[staging_Swarm_dry_run]
  public[public_Swarm_0_3_9]
  mainLine --> tag037
  mainLine --> devLine
  feat --> devLine
  feat -.->|hotfix_only| mainLine
  devLine --> staging
  staging -.->|CONFIRM_SWARM_0_3_9| public
```

## Four version markers (must match within a branch)

- `LENR_SIM_APP_v2/backend/app/core/config.py` → `APP_VERSION`
- `LENR_SIM_APP_v2/frontend/package.json` → `"version"`
- `LENR_SIM_APP_v2/frontend/src/config/version.js` → `APP_VERSION`
- `LENR_SIM_APP_v2/infrastructure/docker/Dockerfile.backend` → `BUILD_VERSION`

On `dev`, all four are `0.3.8-beta`. Do not bump `main` until a promote PR.

## Implementation phases (0.3.8 train)

Ordered for progressive delivery. Each phase is a PR (or short PR ladder) into **`dev`**.

### Phase A — Version control + hygiene (docs/policy)

- [x] Long-lived `dev` at `0.3.8-beta` (consolidation)
- [x] Promote BRANCHING / Dependabot / CI `dev` filters onto default-branch `main` tip (#240)
- [ ] Keep `PR_AND_BRANCH_HYGIENE.md` current after each ladder

### Phase B — Staging Swarm dry-run (no public traffic)

Owner docs: [`STAGING_SWARM_DRY_RUN.md`](STAGING_SWARM_DRY_RUN.md),
[`FULL_STACK_BUILD_UNLOCK.md`](FULL_STACK_BUILD_UNLOCK.md).

1. Operator copies untracked Terraform/Ansible examples → real credentials
2. Local: `./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh local`
3. Remote dry-run only with `CONFIRM=I_STAGING_0_3_8 EXECUTE=1 … remote`
4. Staging apply under `CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8`
5. Validate Traefik → API, Pages CORS/WS on **staging** host ≠ CI box `2012566`

**Components in scope for staging:** Docker Swarm, Ansible playbooks, Traefik
ingress, Cloudflare DNS/Pages wiring (staging), Terraform remote state.

**Forbidden without explicit ask:** Swarm init on live share `185.211.4.66`,
third-VPS purchase, `CONFIRM_SWARM_0_3_9`, putting `VPS_*` on `lenr-ci`.

### Phase C — Learning / operator readiness

1. [`TWO_KVM2_SWARM_TOPOLOGY.md`](TWO_KVM2_SWARM_TOPOLOGY.md)
2. [`SWARM_OPERATOR_LAB.md`](SWARM_OPERATOR_LAB.md)
3. UMLENR Goal 1 pack → separate hub repo PR
   ([`../program/UMLENR_GOAL1_HUB_PACK/`](../program/UMLENR_GOAL1_HUB_PACK/README.md))

### Phase D — Public cutover (v0.3.9 — not 0.3.8)

Only under `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9` with an announced window:
[`../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`](../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md).

Promote path: squash `dev` → `main` with marker bump to the cutover train,
retag, ship. Compose share stays until that confirm.

## Science / security invariants (carry forward)

- `EQ-OPEN-*` stay **OPEN**; Lean ≠ nature proof; `lenr_proved: false`
- Academic claim PRs stay off the CI/ops train
- Additive API contracts; no silent `contract_version` breaks
- Scheduled + PR audit gates aligned (`source-map-js`, documented jose ignore, etc.)

## Related product future work (not Swarm-blocking)

- Internationalization roadmap: [`I18N_FUTURE.md`](I18N_FUTURE.md)
  (French, Spanish, Italian, Japanese, Chinese, Russian)
