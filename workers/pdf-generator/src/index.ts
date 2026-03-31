export interface Env {
  API_URL: string;
}

interface OrderItem { productName: string; quantity?: number; weight?: number; lineTotal: number; isMeatPack?: boolean }
interface Order {
  id: string; customerName: string; customerPhone: string; customerEmail: string;
  items: OrderItem[]; subtotal: number; deliveryFee: number; gst: number; total: number;
  status: string; deliveryAddress: { line1: string; line2?: string; suburb: string; state: string; postcode: string };
  createdAt: number; deliveryDayId: string; notes?: string; internalNotes?: string;
}
interface Stop {
  id: string; sequence: number; customerName: string; customerPhone: string;
  address: { line1: string; suburb: string; postcode: string };
  items: OrderItem[]; status: string;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    const meRes = await fetch(`${env.API_URL}/api/users/me`, {
      headers: { Authorization: authHeader },
    });
    if (!meRes.ok) return new Response('Unauthorized', { status: 401 });
    const me = await meRes.json() as { role?: string };
    if (me.role !== 'admin') return new Response('Forbidden', { status: 403 });

    const url = new URL(request.url);

    if (url.pathname.startsWith('/packing-list/')) {
      const id = url.pathname.replace('/packing-list/', '');
      return generateOrderPackingList(id, authHeader, env);
    }

    if (url.pathname.startsWith('/delivery-list/')) {
      const deliveryDayId = url.pathname.replace('/delivery-list/', '');
      return generateDeliveryList(deliveryDayId, authHeader, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function generateOrderPackingList(orderId: string, auth: string, env: Env): Promise<Response> {
  const res = await fetch(`${env.API_URL}/api/orders/${orderId}`, { headers: { Authorization: auth } });
  if (!res.ok) return new Response('Order not found', { status: 404 });
  const order = await res.json() as Order;

  const addr = order.deliveryAddress
    ? `${order.deliveryAddress.line1}${order.deliveryAddress.line2 ? ', ' + order.deliveryAddress.line2 : ''}, ${order.deliveryAddress.suburb} ${order.deliveryAddress.state} ${order.deliveryAddress.postcode}`
    : '';

  const itemRows = order.items.map((item) => `<tr>
    <td style="padding:6px 8px;border-bottom:1px solid #ddd">${item.productName}</td>
    <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:center">${item.isMeatPack ? `×${item.quantity ?? 1}` : item.weight ? `${item.weight}g` : '—'}</td>
    <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:right">$${(item.lineTotal / 100).toFixed(2)}</td>
  </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Packing List — Order #${order.id.slice(-8).toUpperCase()}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 13px; color: #222; max-width: 800px; margin: 0 auto; padding: 24px; }
    h1 { color: #1B3A2E; margin-bottom: 4px; }
    .meta { color: #666; margin-bottom: 20px; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1B3A2E; color: white; padding: 8px; text-align: left; }
    tr:nth-child(even) td { background: #f9f9f9; }
    .totals td { padding: 4px 8px; }
    .totals .label { text-align: right; color: #555; }
    .grand-total td { font-weight: bold; font-size: 15px; border-top: 2px solid #1B3A2E; padding: 8px; }
  </style></head><body>
  <h1>Packing List — Order #${order.id.slice(-8).toUpperCase()}</h1>
  <div class="meta">
    <strong>${order.customerName}</strong> &nbsp;|&nbsp; ${order.customerPhone}<br>
    ${addr}<br>
    Created: ${new Date(order.createdAt).toLocaleString('en-AU')} &nbsp;|&nbsp; Status: ${order.status}
    ${order.notes ? `<br>Note: ${order.notes}` : ''}
    ${order.internalNotes ? `<br>Internal: ${order.internalNotes}` : ''}
  </div>
  <table>
    <thead><tr><th>Product</th><th style="text-align:center">Qty / Weight</th><th style="text-align:right">Price</th></tr></thead>
    <tbody>${itemRows}</tbody>
    <tfoot>
      <tr class="totals"><td colspan="2" class="label">Subtotal</td><td style="text-align:right;padding:4px 8px">$${(order.subtotal / 100).toFixed(2)}</td></tr>
      <tr class="totals"><td colspan="2" class="label">Delivery</td><td style="text-align:right;padding:4px 8px">$${(order.deliveryFee / 100).toFixed(2)}</td></tr>
      <tr class="totals"><td colspan="2" class="label">GST</td><td style="text-align:right;padding:4px 8px">$${(order.gst / 100).toFixed(2)}</td></tr>
      <tr class="grand-total"><td colspan="2" style="text-align:right">Total</td><td style="text-align:right">$${(order.total / 100).toFixed(2)}</td></tr>
    </tfoot>
  </table>
  </body></html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders(),
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="packing-list-${order.id.slice(-8)}.html"`,
    },
  });
}

async function generateDeliveryList(deliveryDayId: string, auth: string, env: Env): Promise<Response> {
  const [dayRes, stopsRes] = await Promise.all([
    fetch(`${env.API_URL}/api/delivery-days/${deliveryDayId}`, { headers: { Authorization: auth } }),
    fetch(`${env.API_URL}/api/stops?deliveryDayId=${deliveryDayId}`, { headers: { Authorization: auth } }),
  ]);
  if (!dayRes.ok) return new Response('Delivery day not found', { status: 404 });
  const day = await dayRes.json() as { date: number; notes?: string };
  const stops = await stopsRes.json() as Stop[];

  const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
  const dateStr = new Date(day.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const rows = sorted.map((stop) => {
    const addr = stop.address ? `${stop.address.line1}, ${stop.address.suburb} ${stop.address.postcode}` : '';
    const items = stop.items?.map((i) => `${i.productName}${i.isMeatPack ? ` ×${i.quantity ?? 1}` : i.weight ? ` ${i.weight}g` : ''}`).join(', ') ?? '';
    return `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;text-align:center">${stop.sequence}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd">${stop.customerName}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd">${stop.customerPhone}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd">${addr}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd;font-size:11px">${items}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #ddd">${stop.status}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Delivery List — ${dateStr}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #222; padding: 24px; }
    h1 { color: #1B3A2E; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #1B3A2E; color: white; padding: 8px; text-align: left; }
    tr:nth-child(even) td { background: #f9f9f9; }
  </style></head><body>
  <h1>Delivery List — ${dateStr}</h1>
  <p>Total stops: ${stops.length}${day.notes ? ` &nbsp;|&nbsp; ${day.notes}` : ''}</p>
  <table><thead><tr><th>#</th><th>Customer</th><th>Phone</th><th>Address</th><th>Items</th><th>Status</th></tr></thead>
  <tbody>${rows}</tbody></table>
  </body></html>`;

  return new Response(html, {
    headers: {
      ...corsHeaders(),
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="delivery-list-${deliveryDayId}.html"`,
    },
  });
}
