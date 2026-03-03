import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Rexel / Supplier Pricing API — persisted to Firestore
 *
 * GET  /api/xero/pricing               — list all parts with latest prices
 * GET  /api/xero/pricing?partName=...   — lookup single part history
 * GET  /api/xero/pricing?flagged=1      — show only flagged price changes
 * POST /api/xero/pricing               — ingest price items (from CSV, email, barcode)
 *   body: { items: [{ partName, supplier, costPrice, invoiceRef?, barcode?, source? }] }
 */

// ─── Firestore REST helpers ────────────────────────────────────
function toFV(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (Array.isArray(val)) return { arrayValue: { values: val.map(toFV) } };
  if (typeof val === 'object') {
    const f: any = {};
    for (const [k, v] of Object.entries(val)) f[k] = toFV(v);
    return { mapValue: { fields: f } };
  }
  return { stringValue: String(val) };
}

function fromFV(fv: any): any {
  if (!fv) return null;
  if ('stringValue' in fv) return fv.stringValue;
  if ('integerValue' in fv) return Number(fv.integerValue);
  if ('doubleValue' in fv) return fv.doubleValue;
  if ('booleanValue' in fv) return fv.booleanValue;
  if ('nullValue' in fv) return null;
  if ('arrayValue' in fv) return (fv.arrayValue.values || []).map(fromFV);
  if ('mapValue' in fv) {
    const obj: any = {};
    for (const [k, v] of Object.entries(fv.mapValue.fields || {})) obj[k] = fromFV(v);
    return obj;
  }
  return null;
}

async function getFirebaseAuth() {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.VITE_FB_API_KEY;
  if (!projectId || !apiKey) throw new Error('Missing Firebase config');

  let idToken = '';
  const email = process.env.WEBHOOK_AUTH_EMAIL;
  const password = process.env.WEBHOOK_AUTH_PASSWORD;
  if (email && password) {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    });
    const d = await r.json();
    if (d.idToken) idToken = d.idToken;
  }
  if (!idToken) {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ returnSecureToken: true }),
    });
    const d = await r.json();
    if (d.idToken) idToken = d.idToken;
    else throw new Error('Firebase auth failed');
  }
  return { projectId, apiKey, idToken };
}

