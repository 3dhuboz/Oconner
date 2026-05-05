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

/** Generate a short display ID from an ID string */
export function shortId(id: string): string {
  return id.slice(-8).toUpperCase();
}

/**
 * Extract every 4-digit postcode from a delivery-day zones string.
 *
 * Zone strings look like:
 *   "Agnes Water (4677), Seventeen Seventy (4677), Bororen (4678)"
 *   "Gladstone, Calliope (4680), Boyne Island (4680)"
 *
 * We just pull every standalone 4-digit run — this is the only reliable
 * signal, since town names without a postcode (like the bare "Gladstone"
 * above) are ambiguous and the postcoded entries already cover the area.
 */
export function extractPostcodes(zones?: string | null): string[] {
  if (!zones) return [];
  const matches = zones.match(/\b\d{4}\b/g);
  if (!matches) return [];
  return Array.from(new Set(matches));
}

/**
 * Does this delivery day serve the given customer postcode?
 *
 * Returns `true` if the day's zones list includes the postcode (or if the
 * day has no zones configured — we don't want to break legacy/admin-created
 * days that weren't tagged). Returns `false` only when zones are present
 * AND the postcode isn't in them.
 *
 * This was added after a Round Hill (4677) order ended up on a Gladstone-zone
 * (4680) delivery day. The checkout dropdown was showing every active day
 * regardless of the customer's postcode.
 */
export function dayServesPostcode(zones: string | null | undefined, customerPostcode: string | null | undefined): boolean {
  const pc = (customerPostcode ?? '').trim();
  if (!pc) return true; // can't validate without a postcode — let downstream UX prompt
  const list = extractPostcodes(zones);
  if (list.length === 0) return true; // no zones configured → don't block
  return list.includes(pc);
}
