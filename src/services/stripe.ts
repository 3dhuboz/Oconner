import Stripe from 'stripe';

const stripeKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeKey
  ? new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' })
  : null;

export function requireStripe(): Stripe {
  if (!stripe) throw new Error('Stripe is not configured — set STRIPE_SECRET_KEY');
  return stripe;
}
