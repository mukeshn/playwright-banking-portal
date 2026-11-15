import { test, expect } from '../../src/fixtures/test';
import { annuity, euro } from '../../src/utils/money';

const quotes = [
  { amount: 5000, term: 12, rate: 5.99 },
  { amount: 10000, term: 36, rate: 5.99 },
  { amount: 25000, term: 60, rate: 4.49 },
  { amount: 50000, term: 84, rate: 6.75 },
  { amount: 8000, term: 24, rate: 0 },
];

test.describe('Personal loan calculator', () => {
  test.beforeEach(async ({ page, authenticated }) => {
    void authenticated;
    await page.goto('/bank/loan.html');
  });

  for (const q of quotes) {
    test(`${q.amount} € over ${q.term} months at ${q.rate}%`, async ({ page }) => {
      await page.getByLabel('Loan amount (EUR)').fill(String(q.amount));
      await page.getByLabel('Term').selectOption(String(q.term));
      await page.getByLabel('Annual rate (%)').fill(String(q.rate));
      await page.getByRole('button', { name: 'Calculate' }).click();

      const expected = annuity(q.amount, q.term, q.rate);
      await expect(page.getByTestId('monthly-payment')).toHaveText(euro(expected));
      const total = Number((expected * q.term).toFixed(2));
      await expect(page.getByTestId('total-repayment')).toHaveText(euro(total));
    });
  }

  test('amount outside 1.000 - 100.000 € is rejected', async ({ page }) => {
    await page.getByLabel('Loan amount (EUR)').fill('500');
    await page.getByRole('button', { name: 'Calculate' }).click();
    await expect(page.getByTestId('loan-error')).toHaveText('amount must be between 1000 and 100000');
    await expect(page.getByTestId('loan-result')).toBeHidden();
  });
});
