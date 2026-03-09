import Stripe from 'stripe';

const stripeKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' as any })
  : null;

export function requireStripe(): Stripe {
  if (!stripe) throw new Error('Stripe is not configured — set STRIPE_SECRET_KEY');
  return stripe;
}
