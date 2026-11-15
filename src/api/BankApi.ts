import { type APIRequestContext, expect } from '@playwright/test';

export interface Credentials { username: string; password: string }
export interface Session { accessToken: string; customer: { name: string; customerId: string } }

export const CUSTOMERS = {
  julia: { username: 'j.schneider', password: 'Demo#2026', name: 'Julia Schneider' },
  max: { username: 'm.weber', password: 'Demo#2026', name: 'Max Weber' },
  blocked: { username: 'blocked.user', password: 'Demo#2026', name: 'Blocked User' },
} as const;

export class BankApi {
  constructor(private readonly request: APIRequestContext, private token?: string) {}

  /** Sandbox OTP endpoint - the equivalent of a bank's test SMS gateway. */
  async sandboxOtp(): Promise<string> {
    return (await (await this.request.get('/api/bank/__test/otp')).json()).otp;
  }

  async login({ username, password }: Credentials): Promise<Session> {
    const step1 = await this.request.post('/api/bank/auth/login', { data: { username, password } });
    expect(step1, await step1.text()).toBeOK();
    const { challengeId } = await step1.json();
    const step2 = await this.request.post('/api/bank/auth/otp', { data: { challengeId, otp: await this.sandboxOtp() } });
    expect(step2).toBeOK();
    const session: Session = await step2.json();
    this.token = session.accessToken;
    return session;
  }

  private get headers(): Record<string, string> {
    return this.token ? { authorization: `Bearer ${this.token}` } : {};
  }

  async accounts() {
    const res = await this.request.get('/api/bank/accounts', { headers: this.headers });
    expect(res).toBeOK();
    return (await res.json()).accounts as Array<{ id: string; type: string; balance: number; iban: string | null }>;
  }

  async balance(accountId: string) {
    return (await this.accounts()).find((a) => a.id === accountId)!.balance;
  }

  transfer(body: Record<string, unknown>) {
    return this.request.post('/api/bank/transfers', { headers: this.headers, data: body });
  }
}
