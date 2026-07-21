import { test as base } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';

/**
 * Shared fixtures. Extend with more page objects as E2E coverage grows.
 */
export const test = base.extend({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
});

export { expect } from '@playwright/test';
