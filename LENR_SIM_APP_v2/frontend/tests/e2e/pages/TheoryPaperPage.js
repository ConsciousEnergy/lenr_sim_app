/**
 * Page object for /theory-paper (Unified Theory manuscript view).
 */
export class TheoryPaperPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/theory-paper');
  }

  scienceEvidenceHeading() {
    return this.page.getByText(
      '5B. Science Evidence (Campaign, Ranking, Formalization)',
    );
  }

  async openScienceEvidence() {
    await this.scienceEvidenceHeading().click();
  }

  scienceEvidencePanel() {
    return this.page.getByTestId('theory-paper-science-evidence');
  }

  lenrProvedChip() {
    return this.page.getByTestId('science-evidence-lenr-proved');
  }

  campaignHeading() {
    return this.page.getByTestId('science-evidence-campaign');
  }

  avenueRankingHeading() {
    return this.page.getByTestId('science-evidence-avenue-ranking');
  }

  formalizationHeading() {
    return this.page.getByTestId('science-evidence-formalization');
  }

  eqOpenRunwayHeading() {
    return this.page.getByTestId('science-evidence-eq-open-runway');
  }
}
