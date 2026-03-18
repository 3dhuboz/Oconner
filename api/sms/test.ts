import type { AppRequest, AppResponse } from '../_handler';
import twilio from 'twilio';

export default async function handler(req: AppRequest, res: AppResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, provider, accountSid, authToken, phoneNumber, fromNumber } = req.body;

  if (!to) {
    return res.status(400).json({ error: 'Missing "to" phone number' });
  }

  // Use request body credentials first, fall back to env vars
  // Frontend sends 'fromNumber', accept both field names for safety
  const sid = accountSid || process.env.TWILIO_ACCOUNT_SID;
  const token = authToken || process.env.TWILIO_AUTH_TOKEN;
  const from = fromNumber || phoneNumber || process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    // Simulate if no credentials configured
    console.log(`[SMS Test Simulation] To: ${to} | Provider: ${provider || 'twilio'}`);
    return res.json({
      success: true,
      simulated: true,
      message: `Test SMS simulated to ${to} (no Twilio credentials configured)`,
    });
  }

  try {
    const client = twilio(sid, token);
    const msg = await client.messages.create({
      body: `Wirez R Us — SMS gateway test. If you received this, your SMS integration is working correctly.`,
      from,
      to,
    });
    console.log(`[SMS Test] Sent to: ${to} | SID: ${msg.sid}`);
    return res.json({ success: true, simulated: false, sid: msg.sid });
  } catch (e: any) {
    console.error('[SMS Test] Twilio error:', e.message);
    return res.status(500).json({ error: e.message || 'Failed to send test SMS' });
  }
}
