import { useEffect, useRef } from 'react';
import { APP_VERSION } from '../config/version';
import { API_BASE_URL } from '../config/api';
import { track } from './events';

/**
 * Fires `app_loaded` once per mount tree. Dimensional props only (no PII).
 */
export function AppLoadTracker() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const apiMode = API_BASE_URL === ''
      ? 'same_origin_or_proxy'
      : 'split_origin';
    track.appLoaded({
      app_version: APP_VERSION,
      api_mode: apiMode,
    });
  }, []);

  return null;
}

export default AppLoadTracker;
