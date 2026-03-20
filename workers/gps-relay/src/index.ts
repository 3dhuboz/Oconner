/**
 * GPS Relay Worker
 *
 * DEPRECATED: The driver app now pings the main API directly via
 * api.drivers.ping() → /api/drivers/session/:id/ping (D1-backed).
 *
 * This worker is kept as a thin proxy so any lingering clients that still
 * POST to /ping are forwarded to the main API.  It uses Clerk auth (same
 * as the driver app) instead of the old Firebase JWT flow.
 */

export interface Env {
  API_URL: string; // e.g. https://oconner-api.steve-700.workers.dev
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        },
      });
    }

    const url = new URL(request.url);
    if (url.pathname !== '/ping' || request.method !== 'POST') {
      return new Response('Not Found', { status: 404 });
    }

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      const body = await request.json<{ sessionId: string; lat: number; lng: number }>();
      if (!body.sessionId || body.lat == null || body.lng == null) {
        return new Response('Bad Request: missing sessionId, lat, or lng', { status: 400 });
      }

      // Forward to main API
      const apiUrl = env.API_URL || 'https://oconner-api.steve-700.workers.dev';
      const res = await fetch(`${apiUrl}/api/drivers/session/${body.sessionId}/ping`, {
        method: 'PATCH',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lat: body.lat, lng: body.lng }),
      });

      return new Response(res.ok ? 'OK' : 'Upstream error', {
        status: res.status,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    } catch (err) {
      console.error('GPS relay proxy error:', err);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
