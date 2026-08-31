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
const OPT_OUT_KEY = 'lenr_posthog_opt_out';

let _enabled = false;

export function isProductAnalyticsConfigured() {
  return Boolean(POSTHOG_KEY) && IS_PRODUCTION;
}

export function isAnalyticsOptedOut() {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(OPT_OUT_KEY) === '1';
  } catch (_) {
    return false;
  }
}

export function setAnalyticsOptOut(optOut) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (optOut) localStorage.setItem(OPT_OUT_KEY, '1');
    else localStorage.removeItem(OPT_OUT_KEY);
  } catch (_) {
    /* ignore quota / private mode */
  }
  if (optOut && _enabled) {
    posthog.opt_out_capturing();
    _enabled = false;
  }
}

/**
 * Initialize PostHog. Safe to call unconditionally; it self-gates.
 */
export function initAnalytics() {
  if (_enabled) return;
  const doNotTrack =
    typeof navigator !== 'undefined' &&
    (navigator.doNotTrack === '1' || navigator.doNotTrack === 'yes');

  if (!POSTHOG_KEY || !IS_PRODUCTION || doNotTrack || isAnalyticsOptedOut()) return;

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
