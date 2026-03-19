import type { AppRequest, AppResponse } from '../_handler';
import { getDb, safeJson } from '../_db';

/**
 * Rexel / Supplier CSV Import Endpoint
 *
 * POST /api/xero/import-csv
 * Body: { csvData: "raw CSV text", supplier?: "Rexel" | "Middys" | ... , invoiceRef?: string }
 *
 * Parses CSV rows, detects column layout (Rexel, Middy's, L&H, generic),
 * then forwards parsed items to /api/xero/pricing for D1 persistence.
 *
 * Supports common Rexel CSV formats:
 *   - "Item Code","Description","Qty","Unit Price","Total"
 *   - "Part Number","Product","Quantity","Price Ex GST","GST","Total"
 *   - Generic: auto-detect columns by header name
 */

interface ParsedLine {
  partName: string;
  costPrice: number;
  quantity: number;
  barcode?: string;
  itemCode?: string;
}

// ─── CSV parser (handles quoted fields) ────────────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── Column detection ──────────────────────────────────────────
interface ColumnMap {
  name: number;
  price: number;
  qty: number;
  barcode: number;
  itemCode: number;
  sku: number;       // e.g. PurchasesDescription "SKU: CLI2015WE"
}

function detectColumns(headers: string[]): ColumnMap {
  // Strip non-alphanumeric (except spaces) for matching, but keep originals for Rexel exact match
  const lower = headers.map(h => h.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim());
  const raw = headers.map(h => h.trim());

  // ── Rexel-specific: *ItemCode, ItemName, PurchasesDescription, PurchasesUnitPrice ──
  const isRexel = raw.some(h => h === '*ItemCode' || h === 'ItemName' || h === 'PurchasesUnitPrice');

  let nameIdx: number;
  let priceIdx: number;
  let itemCodeIdx: number;
  let skuIdx: number;

  if (isRexel) {
    // Rexel exact match
    nameIdx = raw.findIndex(h => h === 'ItemName');
    priceIdx = raw.findIndex(h => h === 'PurchasesUnitPrice');
    itemCodeIdx = raw.findIndex(h => h === '*ItemCode' || h === 'ItemCode');
    skuIdx = raw.findIndex(h => h === 'PurchasesDescription');
  } else {
    // Generic: prioritise "item name" / "product" over "description" to avoid SKU columns
    nameIdx = lower.findIndex(h =>
      h === 'itemname' || h === 'item name' || h === 'product' || h === 'part name' ||
      h === 'material' || h === 'name'
    );
    // Fallback to description only if no better match
    if (nameIdx < 0) {
      nameIdx = lower.findIndex(h => h.includes('description') && !h.includes('purchases'));
    }
    if (nameIdx < 0) {
      nameIdx = lower.findIndex(h => h.includes('description'));
    }

    priceIdx = lower.findIndex(h =>
      h === 'purchasesunitprice' || h.includes('unit price') || h.includes('price ex') ||
      h.includes('unit cost') || h.includes('cost price')
    );
    if (priceIdx < 0) {
      priceIdx = lower.findIndex(h =>
        (h.includes('price') || h.includes('cost') || h.includes('each') || h.includes('rate')) &&
        !h.includes('tax')
      );
    }

    itemCodeIdx = lower.findIndex(h =>
      h === 'itemcode' || h.includes('item code') || h.includes('part number') ||
      h.includes('product code') || h.includes('cat no') || h.includes('catalogue')
    );

    skuIdx = lower.findIndex(h =>
      h === 'purchasesdescription' || h === 'sku' ||
      (h.includes('sku') && !h.includes('description'))
    );
  }

  const qtyIdx = lower.findIndex(h =>
    h.includes('qty') || h.includes('quantity') || h.includes('units')
  );

  const barcodeIdx = lower.findIndex(h =>
    h.includes('barcode') || h.includes('ean') || h.includes('upc') || h.includes('gtin')
  );

  return {
    name: nameIdx >= 0 ? nameIdx : 1,        // default: column B
    price: priceIdx >= 0 ? priceIdx : 3,      // default: column D
    qty: qtyIdx >= 0 ? qtyIdx : -1,           // -1 = not found (Rexel doesn't have qty)
    barcode: barcodeIdx,
    itemCode: itemCodeIdx >= 0 ? itemCodeIdx : 0,  // default: column A
    sku: skuIdx,
  };
}

