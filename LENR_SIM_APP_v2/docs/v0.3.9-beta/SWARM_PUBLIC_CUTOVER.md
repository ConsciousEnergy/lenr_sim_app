# v0.3.9-beta — public Swarm + Pages cutover gate

**Target:** Public community share path cuts over to multi-node Docker Swarm +
Traefik (+ Cloudflare Pages SPA host), replacing single-VPS Compose+Caddy as the
primary share URL.

**Hard gate:**

```bash
CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9 ./infrastructure/scripts/deploy.sh production
```

Do not weaken this string. Staging experiments continue to use
`CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8` only.

## Cutover sequence

1. Version bump to `0.3.9-beta` across version surfaces (release-quality-gate).
2. Maintenance window; lower DNS TTLs if needed.
3. Apply prod Terraform: Pages on `app.` (never `@`/`www`); `api.` A
   `proxied=false`; Hostinger **import/existing** only
   ([DNS_AND_HOSTINGER_DECISIONS.md](../v0.3.8-beta/DNS_AND_HOSTINGER_DECISIONS.md)).
4. Ansible Swarm multi-node + Traefik stack; GHCR auth; rolling update.
5. Flip public share hostname(s); watch `/api/health` + error rate.
6. Keep Compose artifacts + rollback tag for ≥ one release; document RTO.

## Status on this train

| Item | State |
|------|-------|
| Confirm gate in `deploy.sh` | Implemented |
| Operator production apply | **Blocked** until human sets `CONFIRM_SWARM_0_3_9` with live credentials |
| Compose retained for rollback | Required |

EQ-OPEN-* remain OPEN; fidelity work does not authorize theory endorsement.
