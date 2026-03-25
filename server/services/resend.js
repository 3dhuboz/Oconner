const fetch = require('node-fetch');

async function sendEmail(apiKey, { from, to, subject, html }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, html })
  });
  if (!res.ok) { const err = await res.text(); throw new Error(err); }
  return res.json();
}

async function sendOrderConfirmation(settings, order) {
  const itemRows = order.items.map(item =>
    `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee;">${item.name}${item.variant ? ` (${item.variant})` : ''}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${item.price.toFixed(2)}</td>
    </tr>`
  ).join('');

  const gstLine = order.gst > 0
    ? `<tr><td colspan="2" style="padding:8px;text-align:right;"><strong>GST:</strong></td><td style="padding:8px;text-align:right;">$${order.gst.toFixed(2)}</td></tr>`
    : '';

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#7c3aed;">Order Confirmation</h2>
      <p>Hi ${order.customerName},</p>
      <p>Thank you for your order! Here are your order details:</p>
      <p><strong>Order #:</strong> ${order.orderNumber}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px;text-align:left;">Item</th>
            <th style="padding:8px;text-align:center;">Qty</th>
            <th style="padding:8px;text-align:right;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          <tr><td colspan="2" style="padding:8px;text-align:right;"><strong>Subtotal:</strong></td><td style="padding:8px;text-align:right;">$${order.subtotal.toFixed(2)}</td></tr>
          ${gstLine}
          <tr><td colspan="2" style="padding:8px;text-align:right;"><strong>Shipping:</strong></td><td style="padding:8px;text-align:right;">$${order.shipping.toFixed(2)}</td></tr>
          <tr><td colspan="2" style="padding:8px;text-align:right;"><strong>Total:</strong></td><td style="padding:8px;text-align:right;font-size:18px;color:#7c3aed;"><strong>$${order.total.toFixed(2)}</strong></td></tr>
        </tbody>
      </table>
      ${order.shippingAddress ? `
        <p><strong>Shipping to:</strong><br/>
        ${order.shippingAddress.line1}<br/>
        ${order.shippingAddress.line2 ? order.shippingAddress.line2 + '<br/>' : ''}
        ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postcode}<br/>
        ${order.shippingAddress.country}</p>
      ` : ''}
      <p>We'll send you another email when your order ships.</p>
      <p style="color:#6b7280;font-size:12px;">If you have any questions, reply to this email.</p>
    </div>
  `;

  const from = settings.resendFromName
    ? `${settings.resendFromName} <${settings.resendFromEmail}>`
    : settings.resendFromEmail;

  return sendEmail(settings.resendApiKey, {
    from,
    to: order.customerEmail,
    subject: `Order Confirmation - ${order.orderNumber}`,
    html
  });
}

async function sendShippingNotification(settings, order) {
  const trackingUrl = order.trackingNumber
    ? `${settings.trackingBaseUrl}${order.trackingNumber}`
    : null;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#7c3aed;">Your Order Has Shipped!</h2>
      <p>Hi ${order.customerName},</p>
      <p>Great news! Your order <strong>${order.orderNumber}</strong> has been shipped${settings.carrierName ? ` via ${settings.carrierName}` : ''}.</p>
      ${trackingUrl ? `
        <p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>
        <p><a href="${trackingUrl}" style="display:inline-block;padding:12px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:6px;">Track Your Order</a></p>
      ` : '<p>You will receive tracking information once available.</p>'}
      <p>Thank you for your purchase!</p>
      <p style="color:#6b7280;font-size:12px;">If you have any questions, reply to this email.</p>
    </div>
  `;

  const from = settings.resendFromName
    ? `${settings.resendFromName} <${settings.resendFromEmail}>`
    : settings.resendFromEmail;

  return sendEmail(settings.resendApiKey, {
    from,
    to: order.customerEmail,
    subject: `Shipping Update - ${order.orderNumber}`,
    html
  });
}

module.exports = { sendEmail, sendOrderConfirmation, sendShippingNotification };
