# PostHog Analytics - Reference

Drop-in templates. Workflow is in [SKILL.md](SKILL.md). Installing `posthog-js`
needs confirmation first.

## Files to add

```
LENR_SIM_APP_v2/frontend/src/
  analytics/
    posthog.js        # init + provider
    events.js         # typed taxonomy helper
```

## Config (extend src/config/api.js pattern; env-driven)

```js
// src/analytics/posthog.js
import posthog from 'posthog-js';
import { APP_VERSION } from '../config/version';

const KEY = import.meta.env.VITE_POSTHOG_KEY || process.env.REACT_APP_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
const ENV = import.meta.env.MODE; // 'development' | 'test' | 'production'

let enabled = false;

export function initAnalytics() {
  const dnt = typeof navigator !== 'undefined' && navigator.doNotTrack === '1';
  if (!KEY || ENV !== 'production' || dnt) return; // no-op in dev/test/no-key/DNT
  posthog.init(KEY, {
    api_host: HOST,
    autocapture: false,               // explicit events only
    capture_pageview: true,
    disable_session_recording: true,  // opt-in per surface
    persistence: 'localStorage+cookie',
    loaded: (ph) => ph.register({ app_version: APP_VERSION }),
  });
  enabled = true;
}

export const analyticsEnabled = () => enabled;
export { posthog };
```

## Provider wiring (`src/index.jsx` — wrap the existing tree)

Mount `PostHogProvider` only when analytics actually initialized. Passing
`client={undefined}` triggers PostHog's "No apiKey or client" console warning.

```jsx
import { WrapWithPostHog } from './analytics/WrapWithPostHog';
import { initAnalytics } from './analytics/posthog';

initAnalytics();

root.render(
  <WrapWithPostHog>
    <OfflineProvider>
      <ThrottleProvider>
        <SnackbarProvider>
          <App />
        </SnackbarProvider>
      </ThrottleProvider>
    </OfflineProvider>
  </WrapWithPostHog>
);
```

`WrapWithPostHog` returns `children` when `!analyticsEnabled()`, otherwise
`<PostHogProvider client={posthog}>…</PostHogProvider>`.

## Typed taxonomy helper (single source of event names)

```js
// src/analytics/events.js
import { posthog } from './posthog';

const capture = (name, props = {}) => {
  try { posthog?.capture?.(name, props); } catch { /* analytics must never break UX */ }
};

export const track = {
  appLoaded: (p) => capture('app_loaded', p),
  simulationStarted: (p) => capture('simulation_started', p),
  simulationCompleted: (p) => capture('simulation_completed', p),
  theoryToggled: (p) => capture('theory_toggled', p),
  exportDownloaded: (p) => capture('export_downloaded', p),
  visualizationViewed: (p) => capture('visualization_viewed', p),
  docsViewed: (p) => capture('docs_viewed', p),
  clientError: (p) => capture('client_error', p),
};
```

## Session replay (opt-in per surface)

```js
import { posthog } from '@/analytics/posthog';
posthog?.startSessionRecording?.();   // only where explicitly wanted + disclosed
posthog?.stopSessionRecording?.();
```

## Feature flags

```jsx
import { useFeatureFlagEnabled } from 'posthog-js/react';
const showUqPanel = useFeatureFlagEnabled('rate-engine-uq-panel') ?? false;

// Soft kill-switch (wired): maintenance-hide-run — prefer useMaintenanceHideRun()
// from analytics/flags.jsx so missing PostHog still defaults OFF.
import { useMaintenanceHideRun } from '@/analytics/flags';
const hideRun = useMaintenanceHideRun(); // false unless flag explicitly true
```

## Env + gitignore

- Add to `frontend/.env.development` (empty key -> no-op) and document `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST` in the deployment docs.
- Never commit a real key.

## Governance

- Keep `docs/v0.3.6-beta/ANALYTICS_TRANSPARENCY.md` in sync with the taxonomy.
- Product analytics is entirely separate from scientific analytics (`services/analyticsApi.js`, AnalyticsPage) and from claim-tier scoring - never let usage data influence physics outputs.
