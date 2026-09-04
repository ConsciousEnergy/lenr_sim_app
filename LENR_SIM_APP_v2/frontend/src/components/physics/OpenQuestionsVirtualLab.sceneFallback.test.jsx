/**
 * When the lazily-loaded TSC scene chunk fails to evaluate (three / R3F not
 * usable in the running React runtime), the lab must degrade to the text
 * fallback rather than surfacing the page-level error boundary.
 */
import React from 'react';
import { render, screen } from '../../tests/test-utils';
import OpenQuestionsVirtualLab from './OpenQuestionsVirtualLab';
import whFixture from '../../../tests/fixtures/open_questions_wh_v2.json';

jest.mock('./TscClusterScene', () => {
  throw new Error('simulated chunk evaluation failure');
});

describe('OpenQuestionsVirtualLab — scene chunk failure', () => {
  test('falls back to the numbers-as-text alert and keeps the rest of the lab', async () => {
    render(<OpenQuestionsVirtualLab openQuestions={whFixture} />);
    const fallback = await screen.findByTestId('tsc-cluster-scene-fallback');
    expect(fallback).toHaveTextContent('Dicke radius 4.886e-11 m');
    expect(fallback).toHaveTextContent('2×23.8 = 47.6 MeV; no primary γ modeled; remainder OPEN');
    expect(screen.getByTestId('wh-scenario-controls')).toBeInTheDocument();
    expect(screen.getByTestId('wh-enp-01-panel')).toBeInTheDocument();
    expect(screen.queryByText('LENR_PROVED', { exact: true })).not.toBeInTheDocument();
  });
});
