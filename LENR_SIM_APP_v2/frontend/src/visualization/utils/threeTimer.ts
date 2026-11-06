import { useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';

/**
 * One THREE.Timer for the lifetime of the component.
 *
 * Do not write `useRef(new THREE.Timer())`. The argument is evaluated on every
 * render, and the old THREE.Clock constructor warned on each of those
 * evaluations. Timer reads do not advance time: call `update(timestamp)` once
 * per animation frame, then `getDelta()` or `getElapsed()`.
 */
export function useStableThreeTimer(): MutableRefObject<THREE.Timer> {
  const timerRef = useRef<THREE.Timer | null>(null);
  if (timerRef.current === null) {
    timerRef.current = new THREE.Timer();
  }

  useEffect(() => {
    const timer = timerRef.current;
    if (timer && typeof document !== 'undefined') {
      timer.connect(document);
    }
    return () => {
      timer?.disconnect();
    };
  }, []);

  return timerRef as MutableRefObject<THREE.Timer>;
}
