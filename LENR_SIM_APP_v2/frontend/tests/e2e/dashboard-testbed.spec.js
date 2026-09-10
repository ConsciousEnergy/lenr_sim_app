import { test, expect } from './fixtures.js';

/**
 * Theory Testbed on the main dashboard.
 *
 * The hub at `/dashboard` was launcher-only, so running the theory pipeline
 * always required navigating to `/unified-theory` first. The testbed is now
 * embedded, and because results land in the shared persisted `theoryResult`,
 * a dashboard run must be readable from Advanced Analysis with no re-run.
 *
 * Backend responses are stubbed for determinism, per the E2E skill.
 */

const THEORY_LIST_RESPONSE = [
  {
    theory_id: 'electron_screening',
    theory_name: 'Electron Screening',
    description: 'Debye screening of the Coulomb barrier',
    configurable_parameters: {},
    references: [],
    category: 'primary',
  },
  {
    theory_id: 'takahashi_tsc',
    theory_name: 'Takahashi TSC',
    description: 'Four-deuteron tetrahedral symmetric condensate',
    configurable_parameters: {},
    references: [],
    category: 'mechanism',
  },
];

const THEORY_RUN_RESPONSE = {
  contract_version: 'v0.3.7-beta-science-gate-1',
  combined_enhancement: 9897.13,
  combined_reaction_rate_modifier: 1.0,
  total_energy_watts: 0.42,
  conditions: { temperature: 300 },
  enabled_theories: ['electron_screening', 'takahashi_tsc'],
  per_theory: [
    {
      theory_id: 'electron_screening',
      theory_name: 'Electron Screening',
      is_applicable: true,
      confidence: 0.82,
      claim_tier: 'empirical_lenr_correlation',
      enhancement_factor: 9897.13,
      energy_output_watts: 0.31,
      observables: { U_screen_eV: 800 },
      references: [],
    },
    {
      theory_id: 'takahashi_tsc',
      theory_name: 'Takahashi TSC',
      is_applicable: true,
      confidence: 0.44,
      claim_tier: 'speculative_exploratory',
      enhancement_factor: 12.4,
      energy_output_watts: 0.11,
      observables: {},
      references: [],
    },
  ],
};

/** Captured request bodies so the conditions payload can be asserted. */
async function stubTheoryApi(page, captured = []) {
  await page.route('**/api/physics/theories', async (route) => {
    await route.fulfill({ json: THEORY_LIST_RESPONSE });
  });
  await page.route('**/api/physics/theories/run', async (route) => {
    captured.push(JSON.parse(route.request().postData() || '{}'));
    await route.fulfill({ json: THEORY_RUN_RESPONSE });
  });
  return captured;
}

test.describe('Dashboard Theory Testbed', () => {
  test.beforeEach(async ({ page }) => {
    await stubTheoryApi(page);
  });

  test('the hub exposes a runnable testbed', async ({ dashboardPage }) => {
    await dashboardPage.goto();

    await expect(dashboardPage.testbedHeading()).toBeVisible();
    await expect(dashboardPage.runTheoriesButton()).toBeEnabled();
  });

  test('running from the dashboard produces a combined enhancement', async ({
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await expect(dashboardPage.theoryChip('Electron Screening')).toBeVisible();

    await dashboardPage.runTheories();

    await expect(dashboardPage.combinedEnhancement()).toBeVisible();
    await expect(dashboardPage.advancedAnalysisLink()).toBeVisible();
  });

  test('a dashboard run is readable in Advanced Analysis without re-running', async ({
    page,
    dashboardPage,
    advancedAnalysisPage,
  }) => {
    await dashboardPage.goto();
    await expect(dashboardPage.theoryChip('Electron Screening')).toBeVisible();
    await dashboardPage.runTheories();
    await expect(dashboardPage.advancedAnalysisLink()).toBeVisible();

    // Cold navigation, so this exercises the persisted result rather than state
    // handed over in memory.
    await advancedAnalysisPage.goto();
    await advancedAnalysisPage.openTheorySummary();

    await expect(advancedAnalysisPage.theorySummaryEmptyState()).toHaveCount(0);
    await expect(page.getByText('Electron Screening').first()).toBeVisible();
  });

  test('posts a complete conditions payload with no simulation parameters set', async ({
    page,
    dashboardPage,
  }) => {
    const captured = [];
    await stubTheoryApi(page, captured);

    await dashboardPage.goto();
    await expect(dashboardPage.theoryChip('Electron Screening')).toBeVisible();
    await dashboardPage.runTheories();
    await expect(dashboardPage.combinedEnhancement()).toBeVisible();

    expect(captured.length).toBeGreaterThan(0);
    const { conditions } = captured[captured.length - 1];
    expect(conditions.temperature).toBe(300);
    expect(conditions.electrolyte_species).toBe('lioh');
    expect(conditions.gap_width_nm).toBeGreaterThan(0);
  });

  test('the theory selection carries over to the full testbed', async ({
    page,
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await expect(dashboardPage.theoryChip('Electron Screening')).toBeVisible();

    // Narrow the selection on the hub, then follow the link to the full panel.
    await dashboardPage.selectNoneButton().click();
    await dashboardPage.theoryChip('Takahashi TSC').click();
    await expect(dashboardPage.runTheoriesButton()).toBeEnabled();

    await dashboardPage.fullTestbedLink().click();
    await expect(page).toHaveURL(/tab=testbed/);

    // Persisted selection must win over the "enable everything" default.
    const stored = await page.evaluate(() =>
      sessionStorage.getItem('lenr_enabledTheories'),
    );
    expect(stored).toContain('takahashi_tsc');
    expect(stored).not.toContain('electron_screening');
  });

  test('states that the pipeline total is not combinable with the simulation peak', async ({
    dashboardPage,
  }) => {
    await dashboardPage.goto();
    await expect(dashboardPage.nonCombinableNotice()).toBeVisible();
  });
});
