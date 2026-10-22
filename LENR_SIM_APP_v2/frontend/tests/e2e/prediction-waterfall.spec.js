import { test, expect } from './fixtures.js';

const RESPONSE_WITH_PREDICTION = {
  success: true,
  contract_version: 'v0.3.9-beta-science-gate-1',
  collapse_results: {
    min_radius_um: 6.0,
    max_temperature_k: 2539,
    max_pressure_bar: 1200,
    compression_ratio: 6.0,
    peak_enhancement: 1e5,
    limits: { temperature_k: { value: 2539, ceiling: 2e6, is_saturated: false } },
    mechanism_provenance: {
      screening: {
        model: 'assenbaum_rolfs_screened',
        screening_potential_ev: 800,
        thermal_energy_ev: 0.05,
        log10_enhancement_raw: 7.2,
        is_saturated: true,
        exceeds_adiabatic_limit: true,
        citations: ['Assenbaum, Langanke & Rolfs (1987)'],
      },
    },
  },
  proton_phases: { FREE: 0.5, SCREENED: 0.3, CAPTURE_READY: 0.15, NUCLEAR: 0.05 },
  peak_conditions: {
    enhancement_factor: 1e5,
    enhancement_breakdown: {
      total: 1e5,
      screening: 1e5,
      phonon: 55,
      prediction: {
        composition_rule: 'bubble_grouped_max_product',
        physics_governed: {
          total_log10: 7.5,
          groups: [
            { group: 'barrier_screening', selected: 'screening', log10_value: 5, value: 1e5 },
            { group: 'collapse_geometry', selected: 'compression', log10_value: 2, value: 100 },
            { group: 'field_coupling', selected: 'rydberg', log10_value: 0.1, value: 1.1 },
            { group: 'lattice_coupling', selected: 'phonon', log10_value: 1.74, value: 55 },
            { group: 'material_loading', selected: 'loading', log10_value: 0.39, value: 2.5 },
          ],
        },
        sensitivity_model: { total_log10: 13.4 },
        claim_tier_display: { total: 1e5, ceiling: 1e5 },
      },
      saturation: { any_saturated: true, saturated_mechanisms: ['screening', 'total'] },
    },
  },
  enhancement_timeline: [],
  validation: { route_mode: 'bubble_lattice_legacy' },
  open_questions: {
    schema: 'lenr-open-questions-v1',
    rate_mode: 'two_body',
    determination: {
      status: 'INCONCLUSIVE',
      oracle_a: { two_body_budget_closes: false, log10_n_events_two_body: -40 },
      oracle_b: {
        priors_source: 'default_skeptical',
        hypotheses: [
          { id: 'chemical_null', posterior: 0.97, log10_bayes_vs_two_body: 40 },
          { id: 'trapped_state', posterior: 0.023, log10_bayes_vs_two_body: 39 },
        ],
      },
    },
    how: {
      best_mechanism_path: 'trapped_state',
      mechanism_paths: [{ id: 'trapped_state', posterior: 0.023 }],
    },
    q_mev_gap: {
      energy_partition_mev: { phonon: 0.1, gamma: 0.01, recoil: 0.01, open_remainder: 23.8 },
    },
    q_radiation: { assumed_branching: { n: 1e-11 } },
    q_statistical: { n_events_log10_two_body: -40 },
  },
};

test.describe('Results prediction waterfall', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/unified/bubble-lattice', async (route) => {
      await route.fulfill({ json: RESPONSE_WITH_PREDICTION });
    });
    await page.route('**/api/physics/theories', async (route) => {
      await route.fulfill({ json: [] });
    });
  });

  test('Results tab shows waterfall and readout panel', async ({ page, unifiedTheoryPage }) => {
    await unifiedTheoryPage.goto();
    await unifiedTheoryPage.runSimulationButton().click();
    await unifiedTheoryPage.openResults();
    await expect(unifiedTheoryPage.predictionReadoutPanel()).toBeVisible();
    await expect(unifiedTheoryPage.enhancementWaterfall()).toBeVisible();
    await expect(
      unifiedTheoryPage.enhancementWaterfall().getByText(/Physics governed/),
    ).toBeVisible();
    await expect(page.getByTestId('screening-provenance-panel')).toBeVisible();
    await expect(page.getByText(/800/)).toBeVisible();
  });

  test('Virtual lab renders with diagram toggle', async ({ page, unifiedTheoryPage }) => {
    await unifiedTheoryPage.goto();
    await unifiedTheoryPage.runSimulationButton().click();
    await unifiedTheoryPage.openResults();
    await expect(unifiedTheoryPage.openQuestionsVirtualLab()).toBeVisible();
    await page.getByTestId('oracle-b-tab-diagram').click();
    await expect(page.getByTestId('mechanism-diagram-trapped_state')).toBeVisible();
  });
});
