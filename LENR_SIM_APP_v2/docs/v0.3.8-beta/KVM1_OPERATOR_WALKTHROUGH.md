# KVM1 operator walkthrough (manual Hostinger + Swarm join)

**Audience:** human operator. Agents do **not** purchase VMs or Swarm-init the
live share without explicit confirm strings.

Topology contract + architecture diagrams (SOT):
[`THREE_NODE_SWARM_TOPOLOGY.md`](THREE_NODE_SWARM_TOPOLOGY.md)
(environments-on-hardware + persistent storage).  
Unlock checklist: [`FULL_STACK_BUILD_UNLOCK.md`](FULL_STACK_BUILD_UNLOCK.md).

## Phase 0 — Order and harden KVM1

1. Hostinger → VPS → order **KVM 1**, Ubuntu **24.04 LTS**, same region as share
   (`1280333`) if possible.
2. Record in your private ops notes (panel password stays private — never commit):
   - VPS id: `2071323`
   - Public IPv4: `31.220.55.113`
   - Hostname: `srv2071323`
3. **First login security (do this before anything else):**
   - Rotate the panel/root password immediately (do not paste passwords into chat,
     git, Slack, or inventory files). **Still required** if the panel password
     was ever shared in chat.
   - From your laptop: `ssh-copy-id -i ~/.ssh/lenr-sim-staging.pub root@31.220.55.113`
     (cloud-agent key is already on the host; add your laptop key before
     relying on this machine alone).
   - Then disable password auth (`PasswordAuthentication no` in
     `/etc/ssh/sshd_config`) and `systemctl reload ssh`. Root is already
     `PermitRootLogin prohibit-password`.
4. Firewall (Hostinger firewall or `ufw`):
   - **22/tcp** — prefer your admin IP only (currently open Anywhere; tighten)
   - **2377/tcp**, **7946/tcp+udp**, **4789/udp** — Swarm (manager↔worker) — **open**
   - **80/443** — only if this node is temporarily the staging Traefik edge — **open**
   - Do **not** publish Grafana (3000) or Prometheus (9090) to the public internet
5. Confirm from laptop: `ssh -i ~/.ssh/lenr-sim-staging root@31.220.55.113` (key only).

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
docker node update --label-add app=true --label-add observability=true <node_id>
```

Or set `swarm_node_labels` in `inventory.staging.yml` and run
`playbooks/join-workers.yml` (preferred).

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
docker node update --label-add app=true <share_node>
docker node update --label-add app=true --label-add observability=true <kvm1_node>
```

4. Deploy stack (Traefik+Postgres on manager; API on `app=true`;
   Prometheus+Grafana on `observability=true`).
5. Point `api.` at share Traefik; Pages on `app.`; keep Compose rollback tag
   ≥ one release.
6. Smoke health + intentional bad image → auto rollback.

## After cutover — demote staging identity of KVM1

KVM1 stops being “staging manager” and remains a **worker**. If you need a
separate staging cluster later, order another small VPS — do not reuse CI.

**Live (post-0.3.9, probed 2026-11-02):** KVM1 is Swarm **worker**
(`ControlAvailable=false`), labels `app=true` + `observability=true`, hostname
`kvm1`. Staging Swarm left; `api-staging` TLS correctly fails. Stale
staging-era Postgres backup cron on the worker should be absent (manager-only
`backup.sh` after cutover).

## Checklist (operator)

- [x] KVM1 ordered; id/IP recorded (`2071323` / `31.220.55.113` / `srv2071323`)
- [x] Docker installed; UFW Swarm + HTTP ports; root SSH key-only (`prohibit-password`)
- [ ] Laptop SSH key installed + panel password rotated + `PasswordAuthentication no`
- [x] Untracked `inventory.staging.yml` points at KVM1 only (gitignored)
- [x] `staging-swarm-dry-run.sh local` exit 0 / expected confirm exits
- [x] Staging Swarm applied then **left**; KVM1 joined prod as **worker** + obs
- [x] Public cutover completed under `CONFIRM_SWARM_0_3_9` (window 2026-10-31); confirm unset after
- [ ] Optional: rotate leftover agent SSH pubkeys on share/KVM1 authorized_keys
