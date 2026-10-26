/**
 * Taxonomy helper must call posthog.capture with stable event names and must
 * never throw when posthog is unavailable.
 */
jest.mock('./posthog', () => ({
  posthog: {
    capture: jest.fn(),
  },
}));

const { posthog } = require('./posthog');
const { track } = require('./events');

describe('track taxonomy', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fires app_loaded and client_error with dimensional props', () => {
    track.appLoaded({ app_version: '0.3.8-beta', api_mode: 'split_origin' });
    track.clientError({ error_kind: 'network', surface: 'unified_theory_run' });

    expect(posthog.capture).toHaveBeenCalledWith('app_loaded', {
      app_version: '0.3.8-beta',
      api_mode: 'split_origin',
    });
    expect(posthog.capture).toHaveBeenCalledWith('client_error', {
      error_kind: 'network',
      surface: 'unified_theory_run',
    });
  });

  it('keeps existing funnel event names stable', () => {
    track.simulationStarted({ sim_type: 'bubble_lattice' });
    track.theoryToggled({ theory_id: 'swimming_electron', enabled: true });
    track.exportDownloaded({ schema_version: 'lenr-run-export-v1' });
    expect(posthog.capture.mock.calls.map((c) => c[0])).toEqual([
      'simulation_started',
      'theory_toggled',
      'export_downloaded',
    ]);
  });

  it('swallows capture failures', () => {
    posthog.capture.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => track.clientError({ error_kind: 'react_boundary' })).not.toThrow();
  });
});
