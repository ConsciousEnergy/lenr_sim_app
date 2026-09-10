# Security residuals — v0.3.7-beta

Refresh of posture for the governance train. Canonical policy: root
[`SECURITY.md`](../../../SECURITY.md).

## By design (document, do not “fix” away)

| Item | Posture |
|------|---------|
| Public unauthenticated compute POSTs | Research beta; rate-limited; no SPA write token |
| Analytics GET/stats public | Read-only hydrate visibility |
| Analytics mutations | Require `X-LENR-Write-Token` / production guard |

## Residuals to track

| id | residual | risk | action this train |
|----|----------|------|-------------------|
| SEC-TOKEN-ALIAS | Write token often equals `SECRET_KEY` if dedicated env unset | medium | Document; prefer `LENR_ANALYTICS_WRITE_TOKEN` on VPS |
| SEC-PIP-IGNORES | Documented `pip-audit` ignores (starlette/vtk/ecdsa family) | low–med | Revisit on dependency bumps; no drive-by majors here |
| SEC-NPM-RR | `react-router` 6.x moderate advisories (fix may need v7+) | medium | Track; major bump out of scope unless CI high+ fails |
| SEC-CODEQL-GHAS | CodeQL active when repo public / GHAS enabled | ops | Confirm on org settings |
| SEC-AUTO-PERSIST | Public stack must keep `LENR_AUTO_PERSIST=0` | high if flipped | Called out in GOALS / BUG_TRIAGE |

## Explicit non-goals this train

- Enabling public analytics auto-persist
- Embedding write tokens in the SPA
- Shipping a full auth/RBAC product (see SECURITY roadmap)

## Threat-model one-liner

Beta exposes physics compute for education/research preview; shared SQL mutation
stays operator-gated; model outputs are not laboratory claims.
