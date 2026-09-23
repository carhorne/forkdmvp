// Display-only rounding of a raw average; sorting always uses the raw value. Half-up, stable for float noise.
export function formatScore(average: number | string | null) {
  if (average === null) return null;
  const tenths = Math.round(Number((Number(average) * 10).toFixed(6)));
  return (tenths / 10).toFixed(1);
}

export function formatRatingCount(count: number | string) {
  const n = Number(count);
  return `${n} ${n === 1 ? "rating" : "ratings"}`;
}

// Unknown price is never shown as zero.
export function formatPrice(cents: number | null, currency: string) {
  if (cents === null) return "Price unavailable";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

export function formatCheckedDate(timestamp: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(timestamp));
}
