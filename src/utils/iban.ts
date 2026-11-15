/**
 * IBAN helpers for test data. Generating valid IBANs (instead of hard-coding
 * a handful) means every transfer test can use a fresh beneficiary.
 */
function mod97(digits: string): number {
  let rem = 0;
  for (const d of digits) rem = (rem * 10 + Number(d)) % 97;
  return rem;
}

const toDigits = (s: string) => s.replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));

/** Builds a valid German IBAN from an 8-digit bank code (BLZ) and up to 10-digit account number. */
export function germanIban(blz: string, account: string | number): string {
  const bban = blz.padStart(8, '0') + String(account).padStart(10, '0');
  const check = 98 - mod97(toDigits(bban + 'DE00'));
  return `DE${String(check).padStart(2, '0')}${bban}`;
}

export function randomGermanIban(blz = '70150000'): string {
  return germanIban(blz, Math.floor(Math.random() * 9_999_999_999));
}

export function isValidIban(iban: string): boolean {
  const s = iban.replace(/\s+/g, '').toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s) && mod97(toDigits(s.slice(4) + s.slice(0, 4))) === 1;
}

/** Flips the last digit, which always breaks the checksum. */
export function corrupt(iban: string): string {
  const last = Number(iban.at(-1));
  return iban.slice(0, -1) + String((last + 1) % 10);
}

export const formatIban = (iban: string) => iban.replace(/(.{4})/g, '$1 ').trim();
