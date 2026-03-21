/**
 * Payment Handler Worker
 *
 * DEPRECATED: The main API now handles Stripe webhooks directly via
 * /webhook endpoint (D1-backed). This worker is kept as a thin proxy
 * so any lingering Stripe webhook configurations that point here
 * are forwarded to the main API.
 */

export interface Env {
  API_URL: string; // e.g. https://oconner-api.steve-700.workers.dev
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/stripe/webhook' && request.method === 'POST') {
      const apiUrl = env.API_URL || 'https://oconner-api.steve-700.workers.dev';
      const res = await fetch(`${apiUrl}/webhook/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': request.headers.get('Content-Type') ?? 'application/json',
          'stripe-signature': request.headers.get('stripe-signature') ?? '',
        },
        body: await request.text(),
      });

      return new Response(await res.text(), {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};
