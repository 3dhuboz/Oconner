import type { VercelRequest, VercelResponse } from '@vercel/node';

// In serverless, we can't persist state between invocations.
// This checks if Xero credentials are configured.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const connected = !!(process.env.XERO_CLIENT_ID && process.env.XERO_CLIENT_SECRET);
  res.json({ connected });
}
