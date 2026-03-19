import type { AppRequest, AppResponse } from '../_handler';
import { getDb, safeJson } from '../_db';
import twilio from 'twilio';

export default async function handler(req: AppRequest, res: AppResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'to and message are required' });
  let sid = process.env.TWILIO_ACCOUNT_SID;
  let token = process.env.TWILIO_AUTH_TOKEN;
  let from = process.env.TWILIO_PHONE_NUMBER;

  // Fall back to D1 settings saved via Integrations UI
  if ((!sid || !token || !from) && req.env?.DB) {
    try {
      const db = getDb(req.env);
      const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind('sms').first<{ value: string }>();
      if (row) {
        const saved = safeJson(row.value);
        sid = sid || saved.accountSid || '';
        token = token || saved.authToken || '';
        from = from || saved.fromNumber || '';
      }
    } catch { /* settings table may not exist yet */ }
  }

  if (!sid || !token || !from) {
    console.log(`[SMS Simulation] To: ${to} | Message: ${message}`);
    return res.json({ success: true, simulated: true });
  }

  try {
    const client = twilio(sid, token);
    await client.messages.create({ body: message, from, to });
    console.log(`[SMS Sent] To: ${to}`);
    res.json({ success: true, simulated: false });
  } catch (e: any) {
    console.error('Twilio Error:', e);
    res.status(500).json({ error: e.message });
  }
}
