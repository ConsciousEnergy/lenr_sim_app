/**
 * DiscoveryGradeGapChecklist — live corpus MoE coverage prop honesty.
 */
import React from 'react';
import { render, screen } from '../../tests/test-utils';
import DiscoveryGradeGapChecklist from './DiscoveryGradeGapChecklist';

const LIVE_COUNTS = Object.freeze({
  schema: 'lenr-moe-coverage-v1',
  n_records: 26,
  with_sigma_q: 5,
  with_literature_reported_cite_gated: 2,
  with_moe_pairing_verified: 2,
  discovery_grade_eligible_count: 2,
  discovery_grade_eligible_ids: ['kasagi-nicu-radiant-2026', 'kasagi-ni-radiant-2026'],
  closes_eq_open: true, // must be forced false by checklist
  lenr_proved: true, // must be forced false by checklist
  title: 'Live corpus MoE coverage',
});

describe('DiscoveryGradeGapChecklist live coverage prop', () => {
  test('defaults to spa_freeze when no live coverage is passed', () => {
    render(<DiscoveryGradeGapChecklist testIdPrefix="gap" showEmpWhyNot={false} />);
    expect(screen.getByTestId('gap-moe-coverage-source')).toHaveTextContent('spa_freeze');
    expect(screen.getByTestId('gap-moe-coverage')).toHaveTextContent('2/26');
    expect(screen.getByTestId('gap-moe-coverage')).toHaveTextContent('closes_eq_open');
    expect(screen.getByTestId('gap-moe-coverage')).toHaveTextContent('false');
  });

  test('hydrates live counts and forces honesty locks false', () => {
    render(
      <DiscoveryGradeGapChecklist
        testIdPrefix="gap"
        showEmpWhyNot={false}
        corpusMoeCoverage={LIVE_COUNTS}
        coverageSource="live_api"
      />,
    );
    expect(screen.getByTestId('gap-moe-coverage-source')).toHaveTextContent('live_api');
    expect(screen.getByTestId('gap-moe-coverage')).toHaveTextContent('2/26');
    expect(screen.getByTestId('gap-moe-coverage')).toHaveTextContent(
      'Live corpus MoE coverage',
    );
    // Hostile true flags from live payload must not render as true.
    const text = screen.getByTestId('gap-moe-coverage').textContent;
    expect(text).toMatch(/closes_eq_open=\s*false/);
    expect(text).toMatch(/lenr_proved=\s*false/);
  });
});
