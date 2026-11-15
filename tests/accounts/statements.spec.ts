import { readFile } from 'node:fs/promises';
import { test, expect } from '../../src/fixtures/test';

test.describe('Account statements', () => {
  test.beforeEach(async ({ authenticated, dashboard }) => {
    void authenticated;
    await dashboard.goto();
  });

  test('CSV statement download contains every transaction', async ({ dashboard }) => {
    const downloadPromise = dashboard.page.waitForEvent('download');
    await dashboard.downloadStatement.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('statement-ACC-001-2026-11.csv');
    const csv = await readFile(await download.path(), 'utf8');
    const [header, ...rows] = csv.trim().split('\n');
    expect(header).toBe('date;description;category;amount');
    expect(rows).toHaveLength(5);
    expect(rows).toContain('2026-11-02;Salary November;INCOME;3200.00');

    const sum = rows.reduce((s, r) => s + Number(r.split(';')[3]), 0);
    expect(sum).toBeCloseTo(1823.73, 2);
  });

  test('printable statement opens in a new tab', async ({ dashboard, context }) => {
    await dashboard.selectAccount('Tagesgeld');
    const [popup] = await Promise.all([context.waitForEvent('page'), dashboard.openStatement.click()]);
    await popup.waitForLoadState();
    await expect(popup).toHaveURL(/statement\.html\?account=ACC-002/);
    await expect(popup.getByTestId('statement-title')).toHaveText('Account statement - Tagesgeld');
    await expect(popup.getByTestId('closing-balance')).toHaveText('12.500,00 €');
    await popup.close();
    await expect(dashboard.accountCards).toHaveCount(3);
  });
});
