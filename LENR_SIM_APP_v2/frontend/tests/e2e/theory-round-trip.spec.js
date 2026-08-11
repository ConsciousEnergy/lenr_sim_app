import { test, expect } from './fixtures.js';

/**
 * Advanced Analysis <-> Theory Testbed round trip.
 *
 * The reported bug: the Theory Summary tab showed an empty state pointing at the
 * Theory Testbed, but the trip back never populated it, so users looped. Two causes,
 * both covered here:
 *   1. theoryResult was not persisted, so a reload emptied Theory Summary while the
 *      simulation-backed tabs stayed populated.
 *   2. `hasData` OR-ed the two sources, so the page looked ready while the
 *      theory-dependent tabs could never fill.
 *
 * Backend responses are stubbed so the flow is deterministic and does not require a
 * running backend, per the E2E skill's guidance.
 */

const THEORY_RUN_RESPONSE = {
  contract_version: 'v0.3.6-beta-science-gate-1',
  combined_enhancement: 9897.13,
  combined_reaction_rate_modifier: 1.0,
  total_energy_watts: 0.42,
  conditions: { temperature: 300, pressure: 151987.5 },
  enabled_theories: ['electron_screening', 'quantum_tunneling'],
  per_theory: [
    {
      theory_id: 'electron_screening',
      theory_name: 'Electron Screening',
      is_applicable: true,
      confidence: 0.82,
      enhancement_factor: 9897.13,
      energy_output_watts: 0.31,
      observables: { U_screen_eV: 800, lambda_D_nm: 0.104, enhancement_factor: 9897.13 },
    },
    {
      theory_id: 'quantum_tunneling',
      theory_name: 'Quantum Tunneling',
      is_applicable: true,
      confidence: 0.77,
      enhancement_factor: 12.4,
      energy_output_watts: 0.11,
      observables: {
        gamow_probability: 2.5e-21,
        sommerfeld_parameter: 31.28,
        gamow_exponent: 98.9,
        coulomb_barrier_eV: 475094,
        thermal_energy_eV: 0.0259,
      },
    },
  ],
};

const THEORY_LIST_RESPONSE = [
  {
    theory_id: 'electron_screening',
    theory_name: 'Electron Screening',
    description: 'Debye screening of the Coulomb barrier',
    claim_tier: 'established_reference',
  },
  {
    theory_id: 'quantum_tunneling',
    theory_name: 'Quantum Tunneling',
    description: 'WKB barrier penetration',
    claim_tier: 'established_reference',
  },
];

/**
 * A bubble-lattice response captured at the saturating peak conditions that made
 * five mechanisms display an identical 1.0000e+5.
 */
const SATURATED_SIMULATION_RESULT = {
  collapse_results: {
    min_radius_um: 0.01,
    max_temperature_k: 10000,
    max_pressure_bar: 100000,
    compression_ratio: 1000,
    collapse_time_us: 56.578,
    peak_enhancement: 1e5,
  },
  peak_conditions: {
    temperature_k: 10000,
    pressure_gpa: 10,
    electric_field_v_m: 1e14,
    enhancement_factor: 1e5,
    enhancement_breakdown: {
      total: 1e5,
      screening: 9897.13,
      phonon: 55.11,
      qed: 1e5,
      casimir: 1e5,
      rydberg: 1e5,
      compression: 1e5,
      loading: 2.4621,
      saturation: {
        ceiling: 1e5,
        any_saturated: true,
        saturated_mechanisms: ['casimir', 'compression', 'qed', 'rydberg', 'total'],
        mechanisms: {
          total: { value: 1e5, log10_value_raw: 38.83, is_saturated: true, ceiling: 1e5 },
          screening: { value: 9897.13, log10_value_raw: 4.0, is_saturated: false, ceiling: 1e5 },
          phonon: { value: 55.11, log10_value_raw: 1.74, is_saturated: false, ceiling: 1e5 },
          qed: { value: 1e5, log10_value_raw: 12.0, is_saturated: true, ceiling: 1e5 },
          casimir: { value: 1e5, log10_value_raw: 6.0, is_saturated: true, ceiling: 1e5 },
          rydberg: { value: 1e5, log10_value_raw: 8.7, is_saturated: true, ceiling: 1e5 },
          compression: { value: 1e5, log10_value_raw: 6.0, is_saturated: true, ceiling: 1e5 },
          loading: { value: 2.4621, log10_value_raw: 0.39, is_saturated: false, ceiling: 1e5 },
        },
      },
    },
  },
  proton_phases: {
    FREE: 0.0127,
    SCREENED: 0.5145,
    CAPTURE_READY: 0.3546,
    NUCLEAR: 0.1182,
  },
};

