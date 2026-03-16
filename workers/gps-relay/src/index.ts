import { verifyFirebaseJWT, getServiceAccountToken } from './auth';

export interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  KV: KVNamespace;
}

interface GPSPingBody {
  deliveryDayId: string;
  lat: number;
  lng: number;
  accuracy: number;
  ts: number;
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

    const token = authHeader.replace('Bearer ', '');
    let decoded: { uid: string; role?: string } | null = null;

    try {
      decoded = await verifyFirebaseJWT(token, env.FIREBASE_PROJECT_ID);
    } catch {
      return new Response('Unauthorized', { status: 401 });
    }

    if (!decoded || decoded.role !== 'driver') {
      return new Response('Forbidden', { status: 403 });
    }

    let body: GPSPingBody;
    try {
      body = await request.json<GPSPingBody>();
    } catch {
      return new Response('Bad Request', { status: 400 });
    }

    const { deliveryDayId, lat, lng, accuracy, ts } = body;
    if (!deliveryDayId || lat == null || lng == null) {
      return new Response('Bad Request: missing fields', { status: 400 });
    }

    try {
      const accessToken = await getServiceAccountToken(env);
      const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/driverSessions/${decoded.uid}?updateMask.fieldPaths=lastLat&updateMask.fieldPaths=lastLng&updateMask.fieldPaths=lastUpdated`;

      const firestoreRes = await fetch(firestoreUrl, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            lastLat: { doubleValue: lat },
            lastLng: { doubleValue: lng },
            lastUpdated: { timestampValue: new Date(ts).toISOString() },
          },
        }),
      });

      if (!firestoreRes.ok) {
        const err = await firestoreRes.text();
        console.error('Firestore PATCH failed:', err);
        return new Response('Internal Server Error', { status: 500 });
      }

      return new Response('OK', {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    } catch (err) {
      console.error('GPS relay error:', err);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
};
