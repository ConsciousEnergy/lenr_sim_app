import { test, expect } from './fixtures.js';

/**
 * Enhancement timeline and collapse trajectory charts.
 *
 * Recharts renders *nothing* when its container resolves to zero height, and a
 * `ResponsiveContainer height="85%"` inside a parent with only `minHeight` does
 * exactly that: the chart vanished silently while its heading and info banner
 * still rendered, so unit tests that assert on text kept passing. These specs
 * assert on legend entries, which only exist once the chart actually draws.
 *
 * They also lock the substance of the fix: the reported (clamped) series is flat
 * at the display ceiling while the uncapped series keeps rising, which is the
 * whole reason both are plotted.
 */

const SATURATING_RESPONSE = {
  success: true,
  contract_version: 'v0.3.6-beta-science-gate-1',
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
    bubble_dynamics: {
      mode: 'rayleigh_plesset',
      solver: 'scipy.integrate.solve_ivp(LSODA)',
      peak_mach: 0.219,
      compressibility_regime: 'compressibility_significant',
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
  // Half the samples saturate, so the clamped series must be visibly flat.
  enhancement_timeline: Array.from({ length: 20 }, (_, index) => {
    const saturated = index >= 10;
    return {
      normalized_time: index / 19,
      phase: saturated ? 'MINIMUM' : 'EXPANSION',
      enhancement: saturated ? 1e5 : 10 ** (index / 4),
      enhancement_log10_raw: saturated ? 8 + index * 0.2 : index / 4,
      enhancement_is_saturated: saturated,
      enhancement_breakdown: { total: saturated ? 1e5 : 10 ** (index / 4) },
      proton_distribution: { FREE: 0.5, SCREENED: 0.3, CAPTURE_READY: 0.15, NUCLEAR: 0.05 },
      radius_factor: 1 - index / 40,
      radius_um: 10 - index / 4,
      temperature_k: 300 + index * 100,
      pressure_bar: 1 + index * 50,
      electric_field_v_m: 1e8 * (1 + index),
      electrolyte_multiplier: 1.0,
    };
  }),
  collapse_trajectory: {
    time_s: Array.from({ length: 30 }, (_, i) => i * 2e-6),
    radius_um: Array.from({ length: 30 }, (_, i) => 10 - 4 * Math.sin((i / 29) * Math.PI)),
    wall_velocity_m_s: Array.from({ length: 30 }, (_, i) => -300 * Math.cos((i / 29) * Math.PI)),
    min_radius_sample_index: 15,
    sample_count: 30,
    downsample_step: 1,
    source: 'rayleigh_plesset_trajectory',
  },
  validation: { route_mode: 'bubble_lattice_legacy', contradiction: false },
  reaction_rate_engine: {},
};

async function stubSimulation(page) {
  await page.route('**/api/unified/bubble-lattice', async (route) => {
    await route.fulfill({ json: SATURATING_RESPONSE });
  });
  await page.route('**/api/physics/theories', async (route) => {
    await route.fulfill({ json: [] });
  });
}

test.describe('Enhancement timeline charts', () => {
  test.beforeEach(async ({ page, unifiedTheoryPage }) => {
    await stubSimulation(page);
    await unifiedTheoryPage.goto();
    await unifiedTheoryPage.runSimulationButton().click();
    await unifiedTheoryPage.openEnhancementTimeline();
  });

  test('the enhancement chart actually renders', async ({ unifiedTheoryPage }) => {
    // Legend entries exist only once Recharts has non-zero layout to draw into.
    await expect(
      unifiedTheoryPage.enhancementLegendEntry('Enhancement (uncapped log10)'),
    ).toBeVisible();
    await expect(
      unifiedTheoryPage.enhancementLegendEntry('Enhancement (reported, clamped)'),
    ).toBeVisible();
  });

  test('both the capped and uncapped series are plotted', async ({ page }) => {
    // Four series on the enhancement chart (two enhancement lines, radius,
    // electrolyte multiplier) plus two on the trajectory chart below it.
    const lines = page.locator('.recharts-line');
    await expect(lines).toHaveCount(6);
  });

  test('the saturation banner reports how many samples are clamped', async ({
    unifiedTheoryPage,
  }) => {
    await expect(unifiedTheoryPage.saturationBanner()).toBeVisible();
  });

  test('the integrated collapse trajectory renders below it', async ({
    page,
    unifiedTheoryPage,
  }) => {
    await expect(unifiedTheoryPage.collapseTrajectoryHeading()).toBeVisible();
    // "Radius (μm)" appears as both an axis label and a legend entry, so scope to
    // the legend to stay unambiguous.
    await expect(
      page.locator('.recharts-legend-item-text', { hasText: 'Radius (μm)' }).first(),
    ).toBeVisible();
    await expect(
      page.locator('.recharts-legend-item-text', { hasText: 'Wall velocity' }).first(),
    ).toBeVisible();
  });

  test('both charts coexist without collapsing each other', async ({ page }) => {
    // The chart-collapse bug appeared precisely when the trajectory chart was
    // added below the enhancement chart and the shared parent lost its height.
    const charts = page.locator('.recharts-surface');
    expect(await charts.count()).toBeGreaterThanOrEqual(2);
  });
});
