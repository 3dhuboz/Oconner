import type { AppRequest, AppResponse } from '../_handler';
import { getDb } from '../_db';

export default async function handler(req: AppRequest, res: AppResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Remove any stored Xero token from the settings table (if present)
  if (req.env?.DB) {
    try {
      const db = getDb(req.env);
      await db.prepare(`DELETE FROM settings WHERE key = ?`).bind('xero_token').run();
    } catch {
      // Non-fatal: table may not have the key
    }
  }

  res.json({ disconnected: true });
}
