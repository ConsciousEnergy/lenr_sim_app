import { test, expect } from './fixtures.js';

/**
 * Open-questions virtual lab with the WH-ENP-01 v2 payload (shared fixture).
 *
 * Covers the scenario explorer (pure lookup of API grids), the Franck–Condon
 * chart, the channel DAG and the TSC cluster scene (or its text fallback when
 * WebGL is unavailable). Every surface keeps the OPEN / remainder language and
 * never prints LENR_PROVED.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const openQuestionsFixture = require('../fixtures/open_questions_wh_v2.json');

const LAB_RESPONSE = {
  success: true,
  contract_version: 'v0.3.9-beta-science-gate-1',
  collapse_results: {
    min_radius_um: 6.0,
    max_temperature_k: 2539,
    max_pressure_bar: 1200,
    compression_ratio: 6.0,
    collapse_time_us: 71.03,
    peak_field_v_m: 3.6e9,
    peak_enhancement: 1e5,
    limits: {
      temperature_k: {
        value: 2539, value_raw: 2539, ceiling: 2.0e6, is_saturated: false,
      },
    },
  },
  proton_phases: { FREE: 0.0127, SCREENED: 0.5145, CAPTURE_READY: 0.3546, NUCLEAR: 0.1182 },
  peak_conditions: {
    temperature_k: 2539,
    pressure_gpa: 0.12,
    electric_field_v_m: 3.6e9,
    enhancement_factor: 1e5,
    enhancement_breakdown: { total: 1e5, screening: 1e5, phonon: 55.1 },
  },
  enhancement_timeline: [],
  validation: { route_mode: 'legacy_unified_model', contradiction: false },
  reaction_rate_engine: { rate: { mode: 'two_body', claim_tier: 'established_reference' } },
  open_questions: openQuestionsFixture,
};

async function stubSimulation(page) {
  await page.route('**/api/unified/bubble-lattice', async (route) => {
    await route.fulfill({ json: LAB_RESPONSE });
  });
  await page.route('**/api/physics/theories', async (route) => {
    await route.fulfill({ json: [] });
  });
}

test.describe('Open-questions lab (WH-ENP-01 v2)', () => {
  test.beforeEach(async ({ page, unifiedTheoryPage }) => {
    await stubSimulation(page);
    await unifiedTheoryPage.goto();
    await unifiedTheoryPage.runSimulationButton().click();
    await unifiedTheoryPage.openResults();
    await expect(unifiedTheoryPage.openQuestionsVirtualLab()).toBeVisible();
  });

  test('renders the WH panel, channel DAG and closure / coupling rows', async ({
    page,
    unifiedTheoryPage,
  }) => {
    await expect(unifiedTheoryPage.whPanel()).toBeVisible();
    await expect(page.getByText(/Working hypothesis WH-ENP-01/)).toBeVisible();
    await expect(unifiedTheoryPage.channelDag()).toBeVisible();
    await expect(page.getByTestId('wh-channel-graph')).toBeVisible();
    await expect(page.getByTestId('wh-closure-demand-row')).toContainText('required product 5.784e26');
    await expect(page.getByTestId('wh-closure-demand-row')).toContainText('trap_25pm');
    await expect(page.getByTestId('wh-coupling-cited-row')).toContainText('remainder 23.8 MeV OPEN');
    await expect(page.getByText('LENR_PROVED', { exact: true })).toHaveCount(0);
  });

  test('the Franck–Condon chart draws with its target line and S_min caption', async ({
    unifiedTheoryPage,
  }) => {
    const chart = unifiedTheoryPage.franckCondonChart();
    await expect(chart).toBeVisible();
    await expect(chart.locator('.recharts-line')).toHaveCount(1);
    await expect(chart.locator('.recharts-reference-line')).toHaveCount(1);
    await expect(chart).toContainText('S_min for target 575400000');
    await expect(chart).toContainText('relaxation energy ≈ Q');
  });

  test('scenario explorer looks up the API grids and flags unlicensed n_coh', async ({
    unifiedTheoryPage,
  }) => {
    await expect(unifiedTheoryPage.scenarioControls()).toBeVisible();
    await expect(
      unifiedTheoryPage.scenarioControls().getByText(
        'Scenario explorer (lookup of API grids; not a posterior; EQ-OPEN-* remain OPEN)',
      ),
    ).toBeVisible();
    const remainder = unifiedTheoryPage.remainderVector();
    await expect(remainder).toContainText('Q1 remainder 23.8 MeV OPEN');
    await expect(remainder).toContainText('below R_obs');
    await expect(unifiedTheoryPage.unlicensedNcohChip()).toHaveCount(0);

    await unifiedTheoryPage.scenarioSelect('g (coupling)').selectOption('0.1');
    await unifiedTheoryPage.scenarioSelect('n_coh').selectOption('100');
    await expect(remainder).toContainText('Q1 remainder 0 MeV OPEN');
    await expect(remainder).toContainText('derived 23.8 MeV');
    await expect(unifiedTheoryPage.unlicensedNcohChip()).toBeVisible();

    await unifiedTheoryPage.scenarioSelect('f_nuc').selectOption('1');
    await expect(remainder).toContainText('= -8.252 at θ=0.6, τ=1e-20 s, f_nuc=1: below R_obs');

    await unifiedTheoryPage.scenarioSelect('Huang–Rhys S').selectOption('10000');
    await expect(remainder).toContainText('log10 P_N = -2.489e9');
    await expect(remainder).toContainText('below target');
  });

  test('the TSC cluster scene (or its text fallback) carries the Dicke numbers', async ({
    page,
    unifiedTheoryPage,
  }) => {
    await expect(unifiedTheoryPage.tscSceneOrFallback()).toBeVisible();
    const sceneVisible = await unifiedTheoryPage.tscScene().isVisible();
    if (sceneVisible) {
      const scene = unifiedTheoryPage.tscScene();
      await expect(scene.locator('canvas')).toBeVisible();
      await expect(scene).toContainText('dicke_radius_m 4.886e-11');
      await expect(scene).toContainText('paper_domain_m 6.6e-9');
      await expect(scene).toContainText('n_within_radius 0.0332');
      await expect(page.getByText('TSC collapse (scrub, not physical time)')).toBeVisible();
      await expect(unifiedTheoryPage.logScaleToggle()).toBeChecked();

      await unifiedTheoryPage.collapseSlider().focus();
      await page.keyboard.press('End');
      await expect(page.getByTestId('tsc-alpha-caption')).toContainText(
        '2×23.8 = 47.6 MeV; no primary γ modeled; remainder OPEN',
      );
      await unifiedTheoryPage.logScaleToggle().click();
      await expect(unifiedTheoryPage.logScaleToggle()).not.toBeChecked();
    } else {
      const fallback = unifiedTheoryPage.tscSceneFallback();
      await expect(fallback).toContainText('Dicke radius 4.886e-11 m');
      await expect(fallback).toContainText('paper domain 6.6e-9 m');
      await expect(fallback).toContainText('2×23.8 = 47.6 MeV; no primary γ modeled; remainder OPEN');
    }
    await expect(page.getByText('LENR_PROVED', { exact: true })).toHaveCount(0);
  });
});
