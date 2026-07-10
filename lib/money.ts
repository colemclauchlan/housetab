/**
 * Money helpers. All amounts are integer cents (CAD). Parsing avoids floats by
 * working on the string directly, so "700.50" never becomes 70049.999…
 */

const CAD = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

/** Format integer cents as CAD, e.g. 141550 → "$1,415.50", 5 → "$0.05". */
export function formatCents(cents: number): string {
  if (!Number.isFinite(cents)) return CAD.format(0);
  return CAD.format(cents / 100);
}

/**
 * Parse a user-entered dollar amount into integer cents.
 * Accepts optional leading "$", thousands separators, and 0–2 decimal places.
 * Rejects negatives, blanks, and malformed input.
 *
 * @throws if the input is not a valid non-negative money amount.
 */
export function parseDollarsToCents(input: string): number {
  const cleaned = input.trim().replace(/^\$/, "").replace(/,/g, "");
  if (cleaned === "") {
    throw new Error("amount is required");
  }
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) {
    throw new Error(`invalid amount: "${input}"`);
  }
  const dollars = Number(match[1]);
  const fraction = match[2] ? match[2].padEnd(2, "0") : "00";
  return dollars * 100 + Number(fraction);
}
