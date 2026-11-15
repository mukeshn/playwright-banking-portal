import { test, expect } from '../../src/fixtures/test';

// The portal logs customers out after 5 minutes of inactivity and warns
// 60 seconds before. Playwright's clock API lets us test this in milliseconds.
test.describe('Session idle timeout', { tag: '@security' }, () => {
  test.beforeEach(async ({ page, authenticated, dashboard }) => {
    void authenticated;
    await page.clock.install();
    await dashboard.goto();
  });

  test('no warning before 4 minutes of inactivity', async ({ page }) => {
    await page.clock.fastForward('03:50');
    await expect(page.getByTestId('timeout-warning')).toBeHidden();
  });

  test('warning appears one minute before logout with a countdown', async ({ page }) => {
    await page.clock.fastForward('04:05');
    const dialog = page.getByTestId('timeout-warning');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId('timeout-countdown')).toHaveText(/^(5[0-9]|60)$/);
  });

  test('"Stay logged in" resets the timer', async ({ page }) => {
    await page.clock.fastForward('04:10');
    await page.getByRole('button', { name: 'Stay logged in' }).click();
    await expect(page.getByTestId('timeout-warning')).toBeHidden();
    await page.clock.fastForward('03:30');
    await expect(page.getByTestId('timeout-warning')).toBeHidden();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('customer is logged out after 5 minutes', async ({ page, loginPage }) => {
    await page.clock.fastForward('05:01');
    await expect(page).toHaveURL(/login\.html\?reason=timeout/);
    await expect(loginPage.info).toHaveText('You were logged out due to inactivity.');
    expect(await page.evaluate(() => sessionStorage.getItem('nb.token'))).toBeNull();
  });

  test('user activity keeps the session alive', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await page.clock.fastForward('03:00');
      await page.getByLabel('Category').press('ArrowDown');
    }
    await expect(page.getByTestId('timeout-warning')).toBeHidden();
    await expect(page).toHaveURL(/dashboard/);
  });
});
