const { test, expect } = require('../helpers/coverage-fixture');
const FormHelpers = require('../helpers/form-helpers');

test.describe('Contextual configuration help', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => localStorage.clear());
  });

  test('shows AWS Back-end PrivateLink guidance and restores focus', async ({ page }) => {
    await FormHelpers.selectProvider(page, 'aws');
    const projectPrefix = page.locator('[name="project_prefix"]');
    await projectPrefix.fill('help-check');

    const trigger = page.locator('[data-help-topic="backend-private-link"]');
    await trigger.click();

    const drawer = page.locator('#contextHelpDrawer');
    await expect(drawer).toBeVisible();
    await expect(page.locator('#contextHelpProvider')).toHaveText('AWS guidance');
    await expect(page.locator('#contextHelpTitle')).toHaveText('Back-end PrivateLink');
    await expect(page.locator('#contextHelpBody')).toContainText('This is not front-end PrivateLink');

    const docsLink = drawer.getByRole('link', { name: 'AWS PrivateLink for classic compute' });
    await expect(docsLink).toHaveAttribute('target', '_blank');
    await expect(docsLink).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(docsLink).toHaveAttribute('href', 'https://docs.databricks.com/aws/en/security/network/classic/privatelink');

    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(projectPrefix).toHaveValue('help-check');
  });

  test('uses Azure-specific help for networking choices', async ({ page }) => {
    await FormHelpers.selectProvider(page, 'azure');

    await page.locator('[data-help-topic="network-mode"]').click();
    await expect(page.locator('#contextHelpTitle')).toHaveText('New or existing VNet');
    await expect(page.locator('#contextHelpBody')).toContainText('delegated Databricks subnets');
    await expect(page.locator('#contextHelpBody').getByRole('link', {
      name: 'Deploy Azure Databricks in a customer-managed VNet'
    })).toHaveAttribute('href', 'https://learn.microsoft.com/en-us/azure/databricks/security/network/classic/vnet-inject');

    await page.keyboard.press('Escape');
    await page.locator('[data-help-topic="nat-placement"]').first().click();
    await expect(page.locator('#contextHelpTitle')).toHaveText('NAT gateway placement');
    await expect(page.locator('#contextHelpBody')).toContainText('Regional placement');
  });

  test('shows GCP identity and subnet guidance on mobile in light mode', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await FormHelpers.selectProvider(page, 'gcp');
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    });

    await page.locator('[data-help-topic="gcp-service-account"]').click();
    const drawer = page.locator('#contextHelpDrawer');
    await expect(drawer).toBeVisible();
    await expect(page.locator('#contextHelpProvider')).toHaveText('GCP guidance');
    await expect(page.locator('#contextHelpTitle')).toHaveText('Google service account');
    await expect(page.locator('#contextHelpBody')).toContainText('Service Account Token Creator');

    const dimensions = await drawer.evaluate(element => ({
      width: element.getBoundingClientRect().width,
      viewport: window.innerWidth,
      background: getComputedStyle(element).backgroundColor
    }));
    expect(dimensions.width).toBeLessThan(dimensions.viewport);
    expect(dimensions.width).toBeGreaterThan(300);
    expect(dimensions.background).not.toBe('rgba(0, 0, 0, 0)');

    await page.keyboard.press('Escape');
    await page.locator('[data-help-topic="subnet-sizing"]').click();
    await expect(page.locator('#contextHelpTitle')).toHaveText('Databricks subnet CIDR');
    await expect(page.locator('#contextHelpBody')).toContainText('Cloud NAT');
  });
});
