import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Xero/Rexel Pricing Capture API
 * 
 * POST /api/xero/pricing
 * - Captures cost prices from supplier invoices (Rexel, Middy's, etc.)
 * - Stores pricing data for parts catalog
 * - Detects price changes and flags for notification
 * 
 * GET /api/xero/pricing?partName=...
 * - Lookup historical pricing for a part
 */

interface PriceEntry {
  partName: string;
  supplier: string;       // e.g. "Rexel", "Middy's", "L&H"
  costPrice: number;
  previousPrice?: number;
  priceChangePercent?: number;
  invoiceRef?: string;
  capturedAt: string;
  flagged: boolean;        // true if price changed significantly
}

// In-memory price store (would be Firestore in production)
const priceHistory: Map<string, PriceEntry[]> = new Map();

// Price change threshold that triggers a flag (10%)
const PRICE_CHANGE_THRESHOLD = 0.10;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { partName } = req.query;
    if (partName && typeof partName === 'string') {
      const key = partName.toLowerCase().trim();
      const history = priceHistory.get(key) || [];
      return res.status(200).json({ partName, history });
    }
    // Return all tracked parts summary
    const summary = Array.from(priceHistory.entries()).map(([key, entries]) => {
      const latest = entries[entries.length - 1];
      return {
        partName: latest.partName,
        supplier: latest.supplier,
        currentPrice: latest.costPrice,
        previousPrice: latest.previousPrice,
        priceChangePercent: latest.priceChangePercent,
        flagged: latest.flagged,
        lastUpdated: latest.capturedAt,
        historyCount: entries.length,
      };
    });
    return res.status(200).json({ parts: summary, total: summary.length });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { items } = req.body as {
    items: Array<{
      partName: string;
      supplier: string;
      costPrice: number;
      invoiceRef?: string;
    }>;
  };

  if (!items?.length) {
    return res.status(400).json({ error: 'Missing items array' });
  }

  const results: PriceEntry[] = [];
  const flaggedChanges: PriceEntry[] = [];

  for (const item of items) {
    const key = item.partName.toLowerCase().trim();
    const existing = priceHistory.get(key) || [];
    const lastEntry = existing[existing.length - 1];
    
    const previousPrice = lastEntry?.costPrice;
    let priceChangePercent: number | undefined;
    let flagged = false;

    if (previousPrice && previousPrice !== item.costPrice) {
      priceChangePercent = ((item.costPrice - previousPrice) / previousPrice) * 100;
      flagged = Math.abs(priceChangePercent) >= PRICE_CHANGE_THRESHOLD * 100;
    }

    const entry: PriceEntry = {
      partName: item.partName,
      supplier: item.supplier,
      costPrice: item.costPrice,
      previousPrice,
      priceChangePercent: priceChangePercent ? parseFloat(priceChangePercent.toFixed(1)) : undefined,
      invoiceRef: item.invoiceRef,
      capturedAt: new Date().toISOString(),
      flagged,
    };

    existing.push(entry);
    priceHistory.set(key, existing);
    results.push(entry);

    if (flagged) {
      flaggedChanges.push(entry);
    }
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
}
