/**
 * EMP exploratory “why not discovery” panel honesty
 * (BDS-343 / BDS-344 / BDS-346 / BDS-348).
 */
import React from 'react';
import { render, screen } from '../../tests/test-utils';
import EmpExploratoryWhyNotDiscovery from './EmpExploratoryWhyNotDiscovery';

describe('EmpExploratoryWhyNotDiscovery', () => {
  test('surfaces 2/25 coverage and Miles exploratory reasons without ≥5σ met', () => {
    render(<EmpExploratoryWhyNotDiscovery testIdPrefix="emp-test" />);
    expect(screen.getByTestId('emp-test-panel')).toBeInTheDocument();
    expect(screen.getByTestId('emp-test-pairing-chip')).toHaveTextContent(/2\/25/);
    expect(screen.getByTestId('emp-test-eligible-chip')).toHaveTextContent(/2\/25/);
    expect(screen.getByTestId('emp-test-inventory-chip')).toHaveTextContent(
      /inventory exhausted/i,
    );
    expect(screen.getByTestId('emp-test-inventory-note')).toHaveTextContent(
      /analytics_gates_clear/i,
    );
    expect(screen.getByTestId('emp-test-coverage')).toHaveTextContent(
      /analytics_eligible ≠ EQ-OPEN/i,
    );
    expect(screen.getByTestId('emp-test-coverage')).toHaveTextContent(
      /dual_kasagi_analytics_does_not_close_eq_open_or_lenr/,
    );
    expect(screen.getByTestId('emp-test-coverage')).toHaveTextContent(
      /discovery_grade_analytics_does_not_close_any_eq_open/,
    );
    expect(screen.getByTestId('emp-test-floor-nc-chip')).toHaveTextContent(
      /instrument_floor/i,
    );
    expect(screen.getByTestId('emp-test-lean-all-eq-open')).toHaveTextContent(
      /Q1–Q5|any of Q1/i,
    );
    expect(screen.getByTestId('emp-test-lean-lab-ask')).toHaveTextContent(
      /lab-ask ≠ EQ-OPEN/i,
    );
    expect(screen.getByTestId('emp-test-soft-chip-lock')).toHaveTextContent(
      /soft chip ≠ scientific discharge/i,
    );
    expect(screen.getByTestId('emp-test-runway-exhausted-chip')).toHaveTextContent(
      /runway exhausted/i,
    );
    expect(screen.getByTestId('emp-test-promote-prep-chip')).toHaveTextContent(
      /promote\+ship prep/i,
    );
    expect(screen.getByTestId('emp-test-scientific-blockers')).toHaveTextContent(
      /Remaining scientific blockers/i,
    );
    expect(screen.getByTestId('emp-test-scientific-blockers')).toHaveTextContent(
      /governed_lab|eq_open|lenr_proved/i,
    );
    expect(screen.getByTestId('emp-test-next-lab-targets')).toHaveTextContent(
      /Next lab \/ MoE targets/i,
    );
    expect(screen.getByTestId('emp-test-lab-ask-ne-discharge')).toHaveTextContent(
      /lab_ask_proxies_do_not_discharge_eq_open/,
    );
    expect(
      screen.getByTestId('emp-test-next-lab-governed_heat_he_cite_gated_moe'),
    ).toHaveTextContent(/cite-gated|YIELD/i);
    expect(
      screen.getByTestId('emp-test-lab-acceptance-governed_heat_he_cite_gated_moe'),
    ).toHaveTextContent(/literature_reported.*S_heat|moe_sigma_q_pairing_verified/i);
    expect(
      screen.getByTestId('emp-test-corpus-gap-governed_heat_he_cite_gated_moe'),
    ).toHaveTextContent(/0\/25.*Miles|instrument_precision/i);
    expect(
      screen.getByTestId('emp-test-still-open-governed_heat_he_cite_gated_moe'),
    ).toHaveTextContent(/EQ-OPEN-YIELD-01|lab_ask_proxies_do_not_discharge/i);
    expect(
      screen.getByTestId('emp-test-daq-governed_heat_he_cite_gated_moe'),
    ).toHaveTextContent(/excess_power_W|sigma_Q_W|he4_atoms/);
    expect(
      screen.getByTestId('emp-test-next-lab-gamma_ul_efficiency_corrected'),
    ).toHaveTextContent(/23\.8 MeV|efficiency/i);
    expect(screen.getByTestId('emp-test-refused-moe')).toHaveTextContent(
      /Refused fabricated MoE/i,
    );
    expect(screen.getByTestId('emp-test-locked-s-heat')).toHaveTextContent(/13\.75|11\.25|26/);
    expect(screen.getByTestId('emp-test-refused-iwamura-heat-2024')).toHaveTextContent(
      /REFUSE_FABRICATED_SIGMA_Q/,
    );
    expect(screen.getByTestId('emp-test-refused-mizuno-ni-pd-airflow')).toHaveTextContent(
      /REFUSE_FABRICATED_SIGMA_Q/,
    );
    expect(screen.getByTestId('emp-test-row-miles-1993')).toHaveTextContent(/Miles/i);
    expect(screen.getByTestId('emp-test-claim-tier-miles-1993')).toHaveAttribute(
      'data-claim-tier',
      'speculative_exploratory',
    );
    expect(screen.getByTestId('emp-test-s-heat-tier-miles-1993')).toHaveAttribute(
      'data-claim-tier',
      'speculative_exploratory',
    );
    expect(
      screen.getByTestId('emp-test-next-lab-tier-gamma_ul_efficiency_corrected'),
    ).toHaveAttribute('data-claim-tier', 'speculative_exploratory');
    expect(screen.getByTestId('emp-test-distance-miles-1993')).toHaveTextContent(
      /at_or_above_bar_gates_blocked/,
    );
    expect(screen.getByTestId('emp-test-honesty-miles-1993')).toHaveTextContent(
      /not discovery/i,
    );
    expect(screen.getByTestId('emp-test-refused-campaigns')).toHaveTextContent(
      /Refused fabricated discovery MoE/i,
    );
    expect(screen.getByTestId('emp-test-refuse-chip')).toHaveTextContent(
      /Iwamura\/Mizuno\/Arata\/Celani/i,
    );
    expect(screen.getByTestId('emp-test-refuse-celani-constantan-12pm2')).toHaveTextContent(
      /near_miss|12 ± 2|72494/i,
    );
    expect(
      screen.getByTestId('emp-test-refuse-missing-iwamura-heat-2024'),
    ).toHaveTextContent(/Missing:|no ±|GUM/i);
    expect(screen.getByTestId('emp-test-row-miles-1993')).toHaveTextContent(/JEAC|±0\.04|0\.04/);
    expect(screen.getByTestId('emp-test-panel')).not.toHaveTextContent(/≥5σ gap:\s*met/i);
    expect(screen.getByTestId('emp-test-panel')).not.toHaveTextContent(/lenr_proved:\s*true/i);
  });
});
