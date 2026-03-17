/** Convert cents to display string (e.g. 1099 → "$10.99") */
export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100);
}

/** Convert grams to display string (e.g. 1500 → "1.5 kg") */
export function formatWeight(grams: number): string {
  if (grams >= 1000) return `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1)} kg`;
  return `${grams}g`;
}

/** Calculate GST component from a total (GST-inclusive) in cents */
export function extractGst(totalCents: number, gstRate = 0.1): number {
  return Math.round(totalCents - totalCents / (1 + gstRate));
}

/** Calculate GST on top of a base price in cents */
export function addGst(baseCents: number, gstRate = 0.1): number {
  return Math.round(baseCents * gstRate);
}

/** Haversine distance in metres between two lat/lng pairs */
export function distanceMetres(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Generate a short display ID from a UUID */
export function shortId(id: string): string {
  return id.slice(-8).toUpperCase();
}