const PRICE_CHANGE_THRESHOLD = 10; // percent

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { projectId, apiKey, idToken } = await getFirebaseAuth();
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` };

    // ──────────────── GET ────────────────
    if (req.method === 'GET') {
      // List all parts from the 'parts_catalog' collection
      const listUrl = `${baseUrl}/parts_catalog?key=${apiKey}&pageSize=500`;
      const listRes = await fetch(listUrl, { headers });
      if (!listRes.ok) return res.status(500).json({ error: 'Firestore read failed' });
      const listData = await listRes.json();

      const parts = (listData.documents || []).map((doc: any) => {
        const fields = doc.fields || {};
        const obj: any = {};
        for (const [k, v] of Object.entries(fields)) obj[k] = fromFV(v);
        obj._id = doc.name.split('/').pop();
        return obj;
      });

      // Filter
      const { partName, flagged, barcode } = req.query;
      let filtered = parts;
      if (partName && typeof partName === 'string') {
        const q = partName.toLowerCase();
        filtered = parts.filter((p: any) => (p.partName || '').toLowerCase().includes(q));
      }
      if (barcode && typeof barcode === 'string') {
        filtered = parts.filter((p: any) => p.barcode === barcode);
      }
      if (flagged === '1') {
        filtered = parts.filter((p: any) => p.flagged === true);
      }

      return res.status(200).json({ parts: filtered, total: filtered.length });
    }

    // ──────────────── PATCH — update sell price / markup for individual items ────────────────
    if (req.method === 'PATCH') {
      const { partKey, sellPrice, markupPercent } = req.body as {
        partKey: string;
        sellPrice?: number;
        markupPercent?: number;
      };
      if (!partKey) return res.status(400).json({ error: 'Missing partKey' });

      const patchFields: any = {};
      if (sellPrice !== undefined) patchFields.sellPrice = toFV(sellPrice);
      if (markupPercent !== undefined) patchFields.markupPercent = toFV(markupPercent);
      patchFields.updatedAt = toFV(new Date().toISOString());

      const patchUrl = `${baseUrl}/parts_catalog/${partKey}?key=${apiKey}&updateMask.fieldPaths=sellPrice&updateMask.fieldPaths=markupPercent&updateMask.fieldPaths=updatedAt`;
      const patchRes = await fetch(patchUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields: patchFields }),
      });
      if (!patchRes.ok) return res.status(500).json({ error: 'Failed to update sell price' });
      return res.status(200).json({ success: true, partKey, sellPrice, markupPercent });
    }

    // ──────────────── POST ────────────────
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { items } = req.body as {
      items: Array<{
        partName: string;
        supplier: string;
        costPrice: number;
        invoiceRef?: string;
        barcode?: string;
        source?: string; // 'csv' | 'email' | 'barcode' | 'manual'
        sellPrice?: number;
        markupPercent?: number;
      }>;
    };

    if (!items?.length) return res.status(400).json({ error: 'Missing items array' });

    const results: any[] = [];
    const flaggedChanges: any[] = [];

    for (const item of items) {
      const partKey = item.partName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');

      // Check if part already exists
      const docUrl = `${baseUrl}/parts_catalog/${partKey}?key=${apiKey}`;
      const existRes = await fetch(docUrl, { headers });
      let previousPrice: number | undefined;
      let existingSellPrice: number | null = null;
      let existingMarkup: number | null = null;

      if (existRes.ok) {
        const existData = await existRes.json();
        if (existData.fields?.costPrice) previousPrice = fromFV(existData.fields.costPrice);
        if (existData.fields?.sellPrice) existingSellPrice = fromFV(existData.fields.sellPrice);
        if (existData.fields?.markupPercent) existingMarkup = fromFV(existData.fields.markupPercent);
      }

      // Calculate price change
      let priceChangePercent: number | undefined;
      let flagged = false;
      if (previousPrice !== undefined && previousPrice !== item.costPrice) {
        priceChangePercent = ((item.costPrice - previousPrice) / previousPrice) * 100;
        priceChangePercent = parseFloat(priceChangePercent.toFixed(1));
        flagged = Math.abs(priceChangePercent) >= PRICE_CHANGE_THRESHOLD;
      }

      const now = new Date().toISOString();

      const doc: Record<string, any> = {
        partName: item.partName,
        partKey,
        supplier: item.supplier,
        costPrice: item.costPrice,
        sellPrice: item.sellPrice ?? existingSellPrice ?? null,
        markupPercent: item.markupPercent ?? existingMarkup ?? null,
        previousPrice: previousPrice ?? null,
        priceChangePercent: priceChangePercent ?? null,
        flagged,
        invoiceRef: item.invoiceRef || null,
        barcode: item.barcode || null,
        source: item.source || 'manual',
        updatedAt: now,
      };

      // Build price history entry
      const historyEntry = {
        price: item.costPrice,
        supplier: item.supplier,
        date: now,
        invoiceRef: item.invoiceRef || null,
        source: item.source || 'manual',
      };

      // Upsert the part document
      const fields: any = {};
      for (const [k, v] of Object.entries(doc)) fields[k] = toFV(v);

      // We use PATCH to upsert
      const patchUrl = `${baseUrl}/parts_catalog/${partKey}?key=${apiKey}`;
      await fetch(patchUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ fields }),
      });

      // Append to price_history sub-collection
      const histFields: any = {};
      for (const [k, v] of Object.entries(historyEntry)) histFields[k] = toFV(v);
      const histUrl = `${baseUrl}/parts_catalog/${partKey}/price_history?key=${apiKey}`;
      await fetch(histUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fields: histFields }),
      });

      results.push(doc);
      if (flagged) flaggedChanges.push(doc);
    }

    return res.status(200).json({
      success: true,
      processed: results.length,
      flaggedChanges: flaggedChanges.length,
      flagged: flaggedChanges.map(f => ({
        partName: f.partName,
        supplier: f.supplier,
        oldPrice: f.previousPrice,
        newPrice: f.costPrice,
        changePercent: f.priceChangePercent,
      })),
      results,
    });

  } catch (err: any) {
    console.error('[Pricing API]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
