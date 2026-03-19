import type { AppRequest, AppResponse } from '../_handler';
import { getDb, newId, decodeRow, encodeRow } from '../_db';

export default async function handler(req: AppRequest, res: AppResponse) {
  const db = getDb(req.env);
  const id = (req.query.id as string) || '';

  try {
    if (req.method === 'GET') {
      if (id) {
        const row = await db.prepare('SELECT * FROM parts_catalog WHERE id = ?').bind(id).first<any>();
        if (!row) return res.status(404).json({ error: 'Not found' });
        return res.json(decodeRow(row));
      }
      const { results } = await db.prepare('SELECT * FROM parts_catalog LIMIT 2000').bind().all<any>();
      return res.json(results.map(decodeRow));
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const partId = body.id || newId();
      const record = { ...body, id: partId };
      const row = encodeRow(partId, record);
      await db.prepare('INSERT OR REPLACE INTO parts_catalog (id, data) VALUES (?,?)').bind(row.id, row.data).run();
      return res.status(201).json(record);
    }

    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const existing = await db.prepare('SELECT * FROM parts_catalog WHERE id = ?').bind(id).first<any>();
      const merged = { ...(existing ? decodeRow(existing) : {}), ...req.body, id };
      const row = encodeRow(id, merged);
      await db.prepare('INSERT OR REPLACE INTO parts_catalog (id, data) VALUES (?,?)').bind(row.id, row.data).run();
      return res.json(merged);
    }

    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id required' });
      await db.prepare('DELETE FROM parts_catalog WHERE id = ?').bind(id).run();
      return res.json({ deleted: id });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[api/data/parts]', err.message);
    res.status(500).json({ error: err.message });
  }
}
