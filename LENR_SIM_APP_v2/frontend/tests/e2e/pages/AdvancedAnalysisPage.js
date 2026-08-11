/**
 * Page object for the Advanced Physics Analysis route.
 *
 * The page has four tabs fed by two independent data sources. Bubble Collapse
 * reads the bubble-lattice simulation; Theory Summary reads the theory pipeline.
 */
export class AdvancedAnalysisPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/advanced-analysis');
  }

  tab(name) {
    return this.page.getByRole('tab', { name });
  }

  async openTheorySummary() {
    await this.tab(/theory summary/i).click();
  }

  async openBubbleCollapse() {
    await this.tab(/bubble collapse/i).click();
  }

  theorySummaryEmptyState() {
    return this.page.getByText(/no per-theory analysis data available/i);
  }

  goToTestbedButton() {
    return this.page.getByRole('link', { name: /go to theory testbed/i });
  }

  /** Banner shown when simulation data exists but theory data does not. */
  missingTheoryDataNotice() {
    return this.page.getByText(/theory summary and the per-theory observables stay/i);
  }

  /** Warning that some mechanisms were clamped to the display ceiling. */
  saturationNotice() {
    return this.page.getByText(/claim-tier display ceiling/i);
  }

  /** Per-mechanism uncapped magnitude annotations, e.g. "raw ~ 10^12.0". */
  rawMagnitudeAnnotations() {
    return this.page.getByText(/raw ≈ 10\^/);
  }

  enhancementBreakdownHeading() {
    return this.page.getByText('Enhancement Breakdown', { exact: true });
  }
}
