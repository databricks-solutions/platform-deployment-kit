/**
 * Navigation helper functions for E2E tests
 */

class NavigationHelpers {
  /**
   * Navigate to a specific route
   */
  static async navigateTo(page, route) {
    await page.goto(`/#${route}`);
    await page.waitForLoadState('domcontentloaded');
  }

  /**
   * Navigate back using back button
   */
  static async navigateBack(page) {
    const backButton = page.locator('a[data-navigate]:has-text("Back")').first();
    if (await backButton.isVisible()) {
      await backButton.click();
      await page.waitForLoadState('domcontentloaded');
    }
  }

  /**
   * Reset the application
   */
  static async reset(page) {
    await page.goto('/#/reset');
    await page.waitForLoadState('domcontentloaded');
  }

  /**
   * Get current route from hash
   */
  static async getCurrentRoute(page) {
    return await page.evaluate(() => {
      return window.location.hash.replace('#', '') || '/';
    });
  }

  /**
   * Wait for route to change
   */
  static async waitForRoute(page, expectedRoute, timeout = 5000) {
    await page.waitForFunction(
      (route) => {
        const currentRoute = window.location.hash.replace('#', '') || '/';
        return currentRoute === route;
      },
      expectedRoute,
      { timeout }
    );
  }

  /**
   * Check if progress indicator shows correct step
   */
  static async getProgressStep(page) {
    const progressBar = page.locator('#progress-bar');
    if (await progressBar.isVisible()) {
      const width = await progressBar.evaluate((el) => {
        return parseFloat(el.style.width) || 0;
      });
      
      // Calculate step from width (0%, 33%, 66%, 100%)
      if (width < 20) return 0;
      if (width < 40) return 1;
      if (width < 70) return 2;
      return 3;
    }
    return 0;
  }
}

module.exports = NavigationHelpers;
