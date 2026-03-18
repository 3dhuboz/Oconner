import type { AppRequest, AppResponse } from '../_handler';
import { getDb, safeJson } from '../_db';

/**
 * Rexel / Supplier Pricing API — persisted to Cloudflare D1
 *
 * GET  /api/xero/pricing               — list all parts with latest prices
 * GET  /api/xero/pricing?partName=...   — lookup by part name
 * GET  /api/xero/pricing?flagged=1      — show only flagged price changes
 * PATCH /api/xero/pricing              — update sell price / markup for a part
 * POST /api/xero/pricing               — ingest price items (from CSV, email, barcode)
 *   body: { items: [{ partName, supplier, costPrice, invoiceRef?, barcode?, source? }] }
 */

const PRICE_CHANGE_THRESHOLD = 10; // percent

export default async function handler(req: AppRequest, res: AppResponse) {
  try {
    if (!req.env?.DB) return res.status(503).json({ error: 'Database not configured' });
    const db = getDb(req.env);

    // ──────────────── GET ────────────────
    if (req.method === 'GET') {
      const rows = await db.prepare('SELECT id, data FROM parts_catalog').bind().all<{ id: string; data: string }>();
      let parts = (rows.results || []).map(r => ({ id: r.id, ...safeJson(r.data) }));

      const { partName, flagged, barcode } = req.query;
      if (partName && typeof partName === 'string') {
        const q = partName.toLowerCase();
        parts = parts.filter((p: any) => (p.partName || p.name || '').toLowerCase().includes(q));
      }
      if (barcode && typeof barcode === 'string') {
        parts = parts.filter((p: any) => p.barcode === barcode);
      }
      if (flagged === '1') {
        parts = parts.filter((p: any) => p.flagged === true);
      }

      return res.status(200).json({ parts, total: parts.length });
    }

    // ──────────────── PATCH — update sell price / markup ────────────────
    if (req.method === 'PATCH') {
      const { partKey, sellPrice, markupPercent } = req.body as { partKey: string; sellPrice?: number; markupPercent?: number };
      if (!partKey) return res.status(400).json({ error: 'Missing partKey' });

      const row = await db.prepare('SELECT id, data FROM parts_catalog WHERE id = ?').bind(partKey).first<{ id: string; data: string }>();
      const existing = safeJson(row?.data);
      const updated = { ...existing, updatedAt: new Date().toISOString() };
      if (sellPrice !== undefined) updated.sellPrice = sellPrice;
      if (markupPercent !== undefined) updated.markupPercent = markupPercent;

      await db.prepare('INSERT INTO parts_catalog (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data')
        .bind(partKey, JSON.stringify(updated)).run();

      return res.status(200).json({ success: true, partKey, sellPrice, markupPercent });
    }

    // ──────────────── POST — ingest items ────────────────
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { items } = req.body as {
      items: Array<{
        partName: string; supplier: string; costPrice: number;
        invoiceRef?: string; barcode?: string; source?: string;
        sellPrice?: number; markupPercent?: number;
      }>;
    };

    if (!items?.length) return res.status(400).json({ error: 'Missing items array' });

    const results: any[] = [];
    const flaggedChanges: any[] = [];
    const now = new Date().toISOString();

    for (const item of items) {
      const partKey = item.partName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');

      const row = await db.prepare('SELECT id, data FROM parts_catalog WHERE id = ?').bind(partKey).first<{ id: string; data: string }>();
      const existing = safeJson(row?.data);
      const previousPrice: number | undefined = existing.costPrice;
      const existingSellPrice: number | null = existing.sellPrice ?? null;
      const existingMarkup: number | null = existing.markupPercent ?? null;

      let priceChangePercent: number | undefined;
      let flagged = false;
      if (previousPrice !== undefined && previousPrice !== item.costPrice) {
        priceChangePercent = parseFloat((((item.costPrice - previousPrice) / previousPrice) * 100).toFixed(1));
        flagged = Math.abs(priceChangePercent) >= PRICE_CHANGE_THRESHOLD;
      }

      const priceHistory: any[] = existing.priceHistory || [];
      priceHistory.push({ price: item.costPrice, supplier: item.supplier, date: now, invoiceRef: item.invoiceRef || null, source: item.source || 'manual' });
      if (priceHistory.length > 50) priceHistory.splice(0, priceHistory.length - 50); // cap history

      const doc: Record<string, any> = {
        partName: item.partName, partKey, supplier: item.supplier,
        costPrice: item.costPrice,
        sellPrice: item.sellPrice ?? existingSellPrice ?? null,
        markupPercent: item.markupPercent ?? existingMarkup ?? null,
        previousPrice: previousPrice ?? null,
        priceChangePercent: priceChangePercent ?? null,
        flagged, invoiceRef: item.invoiceRef || null,
        barcode: item.barcode || null, source: item.source || 'manual',
        updatedAt: now, priceHistory,
      };

      await db.prepare('INSERT INTO parts_catalog (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data')
        .bind(partKey, JSON.stringify(doc)).run();

      results.push(doc);
      if (flagged) flaggedChanges.push(doc);
    }

    return res.status(200).json({
      success: true, processed: results.length, flaggedChanges: flaggedChanges.length,
      flagged: flaggedChanges.map(f => ({ partName: f.partName, supplier: f.supplier, oldPrice: f.previousPrice, newPrice: f.costPrice, changePercent: f.priceChangePercent })),
      results,
    });

  } catch (err: any) {
    console.error('[Pricing API]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
