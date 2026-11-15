import { test, expect } from '../../src/fixtures/test';
import { CUSTOMERS } from '../../src/api/BankApi';

test.describe('Two-step login (password + SMS code)', () => {
  test.beforeEach(async ({ loginPage }) => loginPage.goto());

  test('customer logs in with password and OTP', { tag: '@smoke' }, async ({ page, loginPage, bankApi, dashboard }) => {
    await loginPage.enterCredentials(CUSTOMERS.julia.username, CUSTOMERS.julia.password);
    await expect(page.getByTestId('masked-phone')).toHaveText('+49 *** ****21');
    await loginPage.enterOtp(await bankApi.sandboxOtp());
    await expect(page).toHaveURL(/dashboard\.html/);
    await expect(dashboard.welcome).toHaveText(CUSTOMERS.julia.name);
  });

  test('wrong password does not reveal whether the user exists', async ({ loginPage }) => {
    await loginPage.enterCredentials(CUSTOMERS.julia.username, 'wrong');
    await expect(loginPage.loginError).toHaveText('Username or password is incorrect.');
    await loginPage.enterCredentials('no.such.user', 'wrong');
    await expect(loginPage.loginError).toHaveText('Username or password is incorrect.');
  });

  test('blocked customer is told to call the hotline', async ({ loginPage }) => {
    await loginPage.enterCredentials(CUSTOMERS.blocked.username, CUSTOMERS.blocked.password);
    await expect(loginPage.loginError).toContainText('access is blocked');
  });

  test('wrong OTP shows remaining attempts', async ({ loginPage }) => {
    await loginPage.enterCredentials(CUSTOMERS.julia.username, CUSTOMERS.julia.password);
    await loginPage.enterOtp('000000');
    await expect(loginPage.otpError).toHaveText('The code is incorrect. 2 attempts left.');
    await loginPage.enterOtp('111111');
    await expect(loginPage.otpError).toHaveText('The code is incorrect. 1 attempts left.');
  });

  test('third wrong OTP ends the login attempt', { tag: '@security' }, async ({ loginPage }) => {
    await loginPage.enterCredentials(CUSTOMERS.julia.username, CUSTOMERS.julia.password);
    for (const code of ['000001', '000002', '000003']) await loginPage.enterOtp(code);
    await expect(loginPage.otpError).toHaveText('Too many attempts. Please log in again.');
    await expect(loginPage.username).toBeVisible();
  });

  test('empty credentials are validated client-side', async ({ page, loginPage }) => {
    let calls = 0;
    page.on('request', (r) => r.url().includes('/auth/login') && calls++);
    await loginPage.continue.click();
    await expect(loginPage.loginError).toHaveText('Please enter username and password.');
    expect(calls).toBe(0);
  });

  test('protected pages redirect to login without a session', async ({ page }) => {
    for (const path of ['/bank/dashboard.html', '/bank/transfer.html', '/bank/loan.html']) {
      await page.goto(path);
      await expect(page).toHaveURL(/login\.html/);
    }
  });
});

test.describe('Logout', () => {
  test('logout invalidates the token on the server', { tag: '@security' }, async ({ page, loginPage, bankApi, request }) => {
    await loginPage.goto();
    await loginPage.enterCredentials(CUSTOMERS.max.username, CUSTOMERS.max.password);
    await loginPage.enterOtp(await bankApi.sandboxOtp());
    await expect(page.getByTestId('welcome-name')).toHaveText(CUSTOMERS.max.name);
    const token = await page.evaluate(() => sessionStorage.getItem('nb.token'));
    await page.getByTestId('logout').click();
    await expect(loginPage.info).toHaveText('You have been logged out securely.');
    const res = await request.get('/api/bank/accounts', { headers: { authorization: `Bearer ${token}` } });
    expect(res.status()).toBe(401);
  });
});
