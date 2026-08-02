import { test, expect } from './fixtures.js';

/**
 * Ship-readiness E2E for Unified Theory:
 * - route mounts
 * - governance glossary / claim-tier affordances present
 * - export control reachable after UI settles
 *
 * Backend-dependent simulation assertions are soft: if the API at :8010 is
 * unavailable the shell still must expose governance UI without crashing.
 */
test.describe('unified theory ship flows', () => {
  test('loads unified theory and exposes governance glossary', async ({
    unifiedTheoryPage,
  }) => {
    await unifiedTheoryPage.goto();
    await expect(unifiedTheoryPage.root()).not.toBeEmpty();
    await expect(unifiedTheoryPage.page).toHaveURL(/unified-theory/);

    const glossary = unifiedTheoryPage.governanceGlossaryButton();
    await expect(glossary.first()).toBeVisible({ timeout: 15_000 });
    await glossary.first().click();
    await expect(unifiedTheoryPage.claimTierHeading().first()).toBeVisible({
      timeout: 10_000,
    });
  });

  test('run and export controls are present on the page', async ({
    unifiedTheoryPage,
  }) => {
    await unifiedTheoryPage.goto();
    await expect(unifiedTheoryPage.root()).not.toBeEmpty();

    const run = unifiedTheoryPage.runOrCalculateControl();
    await expect(run.first()).toBeVisible({ timeout: 20_000 });

    const exportCtl = unifiedTheoryPage.exportJsonControl();
    await expect(exportCtl.first()).toBeVisible({ timeout: 10_000 });
    // JSON export stays disabled until a simulation has results — that is expected.
    await expect(exportCtl.first()).toBeDisabled();
  });
});
