/**
 * Lenient JSON.parse for DB columns that store JSON-as-text (items,
 * deliveryAddress, breadcrumb, etc.). Returns the supplied fallback if the
 * column value is null/empty/corrupted, instead of throwing — a single bad
 * row would otherwise turn a list endpoint into a 500.
 */
export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
