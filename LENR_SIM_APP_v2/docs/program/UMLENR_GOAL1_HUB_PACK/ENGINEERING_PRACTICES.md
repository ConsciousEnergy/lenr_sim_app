# Engineering practices (program-wide)

Encode these before promoting child products or rewriting public UMLENR `main`.

1. **Private by default** — Coming soon on the hub until a written public-disclosure gate passes (secrets scan, claim-tier review, LICENSE, SECURITY.md, export contract tests).
2. **Soft archive before rewrite** — annotated tag + `archive/legacy-main`; no force-orphan until permalinks are stable.
3. **Single roadmap SOT** — GitHub Project 6; pack points at it; do not treat root `DEV_PLAN.md` myths as program SOT.
4. **Contract-first** — register schema ids on the hub; implementations stay in children.
5. **Trust planes** — CI ≠ deploy ≠ runtime ≠ DAQ ([`TRUST_PLANES.md`](TRUST_PLANES.md)).
6. **ADRs** — short decisions for public-open and Purple adoption (license is decided: **GPL-3.0 only**).
7. **GPL-3.0 program-wide** — hub + Sim + future public ARA/DAQ; scrub conflicting MIT language; keep dependency NOTICE/SBOM honest.
8. **Branch protection** on UMLENR `main` (reviews, no force-push).
9. **Academic honesty** — research-preview language; never close `EQ-OPEN-*` via hub docs.
10. **Secret hygiene** — no live secrets on the public hub; strip committed `.env` from new `main`.
11. **Agentic governance** — name allowed frameworks/MCP; read-only defaults; no DAQ/deploy tokens for agents.
12. **Version honesty** — hub states sim live share vs git tip carefully (markers currently **0.4.0-beta** on sim trains).
13. **Changelog / release evidence** when any child flips public or major hub baseline lands.
14. **CODEOWNERS** separating science claim paths vs ops docs when paths are public.
15. **Dependabot / SBOM** on public product repos.
16. **Coming-soon copy standard** — one paragraph capability + status chip; zero private clone URLs on the public hub README.
17. **Preserve conference artifacts as PDF** — prefer PDF over editable `.pptx`; delete placeholder stubs rather than restoring PowerPoint when a PDF exists (ICCF25 policy).

## Program framing

UMLENR is **encompassing**. Product READMEs (especially the sim app) stay in child repos. The hub README is a **program map**, not a renamed product README.
