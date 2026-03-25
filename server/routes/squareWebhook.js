const express = require('express');
const crypto = require('crypto');
const SiteSettings = require('../models/SiteSettings');
const FoodOrder = require('../models/FoodOrder');
const WebsiteOrder = require('../models/WebsiteOrder');

const router = express.Router();

// Verify Square webhook signature
function verifySignature(body, signatureHeader, webhookSecret, webhookUrl) {
  if (!webhookSecret || !signatureHeader) return false;
  try {
    const hmac = crypto.createHmac('sha256', webhookSecret);
    hmac.update(webhookUrl + body);
    const expectedSig = hmac.digest('base64');
    return crypto.timingSafeEqual(
      Buffer.from(signatureHeader, 'utf8'),
      Buffer.from(expectedSig, 'utf8')
    );
  } catch (err) {
    console.error('[Square Webhook] Signature verification error:', err.message);
    return false;
  }
}

// POST /api/square/webhook — receive Square event notifications
router.post('/', async (req, res) => {
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const signature = req.headers['x-square-hmacsha256-signature'];
  const eventType = req.body?.type;

  console.log('[Square Webhook] Received:', eventType || 'unknown event');

  // Load settings for signature verification
  let settings;
  try {
    settings = await SiteSettings.findOne({ _singleton: 'site-settings' });
  } catch (err) {
    console.error('[Square Webhook] Failed to load settings:', err.message);
    return res.status(500).json({ error: 'Internal error' });
  }

  // Verify signature if webhook secret is configured
  if (settings?.squareWebhookSecret) {
    const webhookUrl = `${req.protocol}://${req.get('host')}/api/square/webhook`;
    const valid = verifySignature(rawBody, signature, settings.squareWebhookSecret, webhookUrl);
    if (!valid) {
      console.warn('[Square Webhook] Invalid signature — rejected');
      return res.status(403).json({ error: 'Invalid signature' });
    }
    console.log('[Square Webhook] Signature verified');
  } else {
    console.warn('[Square Webhook] No webhook secret configured — skipping signature verification');
  }

  const data = req.body?.data?.object || {};

  try {
    switch (eventType) {
      // ─── Payment Completed ───
      case 'payment.completed': {
        const payment = data.payment || data;
        const paymentId = payment.id;
        const orderId = payment.order_id;
        const amountMoney = payment.amount_money;
        console.log('[Square Webhook] Payment completed:', paymentId, '| Amount:', amountMoney?.amount, amountMoney?.currency);

        // Try to find and update a FoodOrder with this payment ID
        let updated = await FoodOrder.findOneAndUpdate(
          { 'payment.squarePaymentId': paymentId },
          {
            'payment.status': 'paid',
            'payment.paidAt': new Date(),
            status: 'confirmed'
          },
          { new: true }
        );

        if (updated) {
          console.log('[Square Webhook] FoodOrder', updated.orderNumber, 'marked as paid');
          break;
        }

        // Try WebsiteOrder
        updated = await WebsiteOrder.findOneAndUpdate(
          { paymentId: paymentId },
          { status: 'confirmed' },
          { new: true }
        );

        if (updated) {
          console.log('[Square Webhook] WebsiteOrder', updated.orderNumber, 'marked as confirmed');
          break;
        }

        // If no order found by paymentId, try by Square orderId in reference
        if (orderId) {
          updated = await FoodOrder.findOneAndUpdate(
            { 'payment.squareOrderId': orderId },
            {
              'payment.status': 'paid',
              'payment.squarePaymentId': paymentId,
              'payment.paidAt': new Date(),
              status: 'confirmed'
            },
            { new: true }
          );
          if (updated) {
            console.log('[Square Webhook] FoodOrder (by orderId)', updated.orderNumber, 'marked as paid');
          }
        }

        if (!updated) {
          console.log('[Square Webhook] No matching order found for payment:', paymentId);
        }
        break;
      }

      // ─── Payment Updated (refunds, voids) ───
      case 'payment.updated': {
        const payment = data.payment || data;
        const paymentId = payment.id;
        const paymentStatus = payment.status; // COMPLETED, CANCELLED, FAILED
        const refundedMoney = payment.refunded_money;

        console.log('[Square Webhook] Payment updated:', paymentId, '| Status:', paymentStatus);

        if (paymentStatus === 'CANCELLED' || paymentStatus === 'FAILED') {
          // Mark as unpaid / cancelled
          let updated = await FoodOrder.findOneAndUpdate(
            { 'payment.squarePaymentId': paymentId },
            { 'payment.status': 'unpaid', status: 'cancelled' },
            { new: true }
          );
          if (!updated) {
            updated = await WebsiteOrder.findOneAndUpdate(
              { paymentId: paymentId },
              { status: 'cancelled' },
              { new: true }
            );
          }
          if (updated) console.log('[Square Webhook] Order cancelled/failed:', updated.orderNumber);
        }

        if (refundedMoney && refundedMoney.amount > 0) {
          let updated = await FoodOrder.findOneAndUpdate(
            { 'payment.squarePaymentId': paymentId },
            { 'payment.status': 'refunded', status: 'cancelled' },
            { new: true }
          );
          if (!updated) {
            updated = await WebsiteOrder.findOneAndUpdate(
              { paymentId: paymentId },
              { status: 'refunded' },
              { new: true }
            );
          }
          if (updated) console.log('[Square Webhook] Order refunded:', updated.orderNumber, '| Amount:', refundedMoney.amount);
        }
        break;
      }

      // ─── Order Updated (from Square POS) ───
      case 'order.updated': {
        const order = data.order || data;
        const squareOrderId = order.id;
        const state = order.state; // OPEN, COMPLETED, CANCELLED

        console.log('[Square Webhook] Order updated:', squareOrderId, '| State:', state);

        const statusMap = {
          'OPEN': 'preparing',
          'COMPLETED': 'completed',
          'CANCELLED': 'cancelled'
        };

        const newStatus = statusMap[state];
        if (newStatus) {
          const updated = await FoodOrder.findOneAndUpdate(
            { 'payment.squareOrderId': squareOrderId },
            { status: newStatus },
            { new: true }
          );
          if (updated) {
            console.log('[Square Webhook] FoodOrder', updated.orderNumber, '→', newStatus);
          }
        }
        break;
      }

      // ─── Refund events ───
      case 'refund.created':
      case 'refund.updated': {
        const refund = data.refund || data;
        const paymentId = refund.payment_id;
        const refundStatus = refund.status; // PENDING, COMPLETED, REJECTED, FAILED

        console.log('[Square Webhook] Refund', eventType, '| Payment:', paymentId, '| Status:', refundStatus);

        if (refundStatus === 'COMPLETED') {
          let updated = await FoodOrder.findOneAndUpdate(
            { 'payment.squarePaymentId': paymentId },
            { 'payment.status': 'refunded' },
            { new: true }
          );
          if (!updated) {
            updated = await WebsiteOrder.findOneAndUpdate(
              { paymentId: paymentId },
              { status: 'refunded' },
              { new: true }
            );
          }
          if (updated) console.log('[Square Webhook] Order refund completed:', updated.orderNumber);
        }
        break;
      }

      default:
        console.log('[Square Webhook] Unhandled event type:', eventType);
    }
  } catch (err) {
    console.error('[Square Webhook] Processing error:', err);
    // Still return 200 so Square doesn't retry
  }

  // Always return 200 to acknowledge receipt
  res.status(200).json({ received: true });
});

// GET /api/square/webhook — health check for Square to verify endpoint
router.get('/', (req, res) => {
  res.json({ status: 'ok', endpoint: 'Square webhook listener active' });
});

module.exports = router;
