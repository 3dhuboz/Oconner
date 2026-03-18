import type { AppRequest, AppResponse } from '../_handler';
import { getDb } from '../_db';

export default async function handler(req: AppRequest, res: AppResponse) {
  const db = getDb(req.env);
  const uid = (req.query.uid as string) || '';

  try {
    // GET all active locations (for live map)
    if (req.method === 'GET') {
      const { results } = await db.prepare(
        "SELECT * FROM tech_locations WHERE updated_at > datetime('now', '-10 minutes')"
      ).bind().all<any>();
      return res.json(results);
    }

    // PUT — upsert a single tech location
    if (req.method === 'PUT') {
      const { lat, lng, accuracy } = req.body || {};
      const techUid = uid || req.body?.uid;
      if (!techUid || lat == null || lng == null) {
        return res.status(400).json({ error: 'uid, lat and lng required' });
      }
      const now = new Date().toISOString();
      await db.prepare(
        'INSERT OR REPLACE INTO tech_locations (uid, lat, lng, accuracy, updated_at) VALUES (?,?,?,?,?)'
      ).bind(techUid, lat, lng, accuracy ?? 0, now).run();
      return res.json({ uid: techUid, lat, lng, accuracy, updatedAt: now });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[api/data/locations]', err.message);
    res.status(500).json({ error: err.message });
  }
}
