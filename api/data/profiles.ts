import type { AppRequest, AppResponse } from '../_handler';
import { getDb, decodeRow, encodeRow } from '../_db';

export default async function handler(req: AppRequest, res: AppResponse) {
  const db = getDb(req.env);
  const id = (req.query.id as string) || '';

  try {
    if (req.method === 'GET') {
      if (!id) {
        const { results } = await db.prepare('SELECT * FROM user_profiles').bind().all<any>();
        return res.json(results.map(decodeRow));
      }
      const row = await db.prepare('SELECT * FROM user_profiles WHERE id = ?').bind(id).first<any>();
      if (!row) return res.status(404).json({ error: 'Not found' });
      return res.json(decodeRow(row));
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const body = req.body || {};
      const profileId = id || body.id;
      if (!profileId) return res.status(400).json({ error: 'id required' });
      const existing = await db.prepare('SELECT * FROM user_profiles WHERE id = ?').bind(profileId).first<any>();
      const merged = { ...(existing ? decodeRow(existing) : {}), ...body, id: profileId };
      const row = encodeRow(profileId, merged);
      await db.prepare('INSERT OR REPLACE INTO user_profiles (id, data) VALUES (?,?)').bind(row.id, row.data).run();
      return res.json(merged);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[api/data/profiles]', err.message);
    res.status(500).json({ error: err.message });
  }
}
