# UMLENR hub staging runbook

Human operator steps to soft-archive legacy UMLENR and stage a docs-first program hub.
Cloud agents with read-only forge access prepare this pack only — they must not claim the UMLENR PR is open without a forge PR URL.

## Phase 0 — Freeze legacy

On `UMLENR` with write access, from a clean `main`:

```bash
git checkout main
git pull
# Tip was db40e5d as of the staging audit; re-check before tagging
git tag -a archive/pre-hub-$(date +%Y%m%d) -m "Freeze before docs-first hub README"
git branch archive/legacy-main
git push origin archive/legacy-main
git push origin "archive/pre-hub-$(date +%Y%m%d)"
```

Do **not** GitHub-Archive the whole repository (that locks collaboration).

### Archive honesty

- Prefer **PDF** for conference talks (e.g. unified theory PDF already in-tree). Do **not** restore the 46-byte `5.8.4_Acs_Diadon.pptx` stub when a PDF is present.
- Note missing root `requirements.txt` on the archive branch if documenting legacy Math_Sim install.
- Scrub any **MIT** claims in legacy Math_Sim README text (program is GPL-3.0).

## Phase 1 — Stage hub PR branch

```bash
git checkout -b docs/goal1-program-hub

mkdir -p docs/program
# Copy from lenr_sim_app Goal 1 pack (after placeholder substitution — see drafts/APPLY_TO_UMLENR.md)
cp -R /path/to/lenr_sim_app/LENR_SIM_APP_v2/docs/program/UMLENR_GOAL1_HUB_PACK/* docs/program/

# Root README = program hub draft (not a renamed sim README)
# Use drafts/UMLENR_README.md after substituting {{GITHUB_OWNER}}, {{PROGRAM_BRAND}}, {{PROGRAM_SITE}}
# Or use the operator-ready artifact if provided out-of-band

git add docs/program README.md
git commit -m "docs(program): Goal 1 docs-first program hub baseline"
git push -u origin docs/goal1-program-hub
# Open PR → main; track on Project 6
```

Leave large legacy trees on `archive/legacy-main`. Prefer a follow-up PR that removes legacy paths from `main` **after** archive permalinks exist.

## Phase 2 — Project 6

Seed issues from [`PROJECT_6_SEED.md`](PROJECT_6_SEED.md). Columns: Backlog → Ready → In progress → Blocked → Done.

## Non-goals

- Merging private Sim/ARA application trees into UMLENR
- Implementing Purple / Research Mode / DAQ ingest in this PR
- Swarm cutover confirms from the hub repo
