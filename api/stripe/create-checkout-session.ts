import type { AppRequest, AppResponse } from '../_handler';
import Stripe from 'stripe';

export default async function handler(req: AppRequest, res: AppResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(400).json({ error: 'Stripe is not configured.' });
  }

  const { priceId } = req.body;
  if (!priceId) return res.status(400).json({ error: 'priceId is required' });

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/billing?success=true`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/billing?canceled=true`,
    });
    res.json({ sessionId: session.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
