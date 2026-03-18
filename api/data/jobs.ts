import type { AppRequest, AppResponse } from '../_handler';
import { getDb, newId, decodeRow, encodeRow } from '../_db';

export default async function handler(req: AppRequest, res: AppResponse) {
  const db = getDb(req.env);
  const id = (req.query.id as string) || '';

  try {
    // ── GET /api/data/jobs          → list all
    // ── GET /api/data/jobs?id=xyz   → get one
    if (req.method === 'GET') {
      if (id) {
        const row = await db.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first<any>();
        if (!row) return res.status(404).json({ error: 'Not found' });
        return res.json(decodeRow(row));
      }
      const { results } = await db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').bind().all<any>();
      return res.json(results.map(decodeRow));
    }

    // ── POST /api/data/jobs   → create
    if (req.method === 'POST') {
      const body = req.body || {};
      const jobId = body.id || newId();
      const now = new Date().toISOString();
      const record = { ...body, id: jobId, createdAt: body.createdAt || now, updatedAt: now };
      const row = encodeRow(jobId, record);
      await db.prepare(
        'INSERT INTO jobs (id, data, status, type, urgency, assigned_electrician_id, property_address, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)'
      ).bind(
        row.id, row.data,
        record.status || 'INTAKE',
        record.type || null,
        record.urgency || null,
        record.assignedElectricianId || null,
        record.propertyAddress || null,
        record.createdAt, record.updatedAt,
      ).run();
      return res.status(201).json(record);
    }

    // ── PUT /api/data/jobs?id=xyz   → update
    if (req.method === 'PUT') {
      if (!id) return res.status(400).json({ error: 'id required' });
      const existing = await db.prepare('SELECT * FROM jobs WHERE id = ?').bind(id).first<any>();
      if (!existing) return res.status(404).json({ error: 'Not found' });
      const prev = decodeRow(existing);
      const now = new Date().toISOString();
      const merged = { ...prev, ...req.body, id, updatedAt: now };
      const row = encodeRow(id, merged);
      await db.prepare(
        'UPDATE jobs SET data=?, status=?, type=?, urgency=?, assigned_electrician_id=?, property_address=?, updated_at=? WHERE id=?'
      ).bind(
        row.data,
        merged.status || existing.status,
        merged.type || existing.type,
        merged.urgency || existing.urgency,
        merged.assignedElectricianId || existing.assigned_electrician_id,
        merged.propertyAddress || existing.property_address,
        now, id,
      ).run();
      return res.json(merged);
    }

    // ── DELETE /api/data/jobs?id=xyz → delete
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id required' });
      await db.prepare('DELETE FROM jobs WHERE id = ?').bind(id).run();
      return res.json({ deleted: id });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[api/data/jobs]', err.message);
    res.status(500).json({ error: err.message });
  }
}
