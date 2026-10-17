# KVM1 operator walkthrough (manual Hostinger + Swarm join)

**Audience:** human operator. Agents do **not** purchase VMs or Swarm-init the
live share without explicit confirm strings.

Topology contract: [`THREE_NODE_SWARM_TOPOLOGY.md`](THREE_NODE_SWARM_TOPOLOGY.md).  
Unlock checklist: [`FULL_STACK_BUILD_UNLOCK.md`](FULL_STACK_BUILD_UNLOCK.md).

## Phase 0 — Order and harden KVM1

1. Hostinger → VPS → order **KVM 1**, Ubuntu **24.04 LTS**, same region as share
   (`1280333`) if possible.
2. Record in your private ops notes (do **not** commit):
   - VPS id
   - Public IPv4
   - Hostname (`srv….hstgr.cloud`)
3. Firewall (Hostinger firewall or `ufw`):
   - **22/tcp** — your admin IP only
   - **2377/tcp**, **7946/tcp+udp**, **4789/udp** — Swarm (manager↔worker)
   - **80/443** — only if this node is temporarily the staging Traefik edge
   - Do **not** publish Grafana (3000) or Prometheus (9090) to the public internet
4. Create a deploy user (or use root only for bootstrap), install your SSH key,
   disable password authentication.
5. Confirm from laptop: `ssh -i ~/.ssh/lenr-sim-staging <user>@<KVM1_IP>`.

## Phase 1 — Staging Swarm on KVM1 (v0.3.8)

Share `185.211.4.66` stays Compose. CI `45.93.100.251` stays isolated.

### 1.1 Untracked files on your laptop

```bash
cp LENR_SIM_APP_v2/infrastructure/ansible/inventory.staging.yml.example \
   LENR_SIM_APP_v2/infrastructure/ansible/inventory.staging.yml
# Edit: staging-manager-1 ansible_host = KVM1 IP
# Never 185.211.4.66 / 45.93.100.251
# For single-node staging, leave swarm_workers empty / commented

cp LENR_SIM_APP_v2/infrastructure/terraform/backend.hcl.example \
   LENR_SIM_APP_v2/infrastructure/terraform/backend.hcl
cp LENR_SIM_APP_v2/infrastructure/terraform/staging.tfvars.example \
   LENR_SIM_APP_v2/infrastructure/terraform/staging.tfvars
# hostinger_vps_mode = "disabled" if the VM already exists in the panel
```

Never commit filled inventory / tfvars / secrets.

### 1.2 Local + remote dry-run

```bash
./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh local

CONFIRM=I_STAGING_0_3_8 EXECUTE=1 \
  ./LENR_SIM_APP_v2/infrastructure/scripts/staging-swarm-dry-run.sh remote
```

### 1.3 Staging apply

```bash
CONFIRM_SWARM_0_3_8=I_STAGING_0_3_8 \
  ./LENR_SIM_APP_v2/infrastructure/scripts/deploy.sh staging
# Exact entrypoint may match your ops wrapper; confirm string is mandatory.
```

### 1.4 Validate

```bash
ssh … 'docker node ls && docker stack ls && docker service ls'
dig +short api-staging.conscious.energy
curl -sS https://api-staging.conscious.energy/api/health
```

Label the staging manager for observability when you enable the stack extras:

```bash
docker node update --label-add role=app --label-add role=observability <node_id>
```

## Phase 2 — Cutover rehearsal (still no public Swarm)

1. Rehearse Compose rollback on share notes:
   [`ROLLBACK_AND_STAGING_CHECKLIST.md`](ROLLBACK_AND_STAGING_CHECKLIST.md)
2. On staging, prove rolling update + rollback:

```bash
docker service update --image <known_good> <stack>_backend
docker service rollback <stack>_backend
```

3. Do **not** set `CONFIRM_SWARM_0_3_9` here.

## Phase 3 — Public cutover (v0.3.9, announced window)

Only under `CONFIRM_SWARM_0_3_9=I_CUTOVER_0_3_9` —
[`../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md`](../v0.3.9-beta/SWARM_PUBLIC_CUTOVER.md).

1. Init/promote **share KVM2** as Swarm manager.
2. On KVM1: `docker swarm join --token … <share_manager_ip>:2377`
3. Labels:

```bash
docker node update --label-add role=app <share_node>
docker node update --label-add role=app --label-add role=observability <kvm1_node>
```

4. Deploy stack (Traefik+Postgres on manager; API on `role=app`;
   Prometheus+Grafana on `role=observability`).
5. Point `api.` at share Traefik; Pages on `app.`; keep Compose rollback tag
   ≥ one release.
6. Smoke health + intentional bad image → auto rollback.

## After cutover — demote staging identity of KVM1

KVM1 stops being “staging manager” and remains a **worker**. If you need a
separate staging cluster later, order another small VPS — do not reuse CI.

## Checklist (operator)

- [ ] KVM1 ordered; id/IP recorded privately
- [ ] Firewall + SSH hardened
- [ ] Untracked `inventory.staging.yml` points at KVM1 only
- [ ] `staging-swarm-dry-run.sh local` exit 0 / expected confirm exits
- [ ] Staging apply under `CONFIRM_SWARM_0_3_8` only
- [ ] Rollback drill documented with timestamps
- [ ] Public cutover deferred until `CONFIRM_SWARM_0_3_9` + announced window
