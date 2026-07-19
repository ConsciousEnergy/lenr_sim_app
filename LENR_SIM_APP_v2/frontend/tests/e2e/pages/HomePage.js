/**
 * Page object for the application shell / landing route.
 *
 * Page objects encapsulate navigation and locators so specs stay declarative.
 * Prefer role/label/text-based locators over CSS selectors.
 */
export class HomePage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/');
  }

  root() {
    return this.page.locator('#root');
  }
}
