import { test, expect } from '../../src/fixtures/test';

test.describe('Accounts overview', () => {
  test.beforeEach(async ({ authenticated, dashboard }) => {
    void authenticated;
    await dashboard.goto();
  });

  test('lists checking, savings and credit card with German formatting', { tag: '@smoke' }, async ({ dashboard }) => {
    await expect(dashboard.accountCards).toHaveCount(3);
    await expect(dashboard.account('Girokonto').getByTestId('account-iban')).toHaveText('DE89 3704 0044 0532 0130 00');
    await expect(dashboard.account('Girokonto').getByTestId('account-balance')).toHaveText('3.250,75 €');
    await expect(dashboard.account('Visa Card').getByTestId('account-iban')).toHaveText('**** **** **** 4417');
  });

  test('negative credit card balance is highlighted', async ({ dashboard }) => {
    const balance = dashboard.account('Visa Card').getByTestId('account-balance');
    await expect(balance).toHaveText('-420,10 €');
    await expect(balance).toHaveCSS('color', 'rgb(198, 40, 40)');
  });

  test('UI balances match the accounts API', async ({ dashboard, bankApi, authenticated }) => {
    void authenticated;
    const api = await bankApi.accounts();
    for (const [name, id] of [['Girokonto', 'ACC-001'], ['Tagesgeld', 'ACC-002']] as const) {
      expect(await dashboard.balanceOf(name)).toBe(api.find((a) => a.id === id)!.balance);
    }
  });

  test('transactions are sorted newest first', async ({ dashboard, page }) => {
    const dates = await page.locator('[data-testid="tx-row"] td:first-child').allInnerTexts();
    expect(dates).toEqual([...dates].sort().reverse());
  });

  test('selecting an account switches the transaction list', async ({ dashboard }) => {
    await expect(dashboard.txCount).toHaveText('5 transaction(s)');
    await dashboard.selectAccount('Visa Card');
    await expect(dashboard.txCount).toHaveText('2 transaction(s)');
    await expect(dashboard.txRows.getByTestId('tx-description')).toHaveText(['Restaurant', 'Online Shop']);
  });

  test('category filter narrows transactions', async ({ dashboard }) => {
    await dashboard.filterCategory('INCOME');
    await expect(dashboard.txRows).toHaveCount(1);
    await expect(dashboard.txRows.first().getByTestId('tx-amount')).toHaveText('3.200,00 €');
  });
});
