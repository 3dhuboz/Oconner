import type { AppRequest, AppResponse } from '../_handler';
import Stripe from 'stripe';

export default async function handler(req: AppRequest, res: AppResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.json({ plans: [], simulated: true });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const prices = await stripe.prices.list({
      active: true,
      expand: ['data.product'],
    });
    res.json({ plans: prices.data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
