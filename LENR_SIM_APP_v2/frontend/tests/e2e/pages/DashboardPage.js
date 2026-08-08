/**
 * Page object for the main dashboard hub (`/dashboard`).
 *
 * The hub used to be launcher-only: every simulation or theory run required
 * navigating away first. It now embeds a compact Theory Testbed card.
 */
export class DashboardPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  testbedHeading() {
    return this.page.getByRole('heading', { name: 'Theory Testbed', level: 5 });
  }

  runTheoriesButton() {
    return this.page.getByRole('button', { name: /run selected theories/i });
  }

  async runTheories() {
    await this.runTheoriesButton().click();
  }

  selectNoneButton() {
    return this.page.getByRole('button', { name: 'None' });
  }

  selectAllButton() {
    return this.page.getByRole('button', { name: 'All' });
  }

  theoryChip(name) {
    return this.page.getByRole('button', { name });
  }

  combinedEnhancement() {
    return this.page.getByText(/combined enhancement/i);
  }

  /** Notice that the pipeline total is not combinable with the bubble-lattice peak. */
  nonCombinableNotice() {
    return this.page.getByText(/not combinable/i);
  }

  advancedAnalysisLink() {
    return this.page.getByRole('link', { name: /view in advanced analysis/i });
  }

  fullTestbedLink() {
    return this.page.getByRole('link', { name: /full testbed/i });
  }
}
