/**
 * PostHog product-analytics initialization (env-gated, privacy-respecting).
 *
 * This is PRODUCT analytics (usage/flags/replay) and is entirely separate from
 * the scientific analytics in `services/analyticsApi.js` / AnalyticsPage. It must
 * never influence physics outputs, scoring, or claim tiers.
 *
 * Behavior:
 *  - No key, or non-production build, or Do-Not-Track -> complete no-op.
 *  - Keys come from env only (VITE_POSTHOG_KEY / REACT_APP_POSTHOG_KEY); never
 *    hardcode or commit a key.
 *
 * See .cursor/skills/posthog-analytics for the event taxonomy and usage rules.
 */
import posthog from 'posthog-js';
import { APP_VERSION } from '../config/version';

// Avoid direct import.meta syntax so Jest/CommonJS can parse this file
// (same technique as config/api.js).
const readViteEnv = () => {
  try {
    return Function(
      'try { return (typeof import !== "undefined" && import.meta && import.meta.env) ? import.meta.env : {}; } catch (_) { return {}; }'
    )();
  } catch (_) {
    return {};
  }
};

const metaEnv = readViteEnv();
const POSTHOG_KEY = process.env.REACT_APP_POSTHOG_KEY || metaEnv.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST =
  process.env.REACT_APP_POSTHOG_HOST || metaEnv.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

let _enabled = false;

/**
 * Initialize PostHog. Safe to call unconditionally; it self-gates.
 */
export function initAnalytics() {
  if (_enabled) return;
  const doNotTrack =
    typeof navigator !== 'undefined' &&
    (navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes');

  // No-op unless we have a key, are in production, and the user hasn't opted out.
  if (!POSTHOG_KEY || !IS_PRODUCTION || doNotTrack) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    autocapture: false, // explicit, taxonomy-driven events only
    capture_pageview: true,
    disable_session_recording: true, // opt-in per surface via startSessionRecording()
    persistence: 'localStorage+cookie',
    loaded: (ph) => ph.register({ app_version: APP_VERSION }),
  });
  _enabled = true;
}

/** Whether analytics actually initialized (false in dev/test/no-key/DNT). */
export const analyticsEnabled = () => _enabled;

export { posthog };
