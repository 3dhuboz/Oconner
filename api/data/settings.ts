import type { AppRequest, AppResponse } from '../_handler';
import { getDb } from '../_db';

export default async function handler(req: AppRequest, res: AppResponse) {
  const db = getDb(req.env);
  const key = (req.query.key as string) || '';

  try {
    if (req.method === 'GET') {
      if (!key) return res.status(400).json({ error: 'key required' });
      const row = await db.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first<any>();
      if (!row) return res.status(404).json({ error: 'Not found' });
      try { return res.json(JSON.parse(row.value)); } catch { return res.json({}); }
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      if (!key) return res.status(400).json({ error: 'key required' });
      const value = JSON.stringify(req.body || {});
      await db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)').bind(key, value).run();
      return res.json(req.body);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[api/data/settings]', err.message);
    res.status(500).json({ error: err.message });
  }
}
