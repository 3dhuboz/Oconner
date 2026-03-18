import type { AppRequest, AppResponse } from '../../_handler';
import { XeroClient } from 'xero-node';

export default async function handler(req: AppRequest, res: AppResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.XERO_CLIENT_ID) {
      return res.status(400).json({ error: 'XERO_CLIENT_ID is not configured in environment variables.' });
    }

    const xero = new XeroClient({
      clientId: process.env.XERO_CLIENT_ID,
      clientSecret: process.env.XERO_CLIENT_SECRET || '',
      redirectUris: [
        `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/xero/callback`,
      ],
      scopes: 'openid profile email accounting.transactions accounting.contacts offline_access'.split(' '),
    });

    const consentUrl = await xero.buildConsentUrl();
    res.json({ url: consentUrl });
  } catch (e: any) {
    console.error('Error building Xero URL:', e);
    res.status(500).json({ error: e.message });
  }
}
