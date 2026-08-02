/**
 * Page object for Analytics (`/analytics`).
 */
export class AnalyticsPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/analytics');
  }

  root() {
    return this.page.locator('#root');
  }

  viewDetailsControl() {
    return this.page.getByRole('button', { name: /view details/i }).or(
      this.page.getByText(/view details/i)
    );
  }
}
