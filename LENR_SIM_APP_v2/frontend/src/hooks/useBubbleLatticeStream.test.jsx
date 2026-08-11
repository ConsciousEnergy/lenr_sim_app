/**
 * The backend has exposed /api/unified/bubble-lattice/stream since v0.3.6-beta
 * with no frontend consumer, so a live collapse could not be observed at all.
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';

import {
  useBubbleLatticeStream,
  STREAM_STATUS,
  MAX_RETAINED_FRAMES,
} from './useBubbleLatticeStream';

/** Minimal controllable WebSocket stand-in. */
class MockSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    this.closed = false;
    MockSocket.instances.push(this);
  }

  send(data) {
    this.sent.push(data);
  }

  close() {
    this.closed = true;
    this.readyState = 3;
    this.onclose?.();
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
  }

  emit(payload) {
    this.onmessage?.({ data: JSON.stringify(payload) });
  }

  emitRaw(data) {
    this.onmessage?.({ data });
  }

  fail() {
    this.onerror?.(new Error('boom'));
  }
}
MockSocket.OPEN = 1;

function Probe({ parameters }) {
  const { status, frames, latest, error, start, stop } = useBubbleLatticeStream({ parameters });
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="count">{frames.length}</span>
      <span data-testid="latest">{latest ? latest.normalized_time : 'none'}</span>
      <span data-testid="error">{error || 'none'}</span>
      <button type="button" onClick={() => start()}>start</button>
      <button type="button" onClick={stop}>stop</button>
    </div>
  );
}

const PARAMETERS = { bubble: { initial_radius_um: 10 }, num_cycles: 1 };

let originalWebSocket;

beforeEach(() => {
  MockSocket.instances = [];
  originalWebSocket = global.WebSocket;
  global.WebSocket = MockSocket;
});

afterEach(() => {
  global.WebSocket = originalWebSocket;
});

const startStream = () => act(() => {
  screen.getByText('start').click();
});

describe('useBubbleLatticeStream', () => {
  it('does not open a socket until started', () => {
    render(<Probe parameters={PARAMETERS} />);
    // Auto-connecting would burn a bounded server stream slot per page view.
    expect(MockSocket.instances).toHaveLength(0);
    expect(screen.getByTestId('status')).toHaveTextContent(STREAM_STATUS.idle);
  });

  it('targets the bubble-lattice stream endpoint', () => {
    render(<Probe parameters={PARAMETERS} />);
    startStream();
    expect(MockSocket.instances[0].url).toContain('/api/unified/bubble-lattice/stream');
  });

  it('sends the run parameters as the first message', () => {
    render(<Probe parameters={PARAMETERS} />);
    startStream();
    act(() => MockSocket.instances[0].open());
    expect(JSON.parse(MockSocket.instances[0].sent[0])).toEqual(PARAMETERS);
  });

  it('accumulates physics_update frames', () => {
    render(<Probe parameters={PARAMETERS} />);
    startStream();
    const socket = MockSocket.instances[0];
    act(() => socket.open());
    act(() => socket.emit({ type: 'physics_update', normalized_time: 0.1 }));
    act(() => socket.emit({ type: 'physics_update', normalized_time: 0.2 }));

    expect(screen.getByTestId('count')).toHaveTextContent('2');
    expect(screen.getByTestId('latest')).toHaveTextContent('0.2');
    expect(screen.getByTestId('status')).toHaveTextContent(STREAM_STATUS.streaming);
  });

  it('marks completion when the server finishes', () => {
    render(<Probe parameters={PARAMETERS} />);
    startStream();
    const socket = MockSocket.instances[0];
    act(() => socket.open());
    act(() => socket.emit({ type: 'simulation_complete' }));
    expect(screen.getByTestId('status')).toHaveTextContent(STREAM_STATUS.complete);
  });

  it('surfaces a server-reported error', () => {
    render(<Probe parameters={PARAMETERS} />);
    startStream();
    const socket = MockSocket.instances[0];
    act(() => socket.open());
    act(() => socket.emit({ type: 'error', message: 'too many streams' }));
    expect(screen.getByTestId('status')).toHaveTextContent(STREAM_STATUS.error);
    expect(screen.getByTestId('error')).toHaveTextContent('too many streams');
  });

  it('ignores a malformed frame instead of tearing down the stream', () => {
    render(<Probe parameters={PARAMETERS} />);
    startStream();
    const socket = MockSocket.instances[0];
    act(() => socket.open());
    act(() => socket.emitRaw('{not json'));
    act(() => socket.emit({ type: 'physics_update', normalized_time: 0.5 }));

    expect(screen.getByTestId('status')).toHaveTextContent(STREAM_STATUS.streaming);
    expect(screen.getByTestId('count')).toHaveTextContent('1');
  });

  it('caps retained frames so memory cannot grow without bound', () => {
    render(<Probe parameters={PARAMETERS} />);
    startStream();
    const socket = MockSocket.instances[0];
    act(() => socket.open());
    act(() => {
      for (let i = 0; i < MAX_RETAINED_FRAMES + 25; i += 1) {
        socket.emit({ type: 'physics_update', normalized_time: i });
      }
    });
    expect(screen.getByTestId('count')).toHaveTextContent(String(MAX_RETAINED_FRAMES));
  });

  it('closes any previous socket when restarted', () => {
    render(<Probe parameters={PARAMETERS} />);
    startStream();
    act(() => MockSocket.instances[0].open());
    startStream();

    // The server caps concurrent streams, so a restart must release the old slot.
    expect(MockSocket.instances[0].closed).toBe(true);
    expect(MockSocket.instances).toHaveLength(2);
  });

  it('closes the socket on unmount', () => {
    const view = render(<Probe parameters={PARAMETERS} />);
    startStream();
    act(() => MockSocket.instances[0].open());
    view.unmount();
    expect(MockSocket.instances[0].closed).toBe(true);
  });

  it('stops on request', () => {
    render(<Probe parameters={PARAMETERS} />);
    startStream();
    act(() => MockSocket.instances[0].open());
    act(() => {
      screen.getByText('stop').click();
    });
    expect(MockSocket.instances[0].closed).toBe(true);
    expect(screen.getByTestId('status')).toHaveTextContent(STREAM_STATUS.idle);
  });
});
