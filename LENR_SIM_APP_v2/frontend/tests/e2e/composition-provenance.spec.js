import { test, expect } from './fixtures.js';

/**
 * Composition provenance and honest coverage.
 *
 * The backend has always returned `composition_provenance` (group winners,
 * theories excluded as overlapping alternatives, the combination rule) and
 * nothing rendered it, so a user could not tell that only one theory per group
 * contributes to the combined enhancement.
 *
 * The documentation panel separately described six mechanisms while the pipeline
 * registers many more, implying the six were the whole framework.
 */

const THEORY_LIST_RESPONSE = [
  {
    theory_id: 'coherent_qed',
    theory_name: 'Coherent QED',
    description: 'Del Giudice coherence domains',
    configurable_parameters: {},
    references: [],
    category: 'mechanism',
  },
  {
    theory_id: 'kim_bec',
    theory_name: 'Kim BEC',
    description: 'Nano-grain Bose-Einstein condensate',
    configurable_parameters: {},
    references: [],
    category: 'mechanism',
  },
  {
    theory_id: 'stellar_scaling_mhd',
    theory_name: 'Stellar Scaling MHD',
    description: 'Cross-regime astrophysical comparison line',
    configurable_parameters: {},
    references: [],
    category: 'context_line',
  },
];

/**
 * Two coherence rivals were enabled, so exactly one may contribute and the other
 * must be reported as excluded.
 */
const THEORY_RUN_RESPONSE = {
  contract_version: 'v0.3.9-beta-science-gate-1',
  combined_enhancement: 4200.0,
  combined_reaction_rate_modifier: 1.0,
  total_energy_watts: 0.2,
  conditions: { temperature: 300 },
  enabled_theories: ['coherent_qed', 'kim_bec'],
  composition_provenance: {
    combination_rule: 'grouped_max_confidence_product',
    applied_groups: [
      {
        group: 'coherence',
        selected_theory: 'coherent_qed',
        rule: 'max(enhancement_factor * confidence)',
        candidates: ['coherent_qed', 'kim_bec'],
      },
    ],
    excluded_theories: [
      { theory_id: 'kim_bec', group: 'coherence', excluded_by: 'coherent_qed' },
    ],
    ungrouped_theories: [],
    not_combinable_with: ['bubble_lattice.peak_conditions.enhancement_factor'],
    note:
      'combined_enhancement is the product of one winner per composition group. '
      + 'It is a separate engine from the bubble-lattice mechanism product; the two '
      + 'must never be multiplied.',
  },
  per_theory: [
    {
      theory_id: 'coherent_qed',
      theory_name: 'Coherent QED',
      is_applicable: true,
      confidence: 0.7,
      claim_tier: 'speculative_exploratory',
      enhancement_factor: 4200.0,
      energy_output_watts: 0.2,
      observables: {},
      references: [],
      provenance: { composition_group: 'coherence', composition_status: 'applied' },
    },
    {
      theory_id: 'kim_bec',
      theory_name: 'Kim BEC',
      is_applicable: true,
      confidence: 0.5,
      claim_tier: 'speculative_exploratory',
      enhancement_factor: 900.0,
      energy_output_watts: 0.05,
      observables: {},
      references: [],
      provenance: {
        composition_group: 'coherence',
        composition_status: 'excluded_overlap',
      },
    },
  ],
};

async function stubTheoryApi(page) {
  await page.route('**/api/physics/theories', async (route) => {
    await route.fulfill({ json: THEORY_LIST_RESPONSE });
  });
  await page.route('**/api/physics/theories/run', async (route) => {
    await route.fulfill({ json: THEORY_RUN_RESPONSE });
  });
}

test.describe('Composition provenance', () => {
  test.beforeEach(async ({ page }) => {
    await stubTheoryApi(page);
  });

  test('shows how the combined enhancement was composed', async ({
    unifiedTheoryPage,
  }) => {
    await unifiedTheoryPage.gotoTestbed();
    await unifiedTheoryPage.runTheories();

    await expect(unifiedTheoryPage.compositionSummary()).toBeVisible();
  });

  test('names the theory excluded as an overlapping alternative', async ({
    page,
    unifiedTheoryPage,
  }) => {
    await unifiedTheoryPage.gotoTestbed();
    await unifiedTheoryPage.runTheories();

    await unifiedTheoryPage.compositionSummary().click();

    await expect(unifiedTheoryPage.excludedOverlapNotice()).toBeVisible();
    // Without this, enabling both rivals looked like both contributed.
    await expect(page.getByText(/kim bec — superseded by coherent qed/i)).toBeVisible();
  });

  test('states the combination rule', async ({ page, unifiedTheoryPage }) => {
    await unifiedTheoryPage.gotoTestbed();
    await unifiedTheoryPage.runTheories();
    await unifiedTheoryPage.compositionSummary().click();

    await expect(page.getByText(/grouped max confidence product/i)).toBeVisible();
  });

  test('warns that the pipeline total is a separate engine', async ({
    page,
    unifiedTheoryPage,
  }) => {
    await unifiedTheoryPage.gotoTestbed();
    await unifiedTheoryPage.runTheories();
    await unifiedTheoryPage.compositionSummary().click();

    await expect(page.getByText(/must never be multiplied/i)).toBeVisible();
  });
});

test.describe('Documentation coverage honesty', () => {
  test.beforeEach(async ({ page }) => {
    await stubTheoryApi(page);
  });

  test('lists every registered module, not just the curated six', async ({
    page,
    unifiedTheoryPage,
  }) => {
    await unifiedTheoryPage.goto();
    await page.getByRole('tab', { name: /^theory$/i }).click();

    const section = unifiedTheoryPage.registeredModulesSection();
    await expect(section).toBeVisible();
    await section.click();

    // Including the cross-regime context track, which the curated sections omit.
    await expect(page.getByText('Stellar Scaling MHD')).toBeVisible();
  });

  test('does not claim every documented equation is implemented', async ({
    page,
    unifiedTheoryPage,
  }) => {
    await unifiedTheoryPage.goto();
    await page.getByRole('tab', { name: /^theory$/i }).click();

    await expect(
      page.getByText(/phenomenological multipliers rather than literal ports/i),
    ).toBeVisible();
  });
});
