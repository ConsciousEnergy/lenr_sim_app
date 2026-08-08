import { test as base } from '@playwright/test';
import { HomePage } from './pages/HomePage.js';
import { UnifiedTheoryPage } from './pages/UnifiedTheoryPage.js';
import { AdvancedAnalysisPage } from './pages/AdvancedAnalysisPage.js';

/**
 * Shared fixtures. Extend with more page objects as E2E coverage grows.
 */
export const test = base.extend({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  unifiedTheoryPage: async ({ page }, use) => {
    await use(new UnifiedTheoryPage(page));
  },
  advancedAnalysisPage: async ({ page }, use) => {
    await use(new AdvancedAnalysisPage(page));
  },
});

export { expect } from '@playwright/test';
