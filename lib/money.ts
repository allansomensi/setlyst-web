/**
 * The one money formatter of the app (pricing page, billing settings,
 * staff billing console). Pure, unit tested in lib/__tests__/public-site.test.ts.
 */

/**
 * Formats minor units (cents) as a currency amount for `locale`.
 * `compact` drops ",00" from whole amounts (pricing cards).
 */
export function formatMoney(
  cents: number,
  currency: string,
  locale: string,
  options: { compact?: boolean } = {},
): string {
  const amount = cents / 100;
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency || "BRL",
      minimumFractionDigits: options.compact && whole ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Unknown currency code: still readable.
    return `${currency} ${amount.toFixed(2)}`;
  }
}
