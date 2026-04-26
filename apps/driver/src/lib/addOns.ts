/**
 * Detect offal/suet/bones add-on requests typed into the free-text customer
 * note during checkout. Centralised so the Stops list pill and the
 * StopDetail banner can never drift.
 *
 * Long-term improvement would be a structured add-on selector at checkout
 * (instead of free text), but until then keyword detection on the note
 * gives Seamus a visible flag so he doesn't miss them when loading.
 */
export const ADDON_KEYWORDS = [
  'offal', 'suet', 'liver', 'kidney', 'kidneys',
  'heart', 'hearts', 'tongue', 'tripe', 'brain', 'brains',
  'oxtail', 'marrow', 'bones', 'trotter', 'trotters',
] as const;

const ADDON_REGEX = new RegExp(`\\b(${ADDON_KEYWORDS.join('|')})\\b`, 'i');

/** True if the customer note mentions any add-on keyword (case-insensitive, whole-word). */
export function hasAddOns(note: string | null | undefined): boolean {
  if (!note) return false;
  return ADDON_REGEX.test(note);
}

/** Return the matched lines (split on commas/semicolons/newlines/full-stops) for prominent display. */
export function detectAddOns(note: string | null | undefined): string[] {
  if (!note) return [];
  return note
    .split(/[,;\n]+|\.\s+/g)
    .map((s) => s.trim())
    .filter((line) => line && ADDON_REGEX.test(line));
}
