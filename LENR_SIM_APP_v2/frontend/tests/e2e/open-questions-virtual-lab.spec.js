import { test, expect } from './fixtures.js';

/**
 * Open-questions virtual lab on Unified Results.
 * Prints two-body does-not-close as a determination; never LENR_PROVED.
 */

const VIRTUAL_LAB_RESPONSE = {
  success: true,
  contract_version: 'v0.3.7-beta-science-gate-1',
  collapse_results: {
    min_radius_um: 6.0,
    max_temperature_k: 800,
    max_pressure_bar: 12,
    compression_ratio: 2.0,
    peak_enhancement: 1e3,
  },
  proton_phases: { FREE: 0.5, SCREENED: 0.3, CAPTURE_READY: 0.15, NUCLEAR: 0.05 },
  peak_conditions: { enhancement_factor: 1e3 },
  enhancement_timeline: [],
  validation: { route_mode: 'bubble_lattice_legacy', contradiction: false },
  reaction_rate_engine: { rate: { mode: 'two_body', claim_tier: 'established_reference' } },
  open_questions: {
    schema: 'lenr-open-questions-v1',
    route_mode: 'bubble_lattice_legacy',
    rate_mode: 'two_body',
    determination: {
      status: 'RATE_BUDGET_DOES_NOT_CLOSE',
      oracle_a: {
        two_body_budget_closes: false,
        lean_theorems: ['EQ-RATE-2B-NC-01'],
      },
    },
    q_mev_gap: {
      id: 'EQ-OPEN-MEV-01',
      status: 'OPEN',
      energy_partition_mev: {
        phonon: 0, gamma: 0, recoil: 0, open_remainder: 23.8, q_total: 23.8,
      },
    },
    q_radiation: { id: 'EQ-OPEN-RAD-01', status: 'OPEN' },
    q_statistical: { id: 'EQ-OPEN-RATE-01', status: 'BUDGET_DOES_NOT_CLOSE' },
    q_electron_capture: { id: 'EQ-OPEN-EC-01', status: 'OPEN', dimmed: true },
    q_integrated_yield: { id: 'EQ-OPEN-YIELD-01', status: 'OPEN', dimmed: true },
    composition: {
      not_combinable: true,
      bubble_peak_enhancement: 1e3,
      illegal_product: null,
    },
    emp_chips: [{ id: 'miles_q_band', label: 'Miles 24±4 MeV/He EMP' }],
    lenr_proved: false,
  },
};

test.describe('Open-questions virtual lab', () => {
  test('prints two-body does not close and never LENR_PROVED', async ({
    page,
    unifiedTheoryPage,
  }) => {
    await page.route('**/api/unified/bubble-lattice', async (route) => {
      await route.fulfill({ json: VIRTUAL_LAB_RESPONSE });
    });
    await page.route('**/api/physics/theories', async (route) => {
      await route.fulfill({ json: [] });
    });
    await unifiedTheoryPage.goto();
    await unifiedTheoryPage.runSimulationButton().click();
    await unifiedTheoryPage.openResults();
    await expect(page.getByTestId('open-questions-virtual-lab')).toBeVisible();
    await expect(page.getByText(/Oracle A \/ B status:\s*RATE BUDGET DOES NOT CLOSE/i)).toBeVisible();
    await expect(page.getByText(/Two-body rate budget does not close/i)).toBeVisible();
    await expect(page.getByText('EQ-RATE-2B-NC-01')).toBeVisible();
    await expect(page.getByText('LENR_PROVED', { exact: true })).toHaveCount(0);
  });
});
