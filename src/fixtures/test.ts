import { test as base, expect } from '@playwright/test';
import { BankApi, CUSTOMERS } from '../api/BankApi';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TransferPage } from '../pages/TransferPage';

type Fixtures = {
  bankApi: BankApi;
  loginPage: LoginPage;
  dashboard: DashboardPage;
  transferPage: TransferPage;
  /**
   * Logs in through the API and injects the token into sessionStorage before
   * any page script runs. storageState() does not capture sessionStorage, so
   * this is how we skip the two-step UI login in most tests.
   */
  authenticated: { token: string; name: string };
};

export const test = base.extend<Fixtures>({
  bankApi: async ({ request }, use) => use(new BankApi(request)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  dashboard: async ({ page }, use) => use(new DashboardPage(page)),
  transferPage: async ({ page }, use) => use(new TransferPage(page)),
  authenticated: async ({ page, bankApi }, use) => {
    const session = await bankApi.login(CUSTOMERS.julia);
    await page.addInitScript(({ token, name }) => {
      if (location.pathname.endsWith('/login.html')) return; // let logout/timeout flows clear the session
      sessionStorage.setItem('nb.token', token);
      sessionStorage.setItem('nb.name', name);
    }, { token: session.accessToken, name: session.customer.name });
    await use({ token: session.accessToken, name: session.customer.name });
  },
});

export { expect };