/** Stub the two endpoints the testbed flow depends on. */
async function stubTheoryApi(page) {
  await page.route('**/api/physics/theories', async (route) => {
    await route.fulfill({ json: THEORY_LIST_RESPONSE });
  });
  await page.route('**/api/physics/theories/run', async (route) => {
    await route.fulfill({ json: THEORY_RUN_RESPONSE });
  });
}

/**
 * Seed only the simulation data source, mimicking a persisted earlier run. This is
 * the state that produced the loop: the page renders as ready, but nothing the user
 * does on the destination page fills the Theory Summary tab.
 */
async function seedSimulationOnly(page) {
  await page.goto('/advanced-analysis');
  await page.evaluate((result) => {
    sessionStorage.setItem('lenr_simulationResult', JSON.stringify(result));
    sessionStorage.removeItem('lenr_theoryResult');
  }, SATURATED_SIMULATION_RESULT);
  await page.reload();
}

test.describe('Theory Testbed round trip', () => {
  test.beforeEach(async ({ page }) => {
    await stubTheoryApi(page);
  });

  test('empty state offers the testbed when nothing has been run', async ({
    page,
    advancedAnalysisPage,
  }) => {
    await advancedAnalysisPage.goto();

    // With neither source present the page shows a single top-level empty state.
    await expect(page.getByText(/no analysis data available/i)).toBeVisible();
    await expect(advancedAnalysisPage.goToTestbedButton()).toHaveAttribute(
      'href',
      /tab=testbed/,
    );
  });

  test('Theory Summary empty state routes to the testbed tab, not tab 0', async ({
    page,
    advancedAnalysisPage,
  }) => {
    // Tabs only render once at least one source has data.
    await seedSimulationOnly(page);
    await advancedAnalysisPage.openTheorySummary();

    await expect(advancedAnalysisPage.theorySummaryEmptyState()).toBeVisible();
    // Landing on bare /unified-theory is what caused the loop: its dominant action
    // is "Run Physics Simulation", which never fills this tab.
    await expect(advancedAnalysisPage.goToTestbedButton()).toHaveAttribute(
      'href',
      /tab=testbed/,
    );
  });

  test('running theories populates Theory Summary and survives a reload', async ({
    page,
    unifiedTheoryPage,
    advancedAnalysisPage,
  }) => {
    await unifiedTheoryPage.gotoTestbed();

    const runTheories = unifiedTheoryPage.runTheoriesButton();
    await expect(runTheories).toBeVisible();
    await runTheories.click();

    // The return path exists only once results are in.
    const returnLink = unifiedTheoryPage.viewInAdvancedAnalysisLink();
    await expect(returnLink).toBeVisible();
    await returnLink.click();

    await expect(page).toHaveURL(/\/advanced-analysis/);
    await advancedAnalysisPage.openTheorySummary();

    await expect(advancedAnalysisPage.theorySummaryEmptyState()).toHaveCount(0);
    await expect(page.getByText('Electron Screening').first()).toBeVisible();

    // The persistence fix: before it, this reload emptied the tab again.
    await page.reload();
    await advancedAnalysisPage.openTheorySummary();
    await expect(advancedAnalysisPage.theorySummaryEmptyState()).toHaveCount(0);
    await expect(page.getByText('Electron Screening').first()).toBeVisible();
  });

  test('theory results persist into a fresh navigation to Advanced Analysis', async ({
    page,
    unifiedTheoryPage,
    advancedAnalysisPage,
  }) => {
    await unifiedTheoryPage.gotoTestbed();
    await unifiedTheoryPage.runTheories();
    await expect(unifiedTheoryPage.viewInAdvancedAnalysisLink()).toBeVisible();

    // Direct navigation rather than the in-app link, so this covers a cold page load.
    await advancedAnalysisPage.goto();
    await advancedAnalysisPage.openTheorySummary();
    await expect(advancedAnalysisPage.theorySummaryEmptyState()).toHaveCount(0);
  });
});

test.describe('Advanced Analysis data-source honesty', () => {
  test('states which data source is missing instead of looking complete', async ({
    page,
    advancedAnalysisPage,
  }) => {
    await seedSimulationOnly(page);
    await expect(advancedAnalysisPage.missingTheoryDataNotice()).toBeVisible();
  });

  test('saturated mechanisms are labelled and show their uncapped magnitude', async ({
    page,
    advancedAnalysisPage,
  }) => {
    await seedSimulationOnly(page);
    await advancedAnalysisPage.openBubbleCollapse();

    await expect(advancedAnalysisPage.enhancementBreakdownHeading()).toBeVisible();
    await expect(advancedAnalysisPage.saturationNotice()).toBeVisible();
    // Five mechanisms display an identical 1.0000e+5; the raw annotations are what
    // keep them distinguishable.
    await expect(advancedAnalysisPage.rawMagnitudeAnnotations()).toHaveCount(5);
  });
});
