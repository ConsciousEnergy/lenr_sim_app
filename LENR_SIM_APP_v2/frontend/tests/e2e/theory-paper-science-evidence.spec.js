import { test, expect } from './fixtures.js';

/**
 * Phase E: Theory Paper surfaces campaign / ranking / Lean / EQ-OPEN runway
 * with explicit non-proof honesty (lenr_proved false; EQ-OPEN stay OPEN).
 */
test.describe('Theory Paper science evidence', () => {
  test('section 5B shows campaign, ranking, formalization, and OPEN runway', async ({
    theoryPaperPage,
  }) => {
    await theoryPaperPage.goto();
    await expect(
      theoryPaperPage.page.getByText(
        /A Unified Theoretical and Mathematical Framework/i,
      ),
    ).toBeVisible();

    await theoryPaperPage.openScienceEvidence();

    const panel = theoryPaperPage.scienceEvidencePanel();
    await expect(panel).toBeVisible();
    await expect(theoryPaperPage.lenrProvedChip()).toHaveText(/lenr_proved: false/);
    await expect(theoryPaperPage.campaignHeading()).toBeVisible();
    await expect(panel.getByText('cavitation_collapse', { exact: true })).toBeVisible();
    await expect(theoryPaperPage.avenueRankingHeading()).toBeVisible();
    await expect(
      panel.getByText(/not a Bayesian posterior that LENR is proved/i),
    ).toBeVisible();
    await expect(theoryPaperPage.formalizationHeading()).toBeVisible();
    await expect(panel.getByText(/Bounds ≠ empirical closure/i)).toBeVisible();
    await expect(theoryPaperPage.eqOpenRunwayHeading()).toBeVisible();
    await expect(
      panel.getByText(/all listed obligations remain OPEN/i),
    ).toBeVisible();
    await expect(panel.getByText('EQ-OPEN-MEV-01: OPEN').first()).toBeVisible();
    await expect(panel.getByText(/lenr_proved:\s*true/i)).toHaveCount(0);
  });
});
