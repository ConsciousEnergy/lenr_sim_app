/**
 * Product-analytics event taxonomy - the single source of truth for event names.
 *
 * Fire events through this helper (never scatter raw posthog.capture calls) so
 * event names stay stable. Send only small categorical/dimensional properties -
 * NEVER PII, raw simulation request/response bodies, or citation text.
 *
 * All calls are safe no-ops when analytics is disabled (dev/test/no-key/DNT).
 */
import { posthog } from './posthog';

const capture = (name, props = {}) => {
  try {
    posthog?.capture?.(name, props);
  } catch (_) {
    // Analytics must never break the UX.
  }
};

export const track = {
  /** Fired once per SPA boot after analytics init (dimensional only). */
  appLoaded: (props) => capture('app_loaded', props),
  simulationStarted: (props) => capture('simulation_started', props),
  simulationCompleted: (props) => capture('simulation_completed', props),
  theoryToggled: (props) => capture('theory_toggled', props),
  exportDownloaded: (props) => capture('export_downloaded', props),
  visualizationViewed: (props) => capture('visualization_viewed', props),
  docsViewed: (props) => capture('docs_viewed', props),
  /**
   * Client-side failures (error boundary, transport). Send only categorical
   * fields: error_kind, surface, status_code — never stack traces, payloads, PII.
   */
  clientError: (props) => capture('client_error', props),
};

export default track;
