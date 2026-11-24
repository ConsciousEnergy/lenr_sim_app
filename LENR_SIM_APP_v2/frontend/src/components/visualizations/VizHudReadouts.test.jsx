import React from 'react';
import { render, screen } from '../../tests/test-utils';
import VizHudReadouts from './VizHudReadouts';

describe('VizHudReadouts collapse observables (VIZ-05)', () => {
  test('renders R / T / Mach / solver chips with claim tiers', () => {
    render(
      <VizHudReadouts
        showHeldGaps={false}
        collapseMeta={{
          temperature_at_ceiling: true,
          temperature_ceiling_k: 2e6,
          temperature_value_raw: 5e6,
          km_auto_selected: true,
          compressibility_regime: 'weakly_compressible',
        }}
        channels={[
          { channel_id: 'bubble.radius_um', value: 1.2, source: 'solver' },
          { channel_id: 'collapse.temperature_k', value: 2e6, source: 'solver' },
          { channel_id: 'collapse.peak_mach', value: 0.15, source: 'solver' },
          { channel_id: 'collapse.solver', value: 'keller_miksis', source: 'solver' },
        ]}
      />,
    );

    expect(screen.getByTestId('viz-hud-value-bubble.radius_um')).toBeInTheDocument();
    expect(screen.getByTestId('viz-hud-value-collapse.temperature_k')).toBeInTheDocument();
    expect(screen.getByTestId('viz-hud-temp-ceiling')).toHaveTextContent('AT CEILING');
    expect(screen.getByTestId('viz-hud-value-collapse.peak_mach')).toHaveTextContent(/0\.150/);
    expect(screen.getByTestId('viz-hud-mach-regime')).toHaveTextContent('weakly_compressible');
    expect(screen.getByTestId('viz-hud-value-collapse.solver')).toHaveTextContent(/Keller–Miksis/);
    expect(screen.getByTestId('viz-hud-km-auto')).toBeInTheDocument();
    expect(screen.getByTestId('viz-hud-tier-collapse.peak_mach')).toBeInTheDocument();
  });

  test('refuses inventing mach / solver without values', () => {
    render(
      <VizHudReadouts
        showHeldGaps={false}
        channels={[
          { channel_id: 'collapse.peak_mach', value: null, source: 'solver' },
        ]}
      />,
    );
    expect(screen.getByTestId('viz-hud-gap-collapse.peak_mach')).toHaveTextContent(/no sample/);
  });

  test('VIZ-07 melt / P_* nulls render gap chips (no invent)', () => {
    render(
      <VizHudReadouts
        showHeldGaps={false}
        channels={[
          { channel_id: 'host.phase_fraction_liquid', value: null },
          { channel_id: 'heat.P_joule', value: null },
          { channel_id: 'heat.P_resistive', value: null },
          { channel_id: 'heat.P_photonic', value: null },
        ]}
      />,
    );
    expect(screen.getByTestId('viz-hud-gap-host.phase_fraction_liquid')).toBeInTheDocument();
    expect(screen.getByTestId('viz-hud-gap-heat.P_joule')).toBeInTheDocument();
    expect(screen.getByTestId('viz-hud-gap-heat.P_photonic')).toBeInTheDocument();
  });
});
