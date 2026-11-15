import { test, expect } from '../../src/fixtures/test';
import { corrupt, formatIban, germanIban, randomGermanIban } from '../../src/utils/iban';
import { euro } from '../../src/utils/money';

test.describe('SEPA transfer', () => {
  test.beforeEach(async ({ authenticated, transferPage }) => {
    void authenticated;
    await transferPage.goto();
  });

  test('successful transfer debits the account', { tag: ['@smoke', '@money-movement'] }, async ({ page, transferPage, dashboard }) => {
    const iban = randomGermanIban();
    await transferPage.submit({ beneficiary: 'Stadtwerke Augsburg', iban, amount: '125,40', reference: 'Abschlag Nov' });

    await expect(transferPage.success).toHaveText('125,40 € sent to Stadtwerke Augsburg.');
    await expect(transferPage.transferId).toHaveText(/^TRF-[A-Z0-9]{8}$/);
    await expect(transferPage.status).toHaveText('EXECUTED');

    await page.getByRole('link', { name: 'Back to accounts' }).click();
    await expect(dashboard.account('Girokonto').getByTestId('account-balance')).toHaveText(euro(3250.75 - 125.4));
    await expect(dashboard.txRows.first().getByTestId('tx-description')).toHaveText('Transfer to Stadtwerke Augsburg');
  });

  test('review step shows formatted data and allows editing', async ({ page, transferPage }) => {
    const iban = germanIban('37040044', '0532013001');
    await transferPage.fill({ beneficiary: 'Anna Huber', iban, amount: '1.500,00' });
    await transferPage.review.click();
    await expect(page.getByTestId('review-iban')).toHaveText(formatIban(iban));
    await expect(page.getByTestId('review-amount')).toHaveText('1.500,00 €');
    await transferPage.edit.click();
    await expect(transferPage.amount).toHaveValue('1.500,00');
  });

  test('IBAN is normalised and the bank code is shown', async ({ transferPage }) => {
    await transferPage.fill({ beneficiary: 'Test', iban: ' de89370400440532013000 ', amount: '1' });
    await expect(transferPage.iban).toHaveValue('DE89 3704 0044 0532 0130 00');
    await expect(transferPage.ibanHint).toHaveText('Bank code (BLZ): 37040044');
  });

  test('IBAN with a wrong checksum is rejected', async ({ transferPage }) => {
    await transferPage.fill({ beneficiary: 'Test', iban: corrupt(randomGermanIban()), amount: '10' });
    await expect(transferPage.fieldError('iban')).toHaveText('Please check the IBAN.');
    await transferPage.review.click();
    await transferPage.confirm.click();
    await expect(transferPage.formError).toBeVisible();
    await expect(transferPage.fieldError('iban')).toHaveText('IBAN is invalid');
  });

  test('required fields are validated before review', async ({ transferPage }) => {
    await transferPage.review.click();
    await expect(transferPage.fieldError('beneficiaryName')).toHaveText('Please enter the beneficiary name.');
    await expect(transferPage.fieldError('iban')).toHaveText('Please enter an IBAN.');
    await expect(transferPage.fieldError('amount')).toHaveText('Please enter an amount greater than 0.');
  });

  test('insufficient funds', { tag: '@money-movement' }, async ({ transferPage }) => {
    await transferPage.submit({ beneficiary: 'Car dealer', iban: randomGermanIban(), amount: '4.000,00' });
    await expect(transferPage.formError).toHaveText('Insufficient funds for this transfer.');
  });

  test('daily limit of 5.000 € across several transfers', { tag: '@money-movement' }, async ({ page, transferPage }) => {
    await transferPage.submit({ from: 'Tagesgeld', beneficiary: 'Notar Weber', iban: randomGermanIban(), amount: '4.200,00' });
    await expect(transferPage.status).toHaveText('EXECUTED');

    await transferPage.goto();
    await transferPage.submit({ from: 'Tagesgeld', beneficiary: 'Notar Weber', iban: randomGermanIban(), amount: '900,00' });
    await expect(transferPage.formError).toHaveText('This transfer exceeds your daily limit. Remaining today: 800,00 €.');
    await expect(page.getByTestId('transfer-form')).toBeVisible();
  });

  test('future execution date schedules the transfer without debiting', async ({ transferPage, bankApi, authenticated }) => {
    void authenticated;
    const before = await bankApi.balance('ACC-001');
    const nextMonth = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
    await transferPage.submit({ beneficiary: 'Vermieter', iban: randomGermanIban(), amount: '50', executionDate: nextMonth });
    await expect(transferPage.status).toHaveText('SCHEDULED');
    await expect(transferPage.success).toHaveText('Your transfer of 50,00 € has been scheduled.');
    expect(await bankApi.balance('ACC-001')).toBe(before);
  });

  test('reference counter tracks the 140 character limit', async ({ transferPage }) => {
    await transferPage.reference.fill('x'.repeat(150));
    await expect(transferPage.reference).toHaveValue('x'.repeat(140));
    await expect(transferPage.referenceCount).toHaveText('140/140');
  });

  test('credit card is not offered as a source account', async ({ transferPage }) => {
    await expect(transferPage.from.locator('option')).toHaveText([/^Girokonto/, /^Tagesgeld/]);
  });
});
