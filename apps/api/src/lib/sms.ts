/**
 * ClickSend SMS helper.
 *
 * Fires and forgets — returns the ClickSend message id on success, null on failure
 * (network error, bad credentials, invalid phone, or missing secrets). Callers log
 * the result to the `notifications` table for dedupe and audit.
 *
 * AU number normalisation: customer phone numbers are stored in local AU format
 * (e.g. "0481145650") and ClickSend requires E.164 ("+61481145650"). We handle
 * the common shapes here so callers don't have to.
 */

export function normalizePhoneAU(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Strip spaces, hyphens, parentheses
  const cleaned = raw.replace(/[\s\-()]/g, '');
  if (!cleaned) return null;

  // Already in E.164 AU form
  if (/^\+61[2-478]\d{8}$/.test(cleaned)) return cleaned;

  // Local form: 04xx xxx xxx or 02/03/07/08 xxxx xxxx
  if (/^0[2-478]\d{8}$/.test(cleaned)) return '+61' + cleaned.slice(1);

  // Sometimes users save without the leading 0 but with 61 prefix
  if (/^61[2-478]\d{8}$/.test(cleaned)) return '+' + cleaned;

  // Mobile without country code and without leading 0 (e.g. "481145650")
  if (/^[2-478]\d{8}$/.test(cleaned)) return '+61' + cleaned;

  // Couldn't classify — let ClickSend reject it rather than guess wrong
  return null;
}

interface SendSmsEnv {
  CLICKSEND_USERNAME?: string;
  CLICKSEND_API_KEY?: string;
  CLICKSEND_FROM?: string;
}

export interface SendSmsResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

export async function sendSms(env: SendSmsEnv, to: string, body: string): Promise<SendSmsResult> {
  if (!env.CLICKSEND_USERNAME || !env.CLICKSEND_API_KEY || !env.CLICKSEND_FROM) {
    return { ok: false, error: 'ClickSend secrets not configured' };
  }
  const normalized = normalizePhoneAU(to);
  if (!normalized) return { ok: false, error: `Invalid phone: ${to}` };

  const auth = btoa(`${env.CLICKSEND_USERNAME}:${env.CLICKSEND_API_KEY}`);
  try {
    const res = await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{
          source: 'oconnor-api',
          from: env.CLICKSEND_FROM,
          to: normalized,
          body,
        }],
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    const json = await res.json() as { data?: { messages?: Array<{ message_id?: string; status?: string }> } };
    const message = json?.data?.messages?.[0];
    if (message?.status && message.status !== 'SUCCESS') {
      return { ok: false, error: `ClickSend: ${message.status}` };
    }
    return { ok: true, messageId: message?.message_id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
