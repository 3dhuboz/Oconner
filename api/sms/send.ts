import type { VercelRequest, VercelResponse } from '@vercel/node';
import twilio from 'twilio';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, message } = req.body;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

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
