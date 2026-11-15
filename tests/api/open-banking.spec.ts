import { test, expect } from '@playwright/test';
import { BankApi, CUSTOMERS } from '../../src/api/BankApi';
import { randomGermanIban } from '../../src/utils/iban';

test.describe('Partner API (OAuth2 client credentials)', { tag: '@api' }, () => {
  const tokenFor = async (request: import('@playwright/test').APIRequestContext, client: string, secret: string, scope?: string) =>
    request.post('/api/bank/oauth/token', { form: { grant_type: 'client_credentials', client_id: client, client_secret: secret, ...(scope ? { scope } : {}) } });

  test('issues a bearer token with the granted scopes', async ({ request }) => {
    const res = await tokenFor(request, 'partner-app', 'p4rtn3r-s3cret');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ token_type: 'Bearer', expires_in: 900, scope: 'accounts:read transfers:write' });
  });

  test('supports HTTP Basic client authentication', async ({ request }) => {
    const basic = Buffer.from('partner-app:p4rtn3r-s3cret').toString('base64');
    const res = await request.post('/api/bank/oauth/token', { headers: { authorization: `Basic ${basic}` }, form: { grant_type: 'client_credentials' } });
    expect(res.status()).toBe(200);
  });

  test('rejects bad secrets and unknown grant types', async ({ request }) => {
    expect((await tokenFor(request, 'partner-app', 'wrong')).status()).toBe(401);
    const res = await request.post('/api/bank/oauth/token', { form: { grant_type: 'password', client_id: 'partner-app', client_secret: 'p4rtn3r-s3cret' } });
    expect(await res.json()).toEqual({ error: 'unsupported_grant_type' });
  });

  test('read-only client cannot move money', { tag: '@security' }, async ({ request }) => {
    const { access_token } = await (await tokenFor(request, 'readonly-app', 'r34d-0nly')).json();
    const accounts = await request.get('/api/bank/accounts', { headers: { authorization: `Bearer ${access_token}` } });
    expect(accounts.status()).toBe(200);
    const transfer = await request.post('/api/bank/transfers', {
      headers: { authorization: `Bearer ${access_token}` },
      data: { fromAccountId: 'ACC-001', beneficiaryName: 'X', iban: randomGermanIban(), amount: 1 },
    });
    expect(transfer.status()).toBe(403);
    expect(await transfer.json()).toEqual({ error: 'INSUFFICIENT_SCOPE', required: 'transfers:write' });
  });

  test('cannot request scopes beyond the client registration', async ({ request }) => {
    const res = await tokenFor(request, 'readonly-app', 'r34d-0nly', 'accounts:read transfers:write');
    expect(await res.json()).toEqual({ error: 'invalid_scope' });
  });
});

test.describe('Transfers API', { tag: '@api' }, () => {
  test('validates every field and reports them together', async ({ request }) => {
    const api = new BankApi(request);
    await api.login(CUSTOMERS.max);
    const res = await api.transfer({ fromAccountId: 'ACC-003', beneficiaryName: '', iban: 'DE00123', amount: 10.555, reference: 'r'.repeat(141) });
    expect(res.status()).toBe(422);
    const fields = (await res.json()).errors.map((e: { field: string }) => e.field);
    expect(fields).toEqual(['fromAccountId', 'beneficiaryName', 'iban', 'amount', 'reference']);
  });

  test('scheduled transfer can be cancelled, executed one cannot', async ({ request }) => {
    const api = new BankApi(request);
    const session = await api.login(CUSTOMERS.max);
    const auth = { authorization: `Bearer ${session.accessToken}` };
    const base = { fromAccountId: 'ACC-001', beneficiaryName: 'Hausverwaltung', iban: randomGermanIban(), amount: 10 };

    const scheduled = await (await api.transfer({ ...base, executionDate: '2099-01-01' })).json();
    expect(scheduled.status).toBe('SCHEDULED');
    const cancel = await request.delete(`/api/bank/transfers/${scheduled.id}`, { headers: auth });
    expect((await cancel.json()).status).toBe('CANCELLED');

    const executed = await (await api.transfer(base)).json();
    const cannot = await request.delete(`/api/bank/transfers/${executed.id}`, { headers: auth });
    expect(cannot.status()).toBe(409);
  });

  test('sessions are isolated between customers', async ({ playwright, baseURL }) => {
    const a = await playwright.request.newContext({ baseURL });
    const b = await playwright.request.newContext({ baseURL });
    const julia = new BankApi(a);
    const max = new BankApi(b);
    await julia.login(CUSTOMERS.julia);
    await max.login(CUSTOMERS.max);
    await julia.transfer({ fromAccountId: 'ACC-001', beneficiaryName: 'Test', iban: randomGermanIban(), amount: 100 });
    expect(await julia.balance('ACC-001')).toBe(3150.75);
    expect(await max.balance('ACC-001')).toBe(3250.75);
    await Promise.all([a.dispose(), b.dispose()]);
  });
});
