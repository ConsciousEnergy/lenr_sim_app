/**
 * Page object for the Unified Theory route (`/unified-theory`).
 * Prefer role/label-based locators for claim-tier / governance UI.
 */
export class UnifiedTheoryPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/unified-theory');
  }

  root() {
    return this.page.locator('#root');
  }

  governanceGlossaryButton() {
    return this.page.getByRole('button', { name: /open governance glossary/i });
  }

  claimTierHeading() {
    return this.page.getByText(/claim tiers/i);
  }

  exportJsonControl() {
    return this.page.getByRole('button', { name: /^json$/i });
  }

  runOrCalculateControl() {
    return this.page.getByRole('button', {
      name: /run physics simulation|calculating/i,
    });
  }

  reactionRateRegion() {
    return this.page.getByRole('region', { name: /reaction rate/i });
  }
}
