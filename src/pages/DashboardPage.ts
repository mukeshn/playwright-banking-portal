import { type Locator, type Page, expect } from '@playwright/test';
import { parseEuro } from '../utils/money';

export class DashboardPage {
  readonly welcome: Locator;
  readonly accountCards: Locator;
  readonly txRows: Locator;
  readonly txCount: Locator;
  readonly categoryFilter: Locator;
  readonly downloadStatement: Locator;
  readonly openStatement: Locator;
  readonly logout: Locator;

  constructor(readonly page: Page) {
    this.welcome = page.getByTestId('welcome-name');
    this.accountCards = page.getByTestId('account-card');
    this.txRows = page.getByTestId('tx-row');
    this.txCount = page.getByTestId('tx-count');
    this.categoryFilter = page.getByLabel('Category');
    this.downloadStatement = page.getByRole('button', { name: 'Download CSV statement' });
    this.openStatement = page.getByRole('button', { name: 'Open printable statement' });
    this.logout = page.getByTestId('logout');
  }

  async goto() {
    await this.page.goto('/bank/dashboard.html');
    await expect(this.accountCards.first()).toBeVisible();
  }

  account(name: string) {
    return this.accountCards.filter({ has: this.page.getByRole('heading', { name, exact: true }) });
  }

  async balanceOf(name: string): Promise<number> {
    return parseEuro(await this.account(name).getByTestId('account-balance').innerText());
  }

  async selectAccount(name: string) {
    const tx = this.page.waitForResponse(/\/transactions/);
    await this.account(name).click();
    await tx;
  }

  async filterCategory(category: string) {
    const tx = this.page.waitForResponse(/\/transactions/);
    await this.categoryFilter.selectOption(category);
    await tx;
  }
}
