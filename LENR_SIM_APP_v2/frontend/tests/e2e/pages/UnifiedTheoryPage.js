/**
 * Page object for the Unified Theory route, which also hosts the Theory Testbed.
 *
 * "Theory Testbed" is not a route of its own - it is tab index 4 of
 * /unified-theory, reachable directly via ?tab=testbed. The page has two
 * independent run actions that fill different data sources, which is the crux of
 * the navigation loop this spec suite guards:
 *   - "Run Physics Simulation" -> simulationResult  (Bubble Collapse tab)
 *   - "Run Selected Theories"  -> theoryResult      (Theory Summary tab)
 */
export class UnifiedTheoryPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/unified-theory');
  }

  async gotoTestbed() {
    await this.page.goto('/unified-theory?tab=testbed');
  }

  /** Fills simulationResult. Does NOT populate the Theory Summary tab. */
  runSimulationButton() {
    return this.page.getByRole('button', {
      name: /run physics simulation|calculating/i,
    });
  }

  /** Fills theoryResult, which is what the Theory Summary tab reads. */
  runTheoriesButton() {
    return this.page.getByRole('button', {
      name: /run selected theories|run coupled pipeline/i,
    });
  }

  /** Appears only after theories have run; closes the round trip. */
  viewInAdvancedAnalysisLink() {
    return this.page.getByRole('link', { name: /view in advanced analysis/i });
  }

  async runTheories() {
    await this.runTheoriesButton().click();
  }

  tab(name) {
    return this.page.getByRole('tab', { name });
  }

  async openEnhancementTimeline() {
    await this.tab(/enhancement timeline/i).click();
  }

  async openResults() {
    await this.tab(/^results$/i).click();
  }

  /**
   * Legend entry of the enhancement chart. Recharts renders nothing at all when
   * its container resolves to zero height, so asserting a legend label is what
   * catches a silently collapsed chart.
   */
  enhancementLegendEntry(name) {
    return this.page.getByText(name, { exact: true });
  }

  collapseTrajectoryHeading() {
    return this.page.getByText(/integrated collapse trajectory/i);
  }

  saturationBanner() {
    return this.page.getByText(/samples exceed the/i);
  }

  /** Collapsible summary of group winners and excluded overlapping theories. */
  compositionSummary() {
    return this.page.getByText(/how this was composed/i);
  }

  excludedOverlapNotice() {
    return this.page.getByText(/excluded as overlapping alternatives/i);
  }

  /**
   * Full inventory of registered modules, fed from /api/physics/theories.
   * MUI wraps an AccordionSummary in its own heading element, so target the
   * expandable control rather than the heading to stay unambiguous.
   */
  registeredModulesSection() {
    return this.page.getByRole('button', { name: /registered theory modules/i });
  }
}
