import { type Locator, type Page, expect } from '@playwright/test';

export class LoginPage {
  readonly username: Locator;
  readonly password: Locator;
  readonly continue: Locator;
  readonly otp: Locator;
  readonly verify: Locator;
  readonly loginError: Locator;
  readonly otpError: Locator;
  readonly info: Locator;

  constructor(private readonly page: Page) {
    this.username = page.getByLabel('Username');
    this.password = page.getByLabel('PIN / Password');
    this.continue = page.getByRole('button', { name: 'Continue' });
    this.otp = page.getByLabel('Security code');
    this.verify = page.getByRole('button', { name: 'Verify' });
    this.loginError = page.getByTestId('login-error');
    this.otpError = page.getByTestId('otp-error');
    this.info = page.getByTestId('login-info');
  }

  async goto() {
    await this.page.goto('/bank/login.html');
  }

  async enterCredentials(username: string, password: string) {
    await this.username.fill(username);
    await this.password.fill(password);
    await this.continue.click();
  }

  async enterOtp(code: string) {
    await expect(this.otp).toBeVisible();
    await this.otp.fill(code);
    await this.verify.click();
  }
}
