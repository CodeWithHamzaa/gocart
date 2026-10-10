// M55: the one place a price is turned into display text. Format (owner-confirmed):
// "Rs. 1,500" — symbol, a single space, comma-grouped whole rupees, no decimals.
//
// The locale is pinned to 'en-US' on purpose. A bare `toLocaleString()` uses the
// runtime's locale, so the server render and the browser can disagree on the
// grouping separator and cause a hydration mismatch. This module has no
// server-only imports and is safe in both server and client components.
//
// The symbol still comes from NEXT_PUBLIC_CURRENCY_SYMBOL (.env.example) so it can
// be changed without a code change; it is normalised so the output is always
// "<symbol><one space><amount>" whether the variable is set to "Rs", "Rs." or "Rs. ".
const SYMBOL = (process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || 'Rs.').trim() || 'Rs.'

const grouping = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

/** "Rs. 1,500". A non-finite amount renders as "Rs. —" rather than "Rs. NaN". */
export function formatPKR(amount: number | string | null | undefined): string {
  const value = typeof amount === 'string' ? Number(amount) : amount
  if (typeof value !== 'number' || !Number.isFinite(value)) return `${SYMBOL} —`
  return `${SYMBOL} ${grouping.format(Math.round(value))}`
}
