/**
 * TscClusterScene — WebGL fallback carries the same numbers as text; the scene
 * itself is exercised with three / R3F mocked (jsdom has no real WebGL).
 */
import React from 'react';
import { fireEvent, render, screen } from '../../tests/test-utils';
import fixture from '../../../tests/fixtures/open_questions_wh_v2.json';

jest.mock('three', () => ({ __esModule: true }));
jest.mock('@react-three/fiber', () => ({
  __esModule: true,
  Canvas: () => <div data-testid="r3f-canvas-mock" />,
  useFrame: () => {},
}));
jest.mock('@react-three/drei', () => ({
  __esModule: true,
  OrbitControls: () => null,
  Html: ({ children }) => <div>{children}</div>,
}));

// eslint-disable-next-line import/first
import TscClusterScene, { computeDisplayRadii, detectWebGL } from './TscClusterScene';

const WH = fixture.working_hypothesis;
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalMatchMedia = window.matchMedia;

function stubWebGL(available) {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => (available ? { getParameter: jest.fn() } : null));
}

function stubReducedMotion(matches) {
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches,
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  }));
}

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  window.matchMedia = originalMatchMedia;
});

function renderScene() {
  return render(
    <TscClusterScene dicke={WH.dicke} alphaStopping={WH.q1.alpha_stopping} channels={WH.channels} />,
  );
}

describe('TscClusterScene', () => {
  test('renders the text fallback with the real numbers when WebGL is unavailable', () => {
    stubWebGL(false);
    expect(detectWebGL()).toBe(false);
    renderScene();
    const fallback = screen.getByTestId('tsc-cluster-scene-fallback');
    expect(fallback).toHaveTextContent('WebGL is not available');
    expect(fallback).toHaveTextContent('Dicke radius 4.886e-11 m');
    expect(fallback).toHaveTextContent('paper domain 6.6e-9 m');
    expect(fallback).toHaveTextContent('ratio ≈ 135:1');
    expect(fallback).toHaveTextContent('N within Dicke radius 0.0332');
    expect(fallback).toHaveTextContent('N_coh licensed max 0');
    expect(fallback).toHaveTextContent('2×23.8 = 47.6 MeV; no primary γ modeled; remainder OPEN');
    expect(screen.queryByTestId('tsc-cluster-scene')).not.toBeInTheDocument();
  });

  test('renders the scene, legend, slider and log toggle when WebGL is available', () => {
    stubWebGL(true);
    renderScene();
    expect(screen.getByTestId('tsc-cluster-scene')).toBeInTheDocument();
    expect(screen.getByTestId('r3f-canvas-mock')).toBeInTheDocument();
    expect(screen.getByTestId('tsc-cluster-scene-legend')).toHaveTextContent('dicke_radius_m 4.886e-11');
    expect(screen.getByTestId('tsc-cluster-scene-legend')).toHaveTextContent('paper_domain_m 6.6e-9');
    expect(screen.getByTestId('tsc-cluster-scene-legend')).toHaveTextContent('n_within_radius 0.0332');
    expect(screen.getByText('TSC collapse (scrub, not physical time)')).toBeInTheDocument();
    expect(screen.getByLabelText('log-scale radii')).toBeChecked();
    expect(screen.queryByTestId('tsc-alpha-caption')).not.toBeInTheDocument();
    expect(screen.getByText('Speculative / exploratory')).toBeInTheDocument();
  });

  test('scrubbing collapse to the end reveals the two-alpha caption with the remainder OPEN', () => {
    stubWebGL(true);
    renderScene();
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: 1 } });
    expect(screen.getByTestId('tsc-alpha-caption')).toHaveTextContent(
      '2×23.8 = 47.6 MeV; no primary γ modeled; remainder OPEN',
    );
    expect(screen.queryByText('LENR_PROVED', { exact: true })).not.toBeInTheDocument();
  });

  test('respects prefers-reduced-motion', () => {
    stubWebGL(true);
    stubReducedMotion(true);
    renderScene();
    expect(screen.getByText(/Reduced motion: auto-rotation disabled/)).toBeInTheDocument();
  });

  test('renders a short caption when Dicke geometry is absent', () => {
    stubWebGL(true);
    render(<TscClusterScene dicke={undefined} channels={[]} />);
    expect(screen.getByText(/Dicke geometry not supplied/)).toBeInTheDocument();
  });
});

describe('computeDisplayRadii', () => {
  test('log scale makes both radii visible; linear keeps the ~135:1 ratio', () => {
    const log = computeDisplayRadii(WH.dicke, true);
    expect(log.dickeRadius).toBeGreaterThan(1);
    expect(log.boxHalf).toBeGreaterThan(log.dickeRadius);
    const linear = computeDisplayRadii(WH.dicke, false);
    expect(linear.boxHalf / linear.dickeRadius).toBeCloseTo(6.6e-9 / 2 / 4.886e-11, 3);
  });
});
