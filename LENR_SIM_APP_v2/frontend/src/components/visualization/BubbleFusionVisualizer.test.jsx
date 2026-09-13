import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import api from '../../services/api';
import BubbleFusionVisualizer from './BubbleFusionVisualizer';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(() => Promise.reject(new Error('visualizer must not POST'))),
    get: jest.fn(() => Promise.reject(new Error('visualizer must not GET'))),
  },
}));

describe('BubbleFusionVisualizer Phase A provenance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not call the API on mount (page owns the fetch)', async () => {
    render(<BubbleFusionVisualizer initialRadius={10} frequency={20} />);
    await waitFor(() => {
      expect(screen.getByTestId('bubble-fusion-visualizer-idle')).toBeInTheDocument();
    });
    expect(api.post).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalled();
    expect(screen.getByTestId('bubble-fusion-visualizer-provenance')).toHaveTextContent(
      /no independent fetch/i,
    );
  });

  it('renders physics_engine provenance from page-owned payload without POSTing', async () => {
    const enginePayload = {
      provenance: 'physics_engine',
      collapse_results: {
        max_temperature_k: 12000,
        min_radius_um: 0.4,
        collapse_time_ns: 12,
        max_pressure_gpa: 2.5,
        compression_ratio: 25,
        peak_velocity_km_s: 1.2,
        fusion_probability: 1e-20,
      },
    };
    render(
      <BubbleFusionVisualizer
        enginePayload={enginePayload}
        provenance="physics_engine"
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('bubble-fusion-visualizer-provenance')).toHaveTextContent(
        /physics_engine/i,
      );
    });
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.queryByTestId('bubble-fusion-visualizer-idle')).not.toBeInTheDocument();
  });

  it('renders schematic_fallback provenance without POSTing', async () => {
    const enginePayload = {
      provenance: 'schematic_fallback',
      collapse_results: {
        max_temperature_k: 5000,
        min_radius_um: 1,
        collapse_time_ns: 100,
        max_pressure_gpa: null,
        compression_ratio: 10,
        peak_velocity_km_s: null,
        fusion_probability: 0,
      },
    };
    render(
      <BubbleFusionVisualizer
        enginePayload={enginePayload}
        provenance="schematic_fallback"
      />,
    );
    await waitFor(() => {
      expect(screen.getByTestId('bubble-fusion-visualizer-provenance')).toHaveTextContent(
        /schematic_fallback/i,
      );
    });
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.getByTestId('bubble-fusion-visualizer-provenance')).not.toHaveTextContent(
      /WKB/i,
    );
  });
});
