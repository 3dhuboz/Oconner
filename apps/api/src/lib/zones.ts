/**
 * Postcode-vs-zone matching for delivery days.
 *
 * Zone strings stored on `delivery_days.zones` look like:
 *   "Agnes Water (4677), Seventeen Seventy (4677), Bororen (4678)"
 *   "Gladstone, Calliope (4680), Boyne Island (4680)"
 *
 * We extract every standalone 4-digit run as a postcode. Bare town names
 * without a postcode (the bare "Gladstone" above) are intentionally ignored —
 * they're ambiguous, and the postcoded entries cover the same area anyway.
 *
 * Mirror of the client-side helper in @butcher/shared/helpers/utils.ts —
 * inlined here so the API doesn't need a direct dependency on @butcher/shared.
 *
 * Added after a Round Hill (4677) order ended up on a Gladstone-zone (4680)
 * delivery day because nothing on either side was checking.
 */
export function extractPostcodes(zones?: string | null): string[] {
  if (!zones) return [];
  const matches = zones.match(/\b\d{4}\b/g);
  if (!matches) return [];
  return Array.from(new Set(matches));
}

export function dayServesPostcode(zones: string | null | undefined, customerPostcode: string | null | undefined): boolean {
  const pc = (customerPostcode ?? '').trim();
  if (!pc) return true;
  const list = extractPostcodes(zones);
  if (list.length === 0) return true; // legacy days with no zones — don't block
  return list.includes(pc);
}
