import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Rexel / Supplier CSV Import Endpoint
 *
 * POST /api/xero/import-csv
 * Body: { csvData: "raw CSV text", supplier?: "Rexel" | "Middys" | ... , invoiceRef?: string }
 *
 * Parses CSV rows, detects column layout (Rexel, Middy's, L&H, generic),
 * then forwards parsed items to /api/xero/pricing for Firestore persistence.
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
}

function detectColumns(headers: string[]): ColumnMap {
  const lower = headers.map(h => h.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim());
  
  const nameIdx = lower.findIndex(h =>
    h.includes('description') || h.includes('product') || h.includes('item name') ||
    h.includes('part name') || h.includes('material') || h === 'name'
  );
  
  const priceIdx = lower.findIndex(h =>
    h.includes('unit price') || h.includes('price ex') || h.includes('cost') ||
    h.includes('unit cost') || h.includes('price') || h.includes('each') ||
    h.includes('rate')
  );
  
  const qtyIdx = lower.findIndex(h =>
    h.includes('qty') || h.includes('quantity') || h.includes('units') || h === 'qty'
  );
  
  const barcodeIdx = lower.findIndex(h =>
    h.includes('barcode') || h.includes('ean') || h.includes('upc') || h.includes('gtin')
  );
  
  const itemCodeIdx = lower.findIndex(h =>
    h.includes('item code') || h.includes('part number') || h.includes('sku') ||
    h.includes('product code') || h.includes('cat no') || h.includes('catalogue')
  );

  return {
    name: nameIdx >= 0 ? nameIdx : 1,     // default: column B
    price: priceIdx >= 0 ? priceIdx : 3,   // default: column D
    qty: qtyIdx >= 0 ? qtyIdx : 2,         // default: column C
    barcode: barcodeIdx,
    itemCode: itemCodeIdx >= 0 ? itemCodeIdx : 0, // default: column A
  };
}

// ─── Supplier auto-detection from CSV content ──────────────────
function detectSupplier(csvText: string): string {
  const upper = csvText.toUpperCase();
  if (upper.includes('REXEL') || upper.includes('IDEAL ELECTRICAL')) return 'Rexel';
  if (upper.includes('MIDDY') || upper.includes("MIDDY'S")) return "Middy's";
  if (upper.includes('L&H') || upper.includes('L & H')) return 'L&H';
  if (upper.includes('LAWRENCE & HANSON')) return 'L&H';
  if (upper.includes('JOHN R TURK') || upper.includes('JRT')) return 'JRT';
  if (upper.includes('CLIPSAL') || upper.includes('SCHNEIDER')) return 'Schneider/Clipsal';
  if (upper.includes('BEACON') || upper.includes('BEACON LIGHTING')) return 'Beacon Lighting';
  return 'Unknown';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.status(200).json({
      endpoint: '/api/xero/import-csv',
      usage: 'POST with { csvData: "raw CSV text", supplier?: "Rexel", invoiceRef?: "INV-123" }',
      supportedFormats: [
        'Rexel invoice CSV',
        "Middy's invoice CSV",
        'L&H invoice CSV',
        'Generic CSV with headers: Description/Product, Price/Unit Price, Qty',
      ],
      note: 'Auto-detects supplier from CSV content if not provided. Auto-detects column layout from headers.',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { csvData, supplier: supplierOverride, invoiceRef } = req.body as {
      csvData: string;
      supplier?: string;
      invoiceRef?: string;
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
        const qtyStr = fields[cols.qty]?.replace(/[^0-9.\-]/g, '') || '';
        const price = parseFloat(priceStr);
        const qty = parseInt(qtyStr) || 1;

        if (!name || isNaN(price) || price <= 0) {
          // Skip empty/header-like rows silently
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

    // Forward to pricing API for Firestore persistence
    const pricingItems = parsed.map(p => ({
      partName: p.itemCode ? `${p.itemCode} - ${p.partName}` : p.partName,
      supplier,
      costPrice: p.costPrice,
      invoiceRef: invoiceRef || null,
      barcode: p.barcode || null,
      source: 'csv',
    }));

    // Call our own pricing endpoint internally
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

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
          qty: headers[cols.qty] || `col ${cols.qty}`,
          barcode: cols.barcode >= 0 ? headers[cols.barcode] : 'not found',
          itemCode: cols.itemCode >= 0 ? headers[cols.itemCode] : 'not found',
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
