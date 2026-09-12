import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
  mapBubbleFusionApiResults,
  pickFiniteNumber,
  buildSchematicBubbleFusionPayload,
  BF_PROVENANCE,
} from './BubbleFusionPage';

describe('mapBubbleFusionApiResults', () => {
  it('does not invent 1e13 when the API omits enhancement_factor', () => {
    const mapped = mapBubbleFusionApiResults({
      peak_temperature_k: 12000,
      peak_pressure_bar: 800,
    });
    expect(mapped.enhancementFactor).toBeNull();
    expect(mapped.maxTemperature).toBe(12000);
    expect(mapped.isLocalFallback).toBe(false);
  });

  it('reads nested collapse peak_enhancement when present', () => {
    const mapped = mapBubbleFusionApiResults({
      collapse_results: { peak_enhancement: 1e5, max_temperature_k: 9000 },
    });
    expect(mapped.enhancementFactor).toBe(1e5);
    expect(mapped.maxTemperature).toBe(9000);
  });

  it('maps engine GPa pressure, compression_ratio, and peak_velocity_km_s', () => {
    const mapped = mapBubbleFusionApiResults({
      collapse_results: {
        max_temperature_k: 1e6,
        max_pressure_gpa: 12.5,
        min_radius_um: 0.4,
        collapse_time_ns: 12,
        compression_ratio: 25,
        peak_velocity_km_s: 1.5,
        fusion_probability: 1e-20,
      },
    });
    expect(mapped.maxPressureGpa).toBe(12.5);
    expect(mapped.maxPressure).toBe(12.5 * 1e4);
    expect(mapped.compressionRatio).toBe(25);
    expect(mapped.peakVelocityKmS).toBe(1.5);
    expect(mapped.isLocalFallback).toBe(false);
  });
});

describe('pickFiniteNumber', () => {
  it('skips null/undefined/NaN', () => {
    expect(pickFiniteNumber(null, undefined, Number.NaN, 3)).toBe(3);
    expect(pickFiniteNumber()).toBeNull();
  });
});


describe('buildSchematicBubbleFusionPayload', () => {
  it('marks schematic provenance and zero fusion probability', () => {
    const payload = buildSchematicBubbleFusionPayload(
      { initialRadius: 10, drivingPressureAmplitude: 1.2, frequency: 20 },
      {
        maxTemperature: 5000,
        minRadius: 0.5,
        collapseTime: 1e-6,
        maxPressureGpa: null,
        maxPressure: 800,
        compressionRatio: 20,
      },
    );
    expect(payload.provenance).toBe(BF_PROVENANCE.SCHEMATIC_FALLBACK);
    expect(payload.collapse_results.fusion_probability).toBe(0);
    expect(payload.schematic_note).toMatch(/Not POST/i);
  });
});

describe('mapBubbleFusionApiResults provenance', () => {
  it('tags physics_engine provenance', () => {
    const mapped = mapBubbleFusionApiResults({
      collapse_results: { max_temperature_k: 1e4 },
    });
    expect(mapped.provenance).toBe(BF_PROVENANCE.PHYSICS_ENGINE);
    expect(mapped.isLocalFallback).toBe(false);
  });
});

/**
 * Page owns a single POST; visualizer must not fetch independently.
 * Mock heavy children so we only exercise fetch + provenance chip wiring.
 */
jest.mock('../components/visualization/BubbleFusionVisualizer', () => {
  const React = require('react');
  return function MockVisualizer({ provenance, enginePayload }) {
    return React.createElement('div', {
      'data-testid': 'mock-bf-visualizer',
      'data-provenance': provenance || '',
      'data-has-payload': enginePayload ? 'yes' : 'no',
    });
  };
});

jest.mock('../components/controls/BubbleFusionParameterControls', () => {
  const React = require('react');
  return function MockControls() {
    return React.createElement('div', { 'data-testid': 'mock-bf-controls' });
  };
});

jest.mock('../components/EngineMaturityBadge', () => {
  const React = require('react');
  return function MockBadge() {
    return React.createElement('div', { 'data-testid': 'mock-maturity-badge' });
  };
});

// Import after mocks so the page picks them up
const BubbleFusionPage = require('./BubbleFusionPage').default;

describe('BubbleFusionPage single-fetch provenance', () => {
  const theme = createTheme();
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('POSTs bubble-fusion once and shows physics_engine provenance on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        collapse_results: {
          max_temperature_k: 4722,
          max_pressure_gpa: 1.76,
          min_radius_um: 1.0,
          collapse_time_ns: 50,
          compression_ratio: 10,
          peak_velocity_km_s: 0.8,
          fusion_probability: 1e-30,
        },
        timeseries: { time_us: [0], radius_um: [10], temperature_k: [298] },
        parameters: {},
      }),
    });

    render(
      <ThemeProvider theme={theme}>
        <BubbleFusionPage />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Run Simulation/i }));

    await waitFor(() => {
      expect(screen.getByTestId('bubble-fusion-provenance-chip')).toHaveTextContent(
        /physics_engine/,
      );
    });

    const bubblePosts = global.fetch.mock.calls.filter(
      ([url]) => String(url).includes('/api/physics/bubble-fusion'),
    );
    expect(bubblePosts).toHaveLength(1);
    expect(screen.getByTestId('mock-bf-visualizer')).toHaveAttribute(
      'data-provenance',
      'physics_engine',
    );
    expect(screen.getByTestId('mock-bf-visualizer')).toHaveAttribute('data-has-payload', 'yes');
    expect(screen.queryByText(/Backend unreachable/i)).not.toBeInTheDocument();
  });

  it('shows schematic_fallback when the API is unreachable (still one attempt)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Failed to fetch'));

    render(
      <ThemeProvider theme={theme}>
        <BubbleFusionPage />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Run Simulation/i }));

    await waitFor(() => {
      expect(screen.getByTestId('bubble-fusion-provenance-chip')).toHaveTextContent(
        /schematic_fallback/,
      );
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('mock-bf-visualizer')).toHaveAttribute(
      'data-provenance',
      'schematic_fallback',
    );
    expect(screen.getByText(/Backend unreachable/i)).toBeInTheDocument();
  });
});
