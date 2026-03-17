export interface OrderEmailData {
  customerName: string;
  orderId: string;
  orderItems: Array<{ productName: string; lineTotal: number }>;
  subtotal: number;
  deliveryFee: number;
  gst: number;
  total: number;
  deliveryDate: string;
  deliveryAddress: string;
  trackingUrl: string;
  proofUrl?: string;
}

export async function sendEmail(opts: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ id: string } | null> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: opts.from, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) return null;
    return res.json() as Promise<{ id: string }>;
  } catch {
    return null;
  }
}

const STATUS_SUBJECTS: Record<string, string> = {
  order_confirmation: (id: string) => `Order Confirmed — #${id.slice(-8).toUpperCase()}`,
  day_before: () => 'Your delivery is tomorrow 🥩',
  out_for_delivery: () => 'Your order is on its way!',
  delivered: () => 'Delivered ✓ — here\'s your proof of delivery',
  order_cancelled: (id: string) => `Your order has been cancelled — #${id.slice(-8).toUpperCase()}`,
  refund_confirmation: (total: number) => `Refund processed — $${(total / 100).toFixed(2)}`,
} as unknown as Record<string, string>;

export function getSubject(type: string, data: OrderEmailData): string {
  const map: Record<string, string> = {
    order_confirmation: `Order Confirmed — #${data.orderId.slice(-8).toUpperCase()}`,
    day_before: 'Your delivery is tomorrow 🥩',
    out_for_delivery: 'Your order is on its way!',
    delivered: 'Delivered ✓ — here\'s your proof of delivery',
    order_cancelled: `Your order has been cancelled — #${data.orderId.slice(-8).toUpperCase()}`,
    refund_confirmation: `Refund processed — $${(data.total / 100).toFixed(2)}`,
  };
  return map[type] ?? 'Order Update';
}

export function buildOrderEmail(type: string, data: OrderEmailData): string {
  const itemsHtml = data.orderItems
    .map((item) => `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${item.productName}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${(item.lineTotal / 100).toFixed(2)}</td>
    </tr>`)
    .join('');

  const bodies: Record<string, string> = {
    order_confirmation: `<p>Thank you for your order! We've confirmed <strong>#${data.orderId.slice(-8).toUpperCase()}</strong> for delivery on <strong>${data.deliveryDate}</strong>.</p>`,
    day_before: `<p>Your order is scheduled for delivery <strong>tomorrow, ${data.deliveryDate}</strong>. We'll notify you when it's on its way!</p>`,
    out_for_delivery: `<p>Your order is on its way! Our driver is heading to you now.</p>`,
    delivered: `<p>Your order has been successfully delivered. Thank you for choosing The Butcher Online!</p>`,
    order_cancelled: `<p>Your order <strong>#${data.orderId.slice(-8).toUpperCase()}</strong> has been cancelled. Contact us if this is an error.</p>`,
    refund_confirmation: `<p>Your refund of <strong>$${(data.total / 100).toFixed(2)}</strong> has been processed and will appear within 3-5 business days.</p>`,
  };

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#1B3A2E;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="color:white;margin:0;font-size:24px">The Butcher Online</h1>
  </div>
  <div style="background:#f9f9f9;padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px">
    <p>Hi ${data.customerName},</p>
    ${bodies[type] ?? '<p>Your order has been updated.</p>'}
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead><tr style="background:#1B3A2E;color:white">
        <th style="padding:8px;text-align:left">Item</th>
        <th style="padding:8px;text-align:right">Price</th>
      </tr></thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr><td style="padding:8px;text-align:right" colspan="2">Subtotal: $${(data.subtotal / 100).toFixed(2)}</td></tr>
        <tr><td style="padding:8px;text-align:right" colspan="2">Delivery: $${(data.deliveryFee / 100).toFixed(2)}</td></tr>
        <tr><td style="padding:8px;text-align:right" colspan="2">GST: $${(data.gst / 100).toFixed(2)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;text-align:right" colspan="2">Total: $${(data.total / 100).toFixed(2)}</td></tr>
      </tfoot>
    </table>
    <p><strong>Delivery Address:</strong> ${data.deliveryAddress}</p>
    <p><a href="${data.trackingUrl}" style="background:#1B3A2E;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Track My Order</a></p>
    ${data.proofUrl ? `<p><a href="${data.proofUrl}">View Proof of Delivery</a></p>` : ''}
    <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
    <p style="font-size:12px;color:#999">The Butcher Online — Fresh quality meat delivered to your door.</p>
  </div>
</body>
</html>`;
}
