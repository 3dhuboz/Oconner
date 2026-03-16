import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import sgMail from '@sendgrid/mail';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

const STATUS_EMAIL_MAP: Record<string, string> = {
  confirmed: 'order_confirmation',
  out_for_delivery: 'out_for_delivery',
  delivered: 'delivered',
  cancelled: 'order_cancelled',
  refunded: 'refund_confirmation',
};

export const onOrderStatusChange = functions
  .region('australia-southeast1')
  .firestore.document('orders/{orderId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const { orderId } = context.params;

    if (before.status === after.status) return null;

    const emailType = STATUS_EMAIL_MAP[after.status as string];
    if (!emailType) return null;

    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL ?? 'orders@example.com.au';
    const storefrontUrl = process.env.STOREFRONT_URL ?? 'https://shop.example.com.au';

    if (!apiKey) {
      functions.logger.warn('SENDGRID_API_KEY not set, skipping email');
      return null;
    }
    sgMail.setApiKey(apiKey);

    const templateData = {
      customerName: after.customerName,
      orderId,
      orderItems: after.items,
      subtotal: after.subtotal,
      deliveryFee: after.deliveryFee,
      gst: after.gst,
      total: after.total,
      deliveryDate: after.deliveryDayId,
      deliveryAddress: formatAddress(after.deliveryAddress),
      trackingUrl: `${storefrontUrl}/track/${orderId}`,
      proofUrl: after.status === 'delivered' ? (after.proofUrl ?? '') : undefined,
    };

    const subjects: Record<string, string> = {
      order_confirmation: `Order Confirmed — #${orderId.slice(-8).toUpperCase()}`,
      out_for_delivery: 'Your order is on its way!',
      delivered: 'Delivered ✓ — here\'s your proof of delivery',
      order_cancelled: `Your order has been cancelled — #${orderId.slice(-8).toUpperCase()}`,
      refund_confirmation: `Refund processed — $${(after.total / 100).toFixed(2)}`,
    };

    try {
      const [response] = await sgMail.send({
        to: after.customerEmail as string,
        from: fromEmail,
        subject: subjects[emailType] ?? 'Order Update',
        html: buildEmailHtml(emailType, templateData),
      });

      await db.collection('notifications').add({
        orderId,
        customerId: after.customerId,
        type: emailType,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: response.statusCode >= 200 && response.statusCode < 300 ? 'sent' : 'failed',
        provider: 'sendgrid',
        messageId: response.headers['x-message-id'] ?? '',
        recipientEmail: after.customerEmail,
      });
    } catch (err) {
      functions.logger.error('SendGrid error:', err);
      await db.collection('notifications').add({
        orderId,
        customerId: after.customerId,
        type: emailType,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'failed',
        provider: 'sendgrid',
        messageId: '',
        recipientEmail: after.customerEmail,
      });
    }

    return null;
  });

export const sendDayBeforeReminders = functions
  .region('australia-southeast1')
  .pubsub.schedule('0 18 * * *')
  .timeZone('Australia/Sydney')
  .onRun(async () => {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL ?? 'orders@example.com.au';
    const storefrontUrl = process.env.STOREFRONT_URL ?? 'https://shop.example.com.au';

    if (!apiKey) {
      functions.logger.warn('SENDGRID_API_KEY not set');
      return null;
    }
    sgMail.setApiKey(apiKey);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const daysSnap = await db
      .collection('deliveryDays')
      .where('active', '==', true)
      .where('date', '>=', admin.firestore.Timestamp.fromDate(tomorrow))
      .where('date', '<', admin.firestore.Timestamp.fromDate(dayAfterTomorrow))
      .get();

    for (const dayDoc of daysSnap.docs) {
      const ordersSnap = await db
        .collection('orders')
        .where('deliveryDayId', '==', dayDoc.id)
        .where('status', 'in', ['confirmed', 'preparing', 'packed'])
        .get();

      for (const orderDoc of ordersSnap.docs) {
        const order = orderDoc.data();
        try {
          await sgMail.send({
            to: order.customerEmail as string,
            from: fromEmail,
            subject: 'Your delivery is tomorrow 🥩',
            html: buildEmailHtml('day_before', {
              customerName: order.customerName,
              orderId: orderDoc.id,
              orderItems: order.items,
              subtotal: order.subtotal,
              deliveryFee: order.deliveryFee,
              gst: order.gst,
              total: order.total,
              deliveryDate: new Date(dayDoc.data().date.toDate()).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }),
              deliveryAddress: formatAddress(order.deliveryAddress),
              trackingUrl: `${storefrontUrl}/track/${orderDoc.id}`,
            }),
          });
          functions.logger.info(`Day-before reminder sent to ${order.customerEmail as string}`);
        } catch (err) {
          functions.logger.error('Failed to send day-before reminder:', err);
        }
      }
    }
    return null;
  });

