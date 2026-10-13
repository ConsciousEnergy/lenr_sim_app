# Future internationalization (i18n) plan

**Status:** Planned — **not** implemented in v0.3.7-beta or the first 0.3.8
Swarm-prep slices. Tracked here so version control and product planning stay
aligned without blocking Compose → Swarm migration.

## Target languages (initial set)

| Language | BCP-47 | Priority band |
|----------|--------|---------------|
| French | `fr` | P1 |
| Spanish | `es` | P1 |
| Italian | `it` | P1 |
| Japanese | `ja` | P2 |
| Chinese (Simplified) | `zh-Hans` | P2 |
| Russian | `ru` | P2 |

English (`en`) remains the source locale and the default for science/governance
docs until translations are reviewed.

## Scope when we implement

**In scope (product UI):**

- React SPA strings (nav, forms, empty states, honesty banners, claim-tier labels)
- Locale negotiation (`Accept-Language` + user preference persisted locally)
- Date/number formatting via `Intl.*`
- Documented glossary for LENR / claim-tier terms (do not “soft-translate” away honesty)

**Out of scope for first i18n ship (unless explicitly expanded):**

- Translating the Unified Theory Paper, proof matrix, Lean, or LaTeX packs
- Translating academic claim language in a way that strengthens endorsement
- Server-side localized error legal text beyond a short shared banner

## Recommended technical approach (when scheduled)

1. Extract UI copy behind a message catalog (e.g. ICU MessageFormat / JSON per locale).
2. Keep **science honesty chips** keyed (not free-prose) so claim tiers stay consistent across locales.
3. CI gate: every locale file has the same message keys as `en` (no missing keys).
4. Reviewer checklist: native speaker or qualified reviewer for FR/ES/IT first; JA/ZH/RU second.
5. Ship behind a feature flag; default locale remains `en` until coverage ≥ P1 set.

## Scheduling relative to Swarm

| Train | i18n work |
|-------|-----------|
| v0.3.7-beta (`main`) | None — English-only Compose beta |
| v0.3.8-beta (`dev`) | Docs + scaffolding PRs OK after staging dry-run path is green; not a cutover blocker |
| Post public Swarm (0.3.9+) | Prefer full P1 locale ship after stack cutover is stable |

## Non-goals

- Machine-only translation of governance or Theory Paper without human review
- Locale-specific numeric bands or claim tiers
- Closing any `EQ-OPEN-*` via translated wording
