const { test, expect } = require('../helpers/coverage-fixture');
const FormHelpers = require('../helpers/form-helpers');

test.describe('Application smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('loads the application and provider selection', async ({ page }) => {
    await expect(page).toHaveTitle(/Platform Kit/i);
    await page.goto('/#/select-provider');
    await expect(page.locator('.provider-option')).toHaveCount(3);
    await expect(page.locator('#app-content')).toBeVisible();
  });

  test('resets saved configuration', async ({ page }) => {
    await FormHelpers.selectProvider(page, 'aws');
    await page.locator('[name="project_prefix"]').fill('reset-check');

    await page.goto('/#/reset');
    await expect(page).toHaveURL(/.*#\/select-provider/);
    await FormHelpers.selectProvider(page, 'aws');
    await expect(page.locator('[name="project_prefix"]')).toHaveValue('');
  });

  test('keeps the provider selection usable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/#/select-provider');
    await expect(page.locator('.navbar')).toBeVisible();
    await expect(page.locator('.provider-option')).toHaveCount(3);
    await expect(page.locator('#app-content')).toBeVisible();
  });
});
