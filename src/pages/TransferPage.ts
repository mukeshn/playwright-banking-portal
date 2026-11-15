import { type Locator, type Page, expect } from '@playwright/test';

export interface TransferInput {
  from?: 'Girokonto' | 'Tagesgeld';
  beneficiary: string;
  iban: string;
  amount: string;
  reference?: string;
  executionDate?: string;
}

const ACCOUNT_IDS = { Girokonto: 'ACC-001', Tagesgeld: 'ACC-002' } as const;

export class TransferPage {
  readonly from: Locator;
  readonly beneficiary: Locator;
  readonly iban: Locator;
  readonly ibanHint: Locator;
  readonly amount: Locator;
  readonly executionDate: Locator;
  readonly reference: Locator;
  readonly referenceCount: Locator;
  readonly review: Locator;
  readonly confirm: Locator;
  readonly edit: Locator;
  readonly formError: Locator;
  readonly success: Locator;
  readonly transferId: Locator;
  readonly status: Locator;
  readonly available: Locator;

  constructor(private readonly page: Page) {
    this.from = page.getByLabel('From account');
    this.beneficiary = page.getByLabel('Beneficiary name');
    this.iban = page.getByLabel('IBAN');
    this.ibanHint = page.getByTestId('iban-hint');
    this.amount = page.getByLabel('Amount (EUR)');
    this.executionDate = page.getByLabel('Execution date');
    this.reference = page.getByLabel('Reference');
    this.referenceCount = page.getByTestId('reference-count');
    this.review = page.getByRole('button', { name: 'Review transfer' });
    this.confirm = page.getByRole('button', { name: 'Confirm transfer' });
    this.edit = page.getByRole('button', { name: 'Edit' });
    this.formError = page.getByTestId('transfer-error');
    this.success = page.getByTestId('transfer-success');
    this.transferId = page.getByTestId('transfer-id');
    this.status = page.getByTestId('transfer-status');
    this.available = page.getByTestId('available-balance');
  }

  fieldError(field: 'beneficiaryName' | 'iban' | 'amount') {
    return this.page.locator(`[data-error-for="${field}"]`);
  }

  async goto() {
    await this.page.goto('/bank/transfer.html');
    await expect(this.available).not.toBeEmpty();
  }

  async fill(t: TransferInput) {
    if (t.from) await this.from.selectOption(ACCOUNT_IDS[t.from]);
    await this.beneficiary.fill(t.beneficiary);
    const validated = this.page.waitForResponse('**/api/bank/iban/validate');
    await this.iban.fill(t.iban);
    await this.iban.blur();
    await validated;
    await this.amount.fill(t.amount);
    if (t.reference) await this.reference.fill(t.reference);
    if (t.executionDate) await this.executionDate.fill(t.executionDate);
  }

  async submit(t: TransferInput) {
    await this.fill(t);
    await this.review.click();
    await expect(this.confirm).toBeVisible();
    await this.confirm.click();
  }
}
