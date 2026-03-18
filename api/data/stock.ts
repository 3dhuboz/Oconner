import type { AppRequest, AppResponse } from '../_handler';
import { getDb, newId, decodeRow, encodeRow } from '../_db';

export default async function handler(req: AppRequest, res: AppResponse) {
  const db = getDb(req.env);
  const resource = (req.query.resource as string) || 'items'; // 'items' | 'movements'
  const id = (req.query.id as string) || '';

  try {
    // ── Tech Stock items ─────────────────────────────────────────────────────
    if (resource === 'items') {
      if (req.method === 'GET') {
        const { results } = await db.prepare('SELECT * FROM tech_stock').bind().all<any>();
        return res.json(results.map(decodeRow));
      }

      if (req.method === 'PUT') {
        const body = req.body || {};
        const stockId = id || body.id;
        if (!stockId) return res.status(400).json({ error: 'id required' });
        const existing = await db.prepare('SELECT * FROM tech_stock WHERE id = ?').bind(stockId).first<any>();
        const merged = { ...(existing ? decodeRow(existing) : {}), ...body, id: stockId };
        const row = encodeRow(stockId, merged);
        await db.prepare('INSERT OR REPLACE INTO tech_stock (id, data) VALUES (?,?)').bind(row.id, row.data).run();
        return res.json(merged);
      }
    }

    // ── Stock movements ───────────────────────────────────────────────────────
    if (resource === 'movements') {
      if (req.method === 'GET') {
        const { results } = await db.prepare(
          'SELECT * FROM stock_movements ORDER BY timestamp DESC LIMIT 150'
        ).bind().all<any>();
        return res.json(results.map(decodeRow));
      }

      if (req.method === 'POST') {
        const body = req.body || {};
        const movId = newId();
        const now = new Date().toISOString();
        const record = { ...body, id: movId, timestamp: body.timestamp || now };
        const row = encodeRow(movId, record);
        await db.prepare(
          'INSERT INTO stock_movements (id, data, technician_id, timestamp) VALUES (?,?,?,?)'
        ).bind(row.id, row.data, record.technicianId || null, record.timestamp).run();
        return res.status(201).json(record);
      }
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[api/data/stock]', err.message);
    res.status(500).json({ error: err.message });
  }
}
