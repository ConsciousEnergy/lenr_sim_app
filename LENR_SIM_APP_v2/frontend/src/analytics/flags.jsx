/**
 * Product feature flags (PostHog) — soft kill-switch and future gates.
 *
 * Safe default is always OFF / false when PostHog is unavailable, the flag is
 * unset, or still loading. Never treat a missing flag as "enabled".
 *
 * Flag keys are stable snake/kebab names; extend deliberately (see events.js).
 */
import React, { createContext, useContext } from 'react';
import { useFeatureFlagEnabled } from 'posthog-js/react';

/** Soft-disable Run UI without Compose restore (cutover abort / bad window). */
export const FLAG_MAINTENANCE_HIDE_RUN = 'maintenance-hide-run';

const DEFAULT_FLAGS = Object.freeze({
  maintenanceHideRun: false,
});

const FeatureFlagsContext = createContext(DEFAULT_FLAGS);

/**
 * Default provider used when product analytics is not initialized.
 * All flags stay at their safe defaults (OFF).
 */
export function FeatureFlagsProvider({ children }) {
  return (
    <FeatureFlagsContext.Provider value={DEFAULT_FLAGS}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/**
 * Sync PostHog flags into context. Must mount under PostHogProvider so
 * `useFeatureFlagEnabled` is valid. Unknown/loading → false.
 */
export function PostHogFeatureFlagsSync({ children }) {
  const maintenanceHideRun = useFeatureFlagEnabled(FLAG_MAINTENANCE_HIDE_RUN) ?? false;
  const value = {
    maintenanceHideRun: Boolean(maintenanceHideRun),
  };
  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

/** Whether Run / Live Stream controls should be soft-disabled. Default false. */
export function useMaintenanceHideRun() {
  return useContext(FeatureFlagsContext).maintenanceHideRun;
}

export default useMaintenanceHideRun;
