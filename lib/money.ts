// Preserve the existing nonnegative per-shift half-up rounding boundary.
// Once rounded, all payroll aggregation and allocation uses integer minor units.
export function toMinorUnits(amount: number) {
  const minor = Math.round((amount + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(minor))
    throw new Error("Amount exceeds safe monetary precision");
  return minor;
}
export const roundMoney = (amount: number) => toMinorUnits(amount) / 100;
export function sumMoney(amounts: Iterable<number>) {
  let total = 0;
  for (const amount of amounts) total += toMinorUnits(amount);
  if (!Number.isSafeInteger(total))
    throw new Error("Total exceeds safe monetary precision");
  return total / 100;
}
// Largest remainder allocation: canonical shift cents are authoritative. A tie
// goes to the earlier chronological segment. No persisted record is rewritten.
export function allocateMinorUnits(amount: number, parts: number[]) {
  const target = toMinorUnits(amount);
  const values = parts.map((part, index) => {
    const exact = Math.max(0, part) * 100;
    return {
      index,
      minor: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });
  let difference = target - values.reduce((n, part) => n + part.minor, 0);
  const ranked = [...values].sort(
    (a, b) => b.remainder - a.remainder || a.index - b.index,
  );
  if (difference < 0 || difference > ranked.length)
    throw new Error("Cannot reconcile monetary allocation");
  for (const value of ranked) {
    if (difference-- <= 0) break;
    value.minor++;
  }
  return values.map((value) => value.minor / 100);
}
