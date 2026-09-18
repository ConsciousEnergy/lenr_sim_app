# Operator: Hostinger login + Cloudflare/DNS walkthrough (v0.3.8)

**Audience:** human operator on a normal laptop/phone browser.  
**Related:** [COMPOSE_SHIP_HANDOFF.md](./COMPOSE_SHIP_HANDOFF.md), [DNS_AND_HOSTINGER_DECISIONS.md](./DNS_AND_HOSTINGER_DECISIONS.md).

---

## Two different “Cloudflare” things (do not mix them)

| What | Who owns it | Purpose |
|------|-------------|---------|
| `*.trycloudflare.com` unlock portal | Agent (temporary quick tunnel) | Run `unlock.sh` from Hostinger VNC **now** |
| Cloudflare DNS / CNAME for `conscious.energy` | Operator | Public hostname → VPS (production DNS) |

The unlock portal is **not** production DNS. You do **not** need a Cloudflare CNAME before unlocking the VPS.

Current unlock URL (may rotate): read
`/opt/cursor/artifacts/v038_unlock_tunnel_url.txt` or run
`bash LENR_SIM_APP_v2/infrastructure/vps/scripts/print-vps-unlock-hint.sh`.

---

## Part A — Fix Hostinger login first (blocking)

Live share already answers on `https://lenr-sim-beta.conscious.energy`, but the
agent cannot SSH in. PasswordAuthentication is **off**. You need hPanel →
Browser VNC (or an API token / authorized SSH key).

### A1. Open the right login

1. Use Chrome/Firefox on your own machine (**not** an automated/agent session).
2. Go to: https://hpanel.hostinger.com/
3. Prefer **email + Hostinger password** if available. (Agent probe 2026-09-18T20:33Z:
   email/password fields are present on `auth.hostinger.com/login` — use these
   instead of Google SSO when you can.)
4. If the account is **Google-only SSO**:
   - Use the Google button while signed into the correct Google account.
   - Hostinger + Google often block automation / unusual clients.
5. If login fails:
   - Hostinger “Forgot password” for the VPS billing email (fastest if password unset).
   - Check Hostinger mail for suspicious-login / 2FA prompts.
   - Try Incognito, or turn VPN off.
   - If Google SSO loops: approve Hostinger in Google Account security, **or**
     set a Hostinger password so you are not Google-only.
6. Optional agent unblock: after you set a Hostinger password, drop Cursor env
   secrets `HOSTINGER_HPANEL_EMAIL` + `HOSTINGER_HPANEL_PASSWORD` and restart the
   agent — or paste the pubkey / run unlock yourself in Browser VNC.

### A2. Once inside hPanel

1. **VPS** → `srv1280333.hstgr.cloud` (IP `185.211.4.66`).
2. Open **Browser VNC** / **Console** (root shell).
3. Pick **one**:

**A — Full unlock + ship (preferred)**

```bash
# Replace TUNNEL with current URL from v038_unlock_tunnel_url.txt
curl -fsSL https://TUNNEL.trycloudflare.com/unlock.sh | bash
```

If the VPS cannot reach trycloudflare: open `/unlock.sh` in a local browser,
paste into VNC as `/tmp/unlock.sh`, then `bash /tmp/unlock.sh`.

**B — Pubkey only** (agent poller ships within ~15s)

```bash
mkdir -p /root/.ssh && chmod 700 /root/.ssh
echo 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIPBJI+cf2cRAQHU8K7NSk63gc1oOkRFqQDJzD/ees/K5 cursor-agent-compose-ship-v038' >> /root/.ssh/authorized_keys
chmod 600 /root/.ssh/authorized_keys
```

Fingerprint: `SHA256:HaidEon7f5LFkr7+R2aaURHrOa84/dVhljOy0DKK+10`

**C — No VNC, but hPanel works**

- hPanel → **API** → create token → Cursor secret `HOSTINGER_API_TOKEN` (restart agent), or
- Drop a private key **already** in `authorized_keys` as Cursor secret `VPS_SSH_KEY` (restart agent).

### A3. Confirm

- Unlock portal `/live-status.json` → `has_auto: true` within ~30–60s after ship, or
- `https://lenr-sim-beta.conscious.energy/api/physics/bubble-fusion/defaults`
  → `options.dynamics_modes` includes `"auto"`.

---

## Part B — Cloudflare / DNS (what you actually need)

### Locked topology

- **Nameservers for `conscious.energy` / `www` stay on WordPress.com.** Do **not**
  move NS to Cloudflare in this beta window.
- App hosts are **A records to the VPS**, never CNAME-to-apex.
- Do **not** put a Cloudflare Pages CNAME on `@` or `www`.

Authoritative panel today is **WordPress.com DNS** (NS = `ns1/ns2/ns3.wordpress.com`).
Probed live: `lenr-sim-beta` already has `A → 185.211.4.66`.

```
A     lenr-sim-beta    185.211.4.66
A     lenr-simp-app    185.211.4.66
```

Optional equivalent if your panel prefers Hostinger’s hostname:

```
CNAME lenr-sim-beta    srv1280333.hstgr.cloud
```

### If you are setting up a Cloudflare zone later

1. Do **not** change WordPress.com nameservers for apex/`www` yet.
2. Records only resolve where NS point — Cloudflare-only records are inert while
   NS stay on WordPress.com.
3. If Cloudflare becomes authoritative for app hosts: grey-cloud **A** to
   `185.211.4.66` for `lenr-sim-beta` / `lenr-simp-app`.
4. Do **not** create `api.` or Pages `app.` until the v0.3.9 cutover gate.

### Verify

```bash
dig +short lenr-sim-beta.conscious.energy A   # expect 185.211.4.66
curl -fsS https://lenr-sim-beta.conscious.energy/api/health
```

---

## Part C — Recommended order today

1. Recover Hostinger hPanel login.
2. Browser VNC → unlock **or** pubkey drop.
3. Confirm live defaults include `auto`.
4. Touch DNS **only** if `dig` no longer shows `185.211.4.66`.
5. Optional: restore GitHub org Actions spending limit (CI currently dies at 0 steps).

## Do **not** do right now

- Migrate `conscious.energy` NS to Cloudflare
- CNAME apex / `www`
- Swarm / Pages / `api.` DNS
- Edit WordPress marketing `@` / `www`
