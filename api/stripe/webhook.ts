import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ error: 'Stripe is not configured.' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'] as string;

  try {
    const rawBody = await getRawBody(req);
    const event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);

    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('[Stripe Webhook] Payment successful for session:', session.id);
        
        // Extract jobId from metadata
        const jobId = session.metadata?.jobId;
        if (jobId) {
          // Update job in Firestore
          const projectId = process.env.VITE_FIREBASE_PROJECT_ID;
          const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.VITE_FB_API_KEY;
          
          if (projectId && apiKey) {
            try {
              const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/jobs/${jobId}?updateMask.fieldPaths=paymentStatus&updateMask.fieldPaths=paidAt&updateMask.fieldPaths=paymentIntentId&key=${apiKey}`;
              
              await fetch(firestoreUrl, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fields: {
                    paymentStatus: { stringValue: 'paid' },
                    paidAt: { stringValue: new Date().toISOString() },
                    paymentIntentId: { stringValue: session.payment_intent as string || '' },
                  },
                }),
              });
              
              console.log(`[Stripe Webhook] Job ${jobId} marked as paid`);
            } catch (err: any) {
              console.error(`[Stripe Webhook] Failed to update job ${jobId}:`, err.message);
            }
          }
        }
        break;
      default:
        console.log(`[Stripe Webhook] Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (err: any) {
    console.log('Webhook signature verification failed.', err.message);
    res.status(400).json({ error: err.message });
  }
}
