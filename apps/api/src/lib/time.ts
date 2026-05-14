/**
 * Timezone-aware date/time formatting helpers.
 *
 * Cloudflare Workers run in UTC. Naive `new Date(ms).getHours()` or
 * `toLocaleDateString('en-AU')` formats in the server's timezone, which means
 * customer-facing emails and SMS showed times like "2am" when the actual
 * delivery window was 12pm Brisbane (12pm Brisbane = 2am UTC).
 *
 * Always use these helpers when formatting timestamps for customer comms or
 * any UI rendered server-side. They format in `Australia/Brisbane` (no DST),
 * which matches where every O'Connor customer lives.
 */

const TZ = 'Australia/Brisbane';

/**
 * Format a timestamp as "1pm", "1:30pm", "12am" etc. in Brisbane time.
 * Used for delivery-window labels in emails and SMS.
 */
export function formatBrisbaneTime(ms: number): string {
  // Use a non-en-AU locale to get unambiguous "1:30 pm" output that's easy
  // to massage; en-AU sometimes inserts narrow-no-break-space characters
  // that break naive replace().
  const s = new Date(ms).toLocaleString('en-US', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  // s looks like "1:30 PM" or "12:00 AM"
  return s
    .toLowerCase()
    .replace(/\s+/g, '')      // "1:30pm"
    .replace(/:00(?=[ap]m)$/, ''); // "1pm" if minute is 00, else unchanged
}

/**
 * Format a timestamp as e.g. "Friday, 16 May" in Brisbane time.
 * Used for "your delivery is on …" labels.
 */
export function formatBrisbaneDate(ms: number, opts?: {
  weekday?: 'long' | 'short';
  year?: 'numeric';
}): string {
  return new Date(ms).toLocaleDateString('en-AU', {
    timeZone: TZ,
    weekday: opts?.weekday ?? 'long',
    day: 'numeric',
    month: 'long',
    ...(opts?.year ? { year: opts.year } : {}),
  });
}

/**
 * Format a timestamp as e.g. "16 May" or "16 May 2026" in Brisbane time.
 * Compact variant without weekday — used for confirmation receipts.
 */
export function formatBrisbaneShortDate(ms: number, opts?: { year?: boolean }): string {
  return new Date(ms).toLocaleDateString('en-AU', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    ...(opts?.year ? { year: 'numeric' } : {}),
  });
}