function formatAddress(addr: Record<string, string>): string {
  if (!addr) return '';
  return `${addr.line1}${addr.line2 ? ', ' + addr.line2 : ''}, ${addr.suburb} ${addr.state} ${addr.postcode}`;
}

function buildEmailHtml(type: string, data: Record<string, unknown>): string {
  const itemsHtml = (data.orderItems as Array<Record<string, unknown>> ?? [])
    .map((item) => `<tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${item.productName as string}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${((item.lineTotal as number) / 100).toFixed(2)}</td>
    </tr>`)
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
  <div style="background:#1B3A2E;padding:20px;border-radius:8px 8px 0 0">
    <h1 style="color:white;margin:0;font-size:24px">The Butcher Online</h1>
  </div>
  <div style="background:#f9f9f9;padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 8px 8px">
    <p>Hi ${data.customerName as string},</p>
    ${getEmailBody(type, data)}
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <thead><tr style="background:#1B3A2E;color:white">
        <th style="padding:8px;text-align:left">Item</th>
        <th style="padding:8px;text-align:right">Price</th>
      </tr></thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr><td style="padding:8px;text-align:right" colspan="2">Subtotal: $${((data.subtotal as number) / 100).toFixed(2)}</td></tr>
        <tr><td style="padding:8px;text-align:right" colspan="2">Delivery: $${((data.deliveryFee as number) / 100).toFixed(2)}</td></tr>
        <tr><td style="padding:8px;text-align:right" colspan="2">GST: $${((data.gst as number) / 100).toFixed(2)}</td></tr>
        <tr><td style="padding:8px;text-align:right;font-weight:bold" colspan="2">Total: $${((data.total as number) / 100).toFixed(2)}</td></tr>
      </tfoot>
    </table>
    <p><strong>Delivery Address:</strong> ${data.deliveryAddress as string}</p>
    <p><a href="${data.trackingUrl as string}" style="background:#1B3A2E;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Track My Order</a></p>
    ${data.proofUrl ? `<p><a href="${data.proofUrl as string}">View Proof of Delivery</a></p>` : ''}
    <hr style="margin:24px 0;border:none;border-top:1px solid #eee">
    <p style="font-size:12px;color:#999">The Butcher Online — Fresh quality meat delivered to your door.</p>
  </div>
</body>
</html>`;
}

function getEmailBody(type: string, data: Record<string, unknown>): string {
  const bodies: Record<string, string> = {
    order_confirmation: `<p>Thank you for your order! We've confirmed your order <strong>#${(data.orderId as string).slice(-8).toUpperCase()}</strong> and it's being prepared for delivery on <strong>${data.deliveryDate as string}</strong>.</p>`,
    day_before: `<p>Just a reminder that your order is scheduled for delivery <strong>tomorrow, ${data.deliveryDate as string}</strong>. We'll be in touch when it's on its way!</p>`,
    out_for_delivery: `<p>Your order is on its way! Our driver is heading to you now. You'll receive another notification once it's delivered.</p>`,
    delivered: `<p>Your order has been successfully delivered. Thank you for choosing The Butcher Online!</p>`,
    order_cancelled: `<p>Your order <strong>#${(data.orderId as string).slice(-8).toUpperCase()}</strong> has been cancelled. If you believe this is an error, please contact us.</p>`,
    refund_confirmation: `<p>Your refund of <strong>$${((data.total as number) / 100).toFixed(2)}</strong> has been processed and will appear in your account within 3-5 business days.</p>`,
  };
  return bodies[type] ?? '<p>Your order has been updated.</p>';
}
