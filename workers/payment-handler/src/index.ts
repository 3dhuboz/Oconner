import { getServiceAccountToken } from './auth';

export interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/stripe/webhook' && request.method === 'POST') {
      return handleStripeWebhook(request, env);
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  const sig = request.headers.get('stripe-signature');
  if (!sig) return new Response('Missing signature', { status: 400 });

  const rawBody = await request.text();

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = await verifyStripeSignature(rawBody, sig, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  console.log('Stripe event:', event.type);

  try {
    const accessToken = await getServiceAccountToken(env);

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as { id: string; metadata?: { orderId?: string } };
        const orderId = pi.metadata?.orderId;
        if (orderId) {
          await updateOrderInFirestore(orderId, { status: 'confirmed', paymentStatus: 'paid' }, accessToken, env);
        }
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as { id: string; metadata?: { orderId?: string } };
        const orderId = pi.metadata?.orderId;
        if (orderId) {
          await updateOrderInFirestore(orderId, { status: 'pending_payment', paymentStatus: 'failed' }, accessToken, env);
        }
        break;
      }
      case 'charge.refunded': {
        const charge = event.data.object as { payment_intent?: string };
        if (charge.payment_intent) {
          await updateOrderByPaymentIntentInFirestore(String(charge.payment_intent), { status: 'refunded', paymentStatus: 'refunded' }, accessToken, env);
        }
        break;
      }
      default:
        console.log('Unhandled Stripe event type:', event.type);
    }
  } catch (err) {
    console.error('Error processing Stripe event:', err);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function updateOrderInFirestore(
  orderId: string,
  fields: Record<string, unknown>,
  accessToken: string,
  env: Env,
): Promise<void> {
  const firestoreFields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    firestoreFields[k] = { stringValue: String(v) };
  }

  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/orders/${orderId}?updateMask.fieldPaths=${Object.keys(fields).join('&updateMask.fieldPaths=')}`,
    {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: firestoreFields }),
    },
  );
  if (!res.ok) throw new Error(`Firestore update failed: ${await res.text()}`);
}

async function updateOrderByPaymentIntentInFirestore(
  paymentIntentId: string,
  fields: Record<string, unknown>,
  accessToken: string,
  env: Env,
): Promise<void> {
  const queryRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'orders' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'paymentIntentId' },
              op: 'EQUAL',
              value: { stringValue: paymentIntentId },
            },
          },
          limit: 1,
        },
      }),
    },
  );
  const results = await queryRes.json() as Array<{ document?: { name: string } }>;
  const docName = results[0]?.document?.name;
  if (!docName) return;
  const orderId = docName.split('/').pop()!;
  await updateOrderInFirestore(orderId, fields, accessToken, env);
}

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
): Promise<{ type: string; data: { object: Record<string, unknown> } }> {
  const pairs = sigHeader.split(',');
  let timestamp = '';
  const signatures: string[] = [];
  for (const pair of pairs) {
    const [key, val] = pair.split('=');
    if (key === 't') timestamp = val;
    if (key === 'v1') signatures.push(val);
  }

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  if (!signatures.includes(computed)) throw new Error('Signature mismatch');

  const diff = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (diff > 300) throw new Error('Timestamp too old');

  return JSON.parse(payload);
}
