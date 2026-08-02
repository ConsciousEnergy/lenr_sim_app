# AI Tooling Attribution (v0.3.6-beta)

**Status:** Process metadata only. AI tooling is **not** scientific provenance and does not affect claim tiers, citations, or experiment-anchored gates.

This note records which Cursor Cloud / IDE agents and models assisted development and ship-readiness work for the `0.3.6-beta` line.

## Models used on this release line

| Model / agent family | Role | Notes |
|---|---|---|
| **Grok 4.5** (`cursor-grok-4.5-high` / high-fast variants) | Development assistance | Available Cursor model family used for application development sessions when selected by the operator; include in session notes when a Grok 4.5 agent contributed code or review. |
| **Composer / Cursor default** | Cloud agent implementation | Primary agent on ship-readiness + Karahadian/LaTeX branch (`originalModelName: default` on the active cloud run). |
| **GPT-5.6** (`gpt-5.6-sol-high`) | Automations / prior cloud agents | Observed on repo automations (security review, critical bug management, missing test coverage, engineering docs, AI tool feedback). |

## Relevant cloud agent runs

| Run | Branch / focus | URL |
|---|---|---|
| LaTeX writing + Karahadian integration + ship-readiness | `cursor/cloud-agent-1785376478229-gd20k` | https://cursor.com/agents/bc-18613f37-d558-4e39-a04a-6a187f473987 |
| Critical bug management | `cursor/critical-bug-management-832d` | https://cursor.com/agents/bc-446858cb-85ce-4370-8327-eb4698073ca4 |
| Missing test coverage | `cursor/missing-test-coverage-aab8` | https://cursor.com/agents/bc-35bcc38a-3246-47b5-81c9-818b1deeab59 |
| Application security review | `cursor/application-security-review-488c` | https://cursor.com/agents/bc-4e9acbde-7a5f-4ceb-a89a-e81ba3d5ecfa |

## Governance boundary

- Scientific claims still require citation keys + claim-tier chips per [PROVENANCE_GOVERNANCE.md](PROVENANCE_GOVERNANCE.md).
- AI-generated numeric physics values must be verified (Wolfram / experiment-anchored gates) before release.
- Do not cite AI models as experimental or theoretical sources in the theory paper bibliography.
