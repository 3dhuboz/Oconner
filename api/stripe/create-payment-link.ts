import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return res.status(500).json({ error: 'Stripe not configured - set STRIPE_SECRET_KEY' });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-01-28.clover' as any });

  try {
    const { jobId, amount, description, customerEmail } = req.body;

    if (!jobId || !amount) {
      return res.status(400).json({ error: 'jobId and amount are required' });
    }

    // Create a Stripe Payment Link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: description || `Electrical Service - Job ${jobId}`,
              description: `Payment for job ${jobId}`,
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        jobId,
        source: 'field_payment',
      },
      after_completion: {
        type: 'hosted_confirmation',
        hosted_confirmation: {
          custom_message: 'Thank you for your payment! Your receipt has been sent to your email.',
        },
      },
      ...(customerEmail && {
        customer_creation: 'always',
        invoice_creation: {
          enabled: true,
          invoice_data: {
            description: `Electrical Service - Job ${jobId}`,
            metadata: { jobId },
          },
        },
      }),
    });

    console.log(`[Stripe] Payment link created for job ${jobId}: ${paymentLink.url}`);

    return res.status(200).json({
      success: true,
      paymentLinkUrl: paymentLink.url,
      paymentLinkId: paymentLink.id,
    });
  } catch (error: any) {
    console.error('[Stripe] Payment link creation failed:', error.message);
    return res.status(500).json({
      error: 'Failed to create payment link',
      details: error.message,
    });
  }
}
