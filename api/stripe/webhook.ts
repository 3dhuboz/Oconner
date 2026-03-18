import type { AppRequest, AppResponse } from '../_handler';
import { getDb, safeJson } from '../_db';
import Stripe from 'stripe';

export default async function handler(req: AppRequest, res: AppResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: 'Stripe is not configured.' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers.get ? req.headers.get('stripe-signature') : (req.headers as any)['stripe-signature'];

  try {
    const rawBody: string | Buffer = typeof req.body === 'string' || Buffer.isBuffer(req.body)
      ? req.body
      : JSON.stringify(req.body);
    const event = stripe.webhooks.constructEvent(rawBody as any, sig as string, process.env.STRIPE_WEBHOOK_SECRET);

    // Helper to update job payment fields in D1
    const updateJobPayment = async (jobId: string, patch: Record<string, string>) => {
      if (!req.env?.DB) return;
      const db = getDb(req.env);
      const row = await db.prepare('SELECT data FROM jobs WHERE id = ?').bind(jobId).first<{ data: string }>();
      if (!row) return;
      const updated = { ...safeJson(row.data), ...patch, updatedAt: new Date().toISOString() };
      await db.prepare('UPDATE jobs SET data = ?, updated_at = ? WHERE id = ?')
        .bind(JSON.stringify(updated), new Date().toISOString(), jobId).run();
    };

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('[Stripe Webhook] Payment successful for session:', session.id);
        const jobId = session.metadata?.jobId;
        if (jobId) {
          try {
            await updateJobPayment(jobId, {
              paymentStatus: 'paid',
              paidAt: new Date().toISOString(),
              paymentIntentId: (session.payment_intent as string) || '',
            });
            console.log(`[Stripe Webhook] Job ${jobId} marked as paid`);
          } catch (err: any) {
            console.error(`[Stripe Webhook] Failed to update job ${jobId}:`, err.message);
          }
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log('[Stripe Webhook] Charge refunded:', charge.id);
        const jobId = charge.metadata?.jobId;
        if (jobId) {
          try {
            await updateJobPayment(jobId, { paymentStatus: 'refunded' });
            console.log(`[Stripe Webhook] Job ${jobId} marked as refunded`);
          } catch (err: any) {
            console.error(`[Stripe Webhook] Failed to update refund for job ${jobId}:`, err.message);
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        console.log('[Stripe Webhook] Payment failed:', pi.id);
        const jobId = pi.metadata?.jobId;
        if (jobId) {
          try {
            await updateJobPayment(jobId, { paymentStatus: 'failed' });
            console.log(`[Stripe Webhook] Job ${jobId} marked as failed`);
          } catch (err: any) {
            console.error(`[Stripe Webhook] Failed to update failure for job ${jobId}:`, err.message);
          }
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.log('Webhook signature verification failed.', err.message);
    res.status(400).json({ error: err.message });
  }
}
