import { getServiceAccountToken, verifyFirebaseJWT } from './auth';

export interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }
    try {
      const decoded = await verifyFirebaseJWT(
        authHeader.replace('Bearer ', ''),
        env.FIREBASE_PROJECT_ID,
      );
      if (decoded.role !== 'admin') return new Response('Forbidden', { status: 403 });
    } catch {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(request.url);
    const accessToken = await getServiceAccountToken(env);

    if (url.pathname.startsWith('/packing-list/')) {
      const deliveryDayId = url.pathname.replace('/packing-list/', '');
      return generatePackingListPDF(deliveryDayId, accessToken, env);
    }

    if (url.pathname.startsWith('/stocktake/')) {
      const sessionId = url.pathname.replace('/stocktake/', '');
      return generateStocktakePDF(sessionId, accessToken, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function fetchFirestore(path: string, accessToken: string, projectId: string): Promise<unknown> {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) throw new Error(`Firestore fetch failed: ${await res.text()}`);
  return res.json();
}

function firestoreValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  const v = val as Record<string, unknown>;
  if (v.stringValue !== undefined) return String(v.stringValue);
  if (v.integerValue !== undefined) return String(v.integerValue);
  if (v.doubleValue !== undefined) return String(v.doubleValue);
  if (v.booleanValue !== undefined) return String(v.booleanValue);
  if (v.timestampValue !== undefined) return new Date(String(v.timestampValue)).toLocaleString('en-AU');
  return JSON.stringify(val);
}

async function generatePackingListPDF(deliveryDayId: string, accessToken: string, env: Env): Promise<Response> {
  const dayDoc = await fetchFirestore(`deliveryDays/${deliveryDayId}`, accessToken, env.FIREBASE_PROJECT_ID) as {
    fields: Record<string, unknown>;
  };
  const stopsRes = await fetchFirestore(
    `deliveryDays/${deliveryDayId}/stops?orderBy=sequence`, accessToken, env.FIREBASE_PROJECT_ID,
  ) as { documents?: Array<{ fields: Record<string, unknown> }> };

  const stops = stopsRes.documents ?? [];
  const dayDate = firestoreValue(dayDoc.fields.date);

  const rows = stops.map((stop) => {
    const f = stop.fields;
    const address = (f.address as Record<string, Record<string, unknown>>);
    const addrStr = address
      ? `${firestoreValue(address.line1)}, ${firestoreValue(address.suburb)} ${firestoreValue(address.postcode)}`
      : '';
    return `<tr>
      <td>${firestoreValue(f.sequence)}</td>
      <td>${firestoreValue(f.customerName)}</td>
      <td>${firestoreValue(f.customerPhone)}</td>
      <td>${addrStr}</td>
      <td>${firestoreValue(f.status)}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Packing List — ${dayDate}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; }
    h1 { color: #1B3A2E; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #1B3A2E; color: white; padding: 8px; text-align: left; }
    td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background: #f9f9f9; }
  </style>
  </head><body>
  <h1>Packing List — ${dayDate}</h1>
  <p>Total stops: ${stops.length}</p>
  <table><thead><tr><th>#</th><th>Customer</th><th>Phone</th><th>Address</th><th>Status</th></tr></thead>
  <tbody>${rows}</tbody></table>
  </body></html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="packing-list-${deliveryDayId}.html"`,
    },
  });
}

async function generateStocktakePDF(sessionId: string, accessToken: string, env: Env): Promise<Response> {
  const sessionDoc = await fetchFirestore(`stocktakeSessions/${sessionId}`, accessToken, env.FIREBASE_PROJECT_ID) as {
    fields: Record<string, unknown>;
  };
  const f = sessionDoc.fields;
  const items = (f.items as { arrayValue?: { values?: Array<{ mapValue: { fields: Record<string, unknown> } }> } })
    ?.arrayValue?.values ?? [];

  const rows = items.map((item) => {
    const fld = item.mapValue.fields;
    const systemQty = firestoreValue(fld.systemQty);
    const countedQty = firestoreValue(fld.countedQty);
    const variance = firestoreValue(fld.variance);
    const varNum = parseFloat(variance) || 0;
    const color = varNum === 0 ? '#4CAF50' : Math.abs(varNum) < 2 ? '#FF9800' : '#F44336';
    return `<tr>
      <td>${firestoreValue(fld.productName)}</td>
      <td>${firestoreValue(fld.unit)}</td>
      <td>${systemQty}</td>
      <td>${countedQty || '—'}</td>
      <td style="color:${color};font-weight:bold">${variance || '—'}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Stocktake Report — ${sessionId}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; }
    h1 { color: #1B3A2E; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #1B3A2E; color: white; padding: 8px; text-align: left; }
    td { padding: 6px 8px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background: #f9f9f9; }
  </style>
  </head><body>
  <h1>Stocktake Report</h1>
  <p>Session: ${sessionId} | Status: ${firestoreValue(f.status)}</p>
  <p>Total Variance Value: $${(parseFloat(firestoreValue(f.totalVarianceValue) || '0') / 100).toFixed(2)}</p>
  <table><thead><tr><th>Product</th><th>Unit</th><th>System Qty</th><th>Counted Qty</th><th>Variance</th></tr></thead>
  <tbody>${rows}</tbody></table>
  </body></html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="stocktake-${sessionId}.html"`,
    },
  });
}
