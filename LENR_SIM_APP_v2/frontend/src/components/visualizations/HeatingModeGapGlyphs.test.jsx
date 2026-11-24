import React from 'react';
import { render, screen } from '../../tests/test-utils';
import HeatingModeGapGlyphs from './HeatingModeGapGlyphs';

describe('HeatingModeGapGlyphs (VIZ-07)', () => {
  test('renders Pd T_m and gap chips for three heating modes', () => {
    render(<HeatingModeGapGlyphs hostMaterial="palladium" compact />);

    expect(screen.getByTestId('heating-mode-gap-glyphs')).toBeInTheDocument();
    expect(screen.getByTestId('liquid-phase-host-tm-chip')).toHaveTextContent(/Pd T_m 1828 K/);
    expect(screen.getByTestId('liquid-phase-fl-chip')).toHaveTextContent(/gap/);
    expect(screen.getByTestId('heating-mode-glyph-P_joule')).toHaveTextContent(/gap/);
    expect(screen.getByTestId('heating-mode-glyph-P_resistive')).toHaveTextContent(/gap/);
    expect(screen.getByTestId('heating-mode-glyph-P_photonic')).toHaveTextContent(/gap/);
  });

  test('Ni host shows 1728 K and refuses inventing heat values', () => {
    render(
      <HeatingModeGapGlyphs
        hostMaterial="nickel"
        heat={{ P_joule: null, P_resistive: null, P_photonic: null }}
        phaseFractionLiquid={null}
      />,
    );
    expect(screen.getByTestId('liquid-phase-host-tm-chip')).toHaveAttribute(
      'data-host-key',
      'nickel',
    );
    expect(screen.getByTestId('liquid-phase-host-tm-chip')).toHaveTextContent(/1728/);
    expect(screen.getByTestId('heating-mode-glyph-P_joule')).toHaveAttribute('data-kind', 'gap');
  });

  test('shows value chips when engine supplies P_* / f_L', () => {
    render(
      <HeatingModeGapGlyphs
        hostMaterial="pd"
        heat={{ P_joule: 3.2, P_resistive: null, P_photonic: null }}
        phaseFractionLiquid={0.15}
      />,
    );
    expect(screen.getByTestId('heating-mode-glyph-P_joule')).toHaveAttribute('data-kind', 'value');
    expect(screen.getByTestId('liquid-phase-fl-chip')).toHaveAttribute('data-kind', 'value');
  });
});
