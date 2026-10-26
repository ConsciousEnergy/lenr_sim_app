/**
 * Live bubble-lattice collapse stream.
 *
 * The backend has exposed `/api/unified/bubble-lattice/stream` since v0.3.6-beta
 * and had no frontend consumer at all, so the only way to see a collapse was to
 * POST the whole simulation and wait for the complete response. This hook
 * subscribes to the stream and accumulates the `physics_update` frames.
 *
 * Deliberately not auto-connecting: opening a socket on mount would burn one of
 * the server's bounded concurrent-stream slots on every page view.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getWebSocketUrl } from '../config/api';
import { streamFailureMessage } from '../utils/apiUserFacingError';

/** Cap retained frames so a long run cannot grow memory without bound. */
export const MAX_RETAINED_FRAMES = 400;

export const STREAM_STATUS = {
  idle: 'idle',
  connecting: 'connecting',
  streaming: 'streaming',
  complete: 'complete',
  error: 'error',
};

/**
 * @param {object} args
 * @param {object} [args.parameters] Bubble/material/lattice payload for the run.
 * @returns {object} `{ status, frames, latest, error, start, stop }`
 */
export function useBubbleLatticeStream({ parameters } = {}) {
  const socketRef = useRef(null);
  const [status, setStatus] = useState(STREAM_STATUS.idle);
  const [frames, setFrames] = useState([]);
  const [error, setError] = useState(null);

  const stop = useCallback(() => {
    const socket = socketRef.current;
    socketRef.current = null;
    if (socket && socket.readyState <= WebSocket.OPEN) {
      socket.close();
    }
    setStatus((current) => (
      current === STREAM_STATUS.complete ? current : STREAM_STATUS.idle
    ));
  }, []);

  const start = useCallback((overrides) => {
    // Never leave a previous socket open; the server caps concurrent streams.
    stop();
    setFrames([]);
    setError(null);
    setStatus(STREAM_STATUS.connecting);

    let socket;
    try {
      socket = new WebSocket(getWebSocketUrl('/api/unified/bubble-lattice/stream'));
    } catch (openError) {
      setError(streamFailureMessage(openError || 'Unable to open stream'));
      setStatus(STREAM_STATUS.error);
      return;
    }
    socketRef.current = socket;

    socket.onopen = () => {
      setStatus(STREAM_STATUS.streaming);
      // The server expects the run parameters as the first message.
      socket.send(JSON.stringify(overrides || parameters || {}));
    };

    socket.onmessage = (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return; // A malformed frame must not tear down the stream.
      }

      if (payload.type === 'physics_update') {
        setFrames((current) => {
          const next = [...current, payload];
          return next.length > MAX_RETAINED_FRAMES
            ? next.slice(next.length - MAX_RETAINED_FRAMES)
            : next;
        });
        return;
      }
      if (payload.type === 'simulation_complete') {
        setStatus(STREAM_STATUS.complete);
        return;
      }
      if (payload.type === 'error') {
        setError(streamFailureMessage(payload.message || 'Stream reported an error'));
        setStatus(STREAM_STATUS.error);
      }
    };

    socket.onerror = () => {
      // Browser WS errors are opaque; phrase as transport, never as physics falsification.
      setError(streamFailureMessage('WebSocket connection failed'));
      setStatus(STREAM_STATUS.error);
    };

    socket.onclose = () => {
      if (socketRef.current === socket) socketRef.current = null;
      setStatus((current) => (
        current === STREAM_STATUS.complete || current === STREAM_STATUS.error
          ? current
          : STREAM_STATUS.idle
      ));
    };
  }, [parameters, stop]);

  // Release the slot when the consumer unmounts mid-stream.
  useEffect(() => stop, [stop]);

  return {
    status,
    frames,
    latest: frames.length > 0 ? frames[frames.length - 1] : null,
    error,
    start,
    stop,
  };
}

export default useBubbleLatticeStream;
