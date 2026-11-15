/** "1.234,56 €" -> 1234.56  (German number format, as rendered by the portal) */
export function parseEuro(text: string): number {
  const cleaned = text.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  return Number(cleaned);
}

/** 1234.5 -> "1.234,50 €" using the same Intl formatting as the app. */
export const euro = (value: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);

/** Standard annuity formula, used as an independent oracle for the loan calculator. */
export function annuity(amount: number, months: number, annualRatePct: number): number {
  const i = annualRatePct / 100 / 12;
  const m = i === 0 ? amount / months : (amount * i) / (1 - Math.pow(1 + i, -months));
  return Math.round(m * 100) / 100;
}
