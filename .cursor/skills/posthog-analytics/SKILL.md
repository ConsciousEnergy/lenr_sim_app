---
name: posthog-analytics
description: >-
  Integrate and use PostHog product analytics in the LENR_SIM_APP React frontend
  - env-gated provider, a stable event taxonomy, feature flags, and session
  replay - without leaking data in dev/test or overstating science. Use when
  adding product-analytics event tracking, feature flags, or session replay, or
  when the user mentions PostHog.
---

# PostHog Analytics

## Overview

The app has no product analytics today (the existing `analyticsApi.js` /
AnalyticsPage is *scientific* analysis of simulation results - do not conflate).
This skill adds PostHog for product usage: an env-gated provider, a small stable
event taxonomy, feature flags, and opt-in session replay - privacy-respecting and
consistent with the app's analytics-transparency governance.

## Setup status (one-time, needs confirmation to install)

PostHog is not yet a dependency. First-time setup (confirm before running):

```bash
cd LENR_SIM_APP_v2/frontend
npm install posthog-js
```

Then add the provider + config from [reference.md](reference.md). Key/host come
from env (`VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`); no key -> analytics is a no-op.

## When to Use

- Adding product-usage event tracking to a user flow.
- Adding a feature flag / experiment gate.
- Enabling session replay for a surface.

## Process

```
- [ ] 1. Confirm the event/flag belongs to the taxonomy (extend it deliberately)
- [ ] 2. Fire the event via the typed helper (not raw posthog.capture scattered)
- [ ] 3. Gate any flag read through the provider hook with a safe default
- [ ] 4. Verify no PII / raw physics payloads are sent
- [ ] 5. Confirm it is a no-op in dev/test (no key) and respects Do-Not-Track
```

## Environment discipline (critical)

- Initialize PostHog ONLY when a key is present AND `ENVIRONMENT === production` (or an explicit opt-in). Never capture in `development`/`test`.
- Respect `navigator.doNotTrack`; expose an opt-out.
- Keys via env only - never hardcode; never commit a key. Read env through the existing `config/api.js` pattern alongside `version.js`.

## Event taxonomy (stable names; snake_case; extend, don't fork)

| Event | When | Key properties |
|-------|------|----------------|
| `simulation_started` | user starts a run | `sim_type`, `host_material`, `reactant`, `rate_mode` |
| `simulation_completed` | run finishes | `sim_type`, `duration_ms`, `success` |
| `theory_toggled` | theory enabled/disabled | `theory_id`, `enabled` |
| `export_downloaded` | export envelope downloaded | `schema_version`, `claim_tiers_present` |
| `visualization_viewed` | a viz surface opens | `viz_type` |
| `docs_viewed` | a docs/theory page opens | `slug` |

```js
// ✅ DO: one typed helper module, called from flows
import { track } from '@/analytics/events';
track.simulationStarted({ sim_type, host_material, reactant, rate_mode });

// ❌ DON'T: scatter raw string events, or send full physics payloads
posthog.capture('sim', { entireRequestBody });   // no
```

## Do not send

- No PII, no raw simulation request/response bodies, no citation text - send small categorical/dimensional properties only.
- No scientific claim is "validated" because it is popular; analytics never feeds claim tiers or scoring.

## Feature flags

```js
import { useFeatureFlagEnabled } from 'posthog-js/react';
const showBeta = useFeatureFlagEnabled('rate-engine-uq-panel') ?? false; // safe default
```

## Rationalizations (excuses -> rebuttal)

- "I'll just call posthog.capture inline." -> Scattered string events rot; route through the taxonomy helper so names stay stable.
- "Track in dev to test it." -> Dev/test must be no-ops; verify with the PostHog debugger against a throwaway key instead.
- "Send the whole payload, more data is better." -> That leaks data and inflates cost; send only dimensional properties.

## Red Flags

- PostHog initialized without an env guard, or with a hardcoded key.
- Events fired in dev/test, or Do-Not-Track ignored.
- Raw request/response bodies or PII in event properties.
- New ad-hoc event names outside the taxonomy table.

## Verification

- Analytics is a no-op with no key and in dev/test (confirm no network calls).
- Events use taxonomy names with dimensional-only properties.
- Flags read through the hook with safe defaults.
- `docs/v0.3.6-beta/ANALYTICS_TRANSPARENCY.md` updated if the taxonomy changes.

See [reference.md](reference.md) for the provider, config, and events-helper templates.
