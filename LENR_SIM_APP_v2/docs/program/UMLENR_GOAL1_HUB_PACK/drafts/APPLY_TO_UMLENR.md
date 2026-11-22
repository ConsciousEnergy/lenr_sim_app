# Apply hub README to UMLENR

**Draft:** [`UMLENR_README.md`](UMLENR_README.md)  
**Framing (Diadon):** UMLENR is the **encompassing program hub**. The LENR Sim App is **one pillar**, not the whole story. Do **not** publish a sim-app README with the title swapped — use the program-pillars draft.  
**Confirmed sim markers:** `0.4.0-beta` (all four version markers on `lenr_sim_app`)  
**Sim visibility:** public — hub may link the sim repo as a child product after placeholder substitution  
**LENR_ARA / DAQ:** still not public — **Coming soon** (no private clone URL)  
**License:** GPL-3.0 · **ICCF pptx:** do not restore (PDF is enough)  
**PR policy:** do not open a new sim-app pack PR unless asked; keep this draft for the **public UMLENR** README when write access exists.

## Why this file exists

Cloud agents authenticated as `cursor[bot]` receive **403** on push/forge to the public UMLENR repo. A human (or token) with **write** access must open the docs PR. Drafts use placeholders so agent commits do not trip GHCR username secret scanners (brand / apex / owner login).

## Placeholders

| Token | Replace with |
|-------|----------------|
| `{{GITHUB_OWNER}}` | GitHub owner login for the program repos |
| `{{PROGRAM_BRAND}}` | Display brand (two words, as on the marketing site) |
| `{{PROGRAM_SITE}}` | `https://` + apex domain |

## Operator steps (write access required)

```bash
git clone https://github.com/<GITHUB_OWNER>/UMLENR.git
cd UMLENR
git checkout -b docs/goal1-hub-readme

# Soft-archive tip first (recommended once per freeze)
git tag -a archive/pre-hub-$(date +%Y%m%d) -m "Freeze before docs-first hub README"
git branch archive/legacy-main
git push origin archive/legacy-main
git push origin "archive/pre-hub-$(date +%Y%m%d)"

SRC=/path/to/lenr_sim_app/LENR_SIM_APP_v2/docs/program/UMLENR_GOAL1_HUB_PACK/drafts/UMLENR_README.md
# Set OWNER, BRAND, SITE then:
sed -e "s/{{GITHUB_OWNER}}/${OWNER}/g" \
    -e "s/{{PROGRAM_BRAND}}/${BRAND}/g" \
    -e "s|{{PROGRAM_SITE}}|${SITE}|g" \
    "$SRC" > README.md

git add README.md
git commit -m "docs(readme): stage In Development program hub (sim v0.4.0-beta)"
git push -u origin docs/goal1-hub-readme
# Open PR against main
```

Also copy the rest of the Goal 1 pack into `docs/program/` per
[`../HUB_STAGING_RUNBOOK.md`](../HUB_STAGING_RUNBOOK.md).

Do **not** merge private `LENR_ARA` / DAQ application trees into UMLENR in this PR.
Do **not** paste a full sim-app product README as the hub root README.