// ─── Supplier auto-detection from CSV content ──────────────────
function detectSupplier(csvText: string): string {
  const upper = csvText.toUpperCase();
  // Rexel: detect from column headers or content
  if (upper.includes('REXEL') || upper.includes('IDEAL ELECTRICAL')) return 'Rexel';
  if (csvText.includes('*ItemCode') || csvText.includes('PurchasesUnitPrice')) return 'Rexel';
  if (upper.includes('MIDDY') || upper.includes("MIDDY'S")) return "Middy's";
  if (upper.includes('L&H') || upper.includes('L & H')) return 'L&H';
  if (upper.includes('LAWRENCE & HANSON')) return 'L&H';
  if (upper.includes('JOHN R TURK') || upper.includes('JRT')) return 'JRT';
  if (upper.includes('CLIPSAL') || upper.includes('SCHNEIDER')) return 'Schneider/Clipsal';
  if (upper.includes('BEACON') || upper.includes('BEACON LIGHTING')) return 'Beacon Lighting';
  return 'Unknown';
}


export default async function handler(req: AppRequest, res: AppResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({
      endpoint: '/api/xero/import-csv',
      usage: 'POST with { csvData: "raw CSV text", supplier?: "Rexel", invoiceRef?: "INV-123", dryRun?: true }',
      supportedFormats: [
        'Rexel invoice CSV',
        "Middy's invoice CSV",
        'L&H invoice CSV',
        'Generic CSV with headers: Description/Product, Price/Unit Price, Qty',
      ],
      note: 'Set dryRun=true to preview items and compare against existing catalog without writing.',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { csvData, supplier: supplierOverride, invoiceRef, dryRun } = req.body as {
      csvData: string;
      supplier?: string;
      invoiceRef?: string;
      dryRun?: boolean;
    };

    if (!csvData?.trim()) {
      return res.status(400).json({ error: 'Missing csvData field' });
    }

    const lines = csvData.trim().split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) {
      return res.status(400).json({ error: 'CSV must have at least a header row and one data row' });
    }

    // Detect supplier
    const supplier = supplierOverride || detectSupplier(csvData);

    // Parse header
    const headers = parseCSVLine(lines[0]);
    const cols = detectColumns(headers);

    // Parse data rows
    const parsed: ParsedLine[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const fields = parseCSVLine(lines[i]);
        const name = fields[cols.name]?.trim();
        const priceStr = fields[cols.price]?.replace(/[^0-9.\-]/g, '') || '';
        const qtyStr = cols.qty >= 0 ? (fields[cols.qty]?.replace(/[^0-9.\-]/g, '') || '') : '';
        const price = parseFloat(priceStr);
        const qty = qtyStr ? (parseInt(qtyStr) || 1) : 1;

        if (!name || isNaN(price) || price <= 0) {
          if (name) errors.push(`Row ${i + 1}: invalid price for "${name}"`);
          continue;
        }

        const item: ParsedLine = { partName: name, costPrice: price, quantity: qty };

        if (cols.barcode >= 0 && fields[cols.barcode]) {
          item.barcode = fields[cols.barcode].trim();
        }
        if (cols.itemCode >= 0 && fields[cols.itemCode]) {
          item.itemCode = fields[cols.itemCode].trim();
        }
        // Extract SKU from PurchasesDescription (e.g. "SKU: CLI2015WE")
        if (cols.sku >= 0 && fields[cols.sku]) {
          const skuVal = fields[cols.sku].trim();
          const skuMatch = skuVal.match(/^SKU:\s*(.+)/i);
          if (skuMatch) {
            // Use SKU as itemCode if not already set
            if (!item.itemCode) item.itemCode = skuMatch[1].trim();
          }
        }

        parsed.push(item);
      } catch {
        errors.push(`Row ${i + 1}: parse error`);
      }
    }

    if (parsed.length === 0) {
      return res.status(400).json({
        error: 'No valid items found in CSV',
        detectedColumns: { headers, mapping: cols },
        errors,
      });
    }

    // Build items list
    const pricingItems = parsed.map(p => ({
      partName: p.itemCode ? `${p.itemCode} - ${p.partName}` : p.partName,
      supplier,
      costPrice: p.costPrice,
      quantity: p.quantity,
      invoiceRef: invoiceRef || null,
      barcode: p.barcode || null,
      itemCode: p.itemCode || null,
      source: 'csv',
    }));

    // ═══════════════════════════════════════════════════════════════
    // DRY RUN — parse + compare against existing catalog, no writes
    // ═══════════════════════════════════════════════════════════════
    if (dryRun) {
      const db = req.env?.DB ? getDb(req.env) : null;
      const preview: Array<{
        partName: string; partKey: string; newPrice: number; oldPrice: number | null;
        changePercent: number | null; status: 'new' | 'unchanged' | 'price_change';
        supplier: string; quantity: number; barcode: string | null; itemCode: string | null;
      }> = [];

      for (const item of pricingItems) {
        const partKey = item.partName.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
        let oldPrice: number | null = null;
        let status: 'new' | 'unchanged' | 'price_change' = 'new';

        if (db) {
          try {
            const row = await db.prepare('SELECT data FROM parts_catalog WHERE id = ?').bind(partKey).first<{ data: string }>();
            if (row) {
              const existing = safeJson(row.data);
              oldPrice = existing.costPrice ?? null;
              if (oldPrice !== null) {
                status = Math.abs(oldPrice - item.costPrice) < 0.005 ? 'unchanged' : 'price_change';
              }
            }
          } catch { /* part not found = new */ }
        }

        let changePercent: number | null = null;
        if (oldPrice !== null && status === 'price_change') {
          changePercent = oldPrice !== 0
            ? parseFloat((((item.costPrice - oldPrice) / oldPrice) * 100).toFixed(1))
            : null;
        }

        preview.push({
          partName: item.partName,
          partKey,
          newPrice: item.costPrice,
          oldPrice,
          changePercent,
          status,
          supplier: item.supplier,
          quantity: item.quantity,
          barcode: item.barcode,
          itemCode: item.itemCode,
        });
      }

      const newCount = preview.filter(p => p.status === 'new').length;
      const changedCount = preview.filter(p => p.status === 'price_change').length;
      const unchangedCount = preview.filter(p => p.status === 'unchanged').length;

      return res.status(200).json({
        dryRun: true,
        supplier,
        invoiceRef: invoiceRef || null,
        rowsParsed: parsed.length,
        summary: { new: newCount, priceChanges: changedCount, unchanged: unchangedCount },
        detectedColumns: {
          headers,
          mapping: {
            name: headers[cols.name] || `col ${cols.name}`,
            price: headers[cols.price] || `col ${cols.price}`,
            qty: cols.qty >= 0 ? (headers[cols.qty] || `col ${cols.qty}`) : 'not found',
            barcode: cols.barcode >= 0 ? headers[cols.barcode] : 'not found',
            itemCode: cols.itemCode >= 0 ? headers[cols.itemCode] : 'not found',
            sku: cols.sku >= 0 ? headers[cols.sku] : 'not found',
          },
        },
        items: preview,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // REAL IMPORT — forward selected items to pricing API
    // ═══════════════════════════════════════════════════════════════
    const baseUrl = process.env.APP_URL || 'http://localhost:3000';

    const pricingRes = await fetch(`${baseUrl}/api/xero/pricing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: pricingItems }),
    });

    const pricingResult = await pricingRes.json();

    return res.status(200).json({
      success: true,
      supplier,
      invoiceRef: invoiceRef || null,
      rowsParsed: parsed.length,
      detectedColumns: {
        headers,
        mapping: {
          name: headers[cols.name] || `col ${cols.name}`,
          price: headers[cols.price] || `col ${cols.price}`,
          qty: cols.qty >= 0 ? (headers[cols.qty] || `col ${cols.qty}`) : 'not found',
          barcode: cols.barcode >= 0 ? headers[cols.barcode] : 'not found',
          itemCode: cols.itemCode >= 0 ? headers[cols.itemCode] : 'not found',
          sku: cols.sku >= 0 ? headers[cols.sku] : 'not found',
        },
      },
      pricing: pricingResult,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (err: any) {
    console.error('[CSV Import]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
