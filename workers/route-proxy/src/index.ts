import { verifyFirebaseJWT } from './auth';
import { getServiceAccountToken } from './auth';

export interface Env {
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  GOOGLE_MAPS_API_KEY: string;
  GEOCODE_KV: KVNamespace;
}

interface StopInput {
  stopId: string;
  lat?: number;
  lng?: number;
  address?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    const url = new URL(request.url);

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response('Unauthorized', { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    try {
      const decoded = await verifyFirebaseJWT(token, env.FIREBASE_PROJECT_ID);
      if (decoded.role !== 'admin') return new Response('Forbidden', { status: 403 });
    } catch {
      return new Response('Unauthorized', { status: 401 });
    }

    if (url.pathname === '/optimise-route' && request.method === 'POST') {
      return handleOptimiseRoute(request, env);
    }

    if (url.pathname.startsWith('/geocode') && request.method === 'GET') {
      const address = url.searchParams.get('address');
      if (!address) return new Response('Missing address', { status: 400 });
      const result = await geocodeAddress(address, env);
      return corsResponse(result);
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function handleOptimiseRoute(request: Request, env: Env): Promise<Response> {
  const { deliveryDayId, stops, departureTimeMs } = await request.json<{
    deliveryDayId: string;
    stops: StopInput[];
    departureTimeMs?: number;
  }>();
  const departureEpoch = departureTimeMs ?? Date.now();

  const accessToken = await getServiceAccountToken(env);

  const stopsWithCoords = await Promise.all(
    stops.map(async (stop) => {
      if (stop.lat && stop.lng) return stop;
      if (!stop.address) return stop;

      const cacheKey = `geocode:${stop.address}`;
      const cached = await env.GEOCODE_KV.get(cacheKey, 'json') as { lat: number; lng: number } | null;
      if (cached) return { ...stop, lat: cached.lat, lng: cached.lng };

      const coords = await geocodeAddress(stop.address, env);
      if (coords) {
        await env.GEOCODE_KV.put(cacheKey, JSON.stringify(coords), { expirationTtl: 60 * 60 * 24 * 30 });
        return { ...stop, lat: coords.lat, lng: coords.lng };
      }
      return stop;
    }),
  );

  const validStops = stopsWithCoords.filter((s) => s.lat && s.lng);
  if (validStops.length < 2) {
    return corsResponse({ orderedStops: validStops, polyline: '', etas: [] });
  }

  const origin = validStops[0];
  const destination = validStops[validStops.length - 1];
  const waypoints = validStops.slice(1, -1);

  const waypointStr = waypoints
    .map((s) => `via:${s.lat},${s.lng}`)
    .join('|');

  const directionsUrl = new URL('https://maps.googleapis.com/maps/api/directions/json');
  directionsUrl.searchParams.set('origin', `${origin.lat},${origin.lng}`);
  directionsUrl.searchParams.set('destination', `${destination.lat},${destination.lng}`);
  if (waypointStr) directionsUrl.searchParams.set('waypoints', `optimize:true|${waypointStr}`);
  directionsUrl.searchParams.set('departure_time', String(Math.floor(departureEpoch / 1000)));
  directionsUrl.searchParams.set('key', env.GOOGLE_MAPS_API_KEY);

  const directionsRes = await fetch(directionsUrl.toString());
  const directionsData = await directionsRes.json() as {
    status: string;
    routes?: Array<{
      overview_polyline: { points: string };
      waypoint_order: number[];
      legs: Array<{ duration: { value: number }; start_location: { lat: number; lng: number } }>;
    }>;
  };

  if (directionsData.status !== 'OK' || !directionsData.routes?.length) {
    return corsResponse({ orderedStops: validStops, polyline: '', etas: [] });
  }

  const route = directionsData.routes[0];
  const waypointOrder = route.waypoint_order;

  const reordered = [
    origin,
    ...waypointOrder.map((i: number) => waypoints[i]),
    destination,
  ];

  let cumulativeSeconds = 0;
  const etas = route.legs.map((leg) => {
    cumulativeSeconds += leg.duration.value;
    return new Date(departureEpoch + cumulativeSeconds * 1000).toISOString();
  });

  return corsResponse({
    orderedStops: reordered,
    polyline: route.overview_polyline.points,
    etas,
    deliveryDayId,
  });
}

async function geocodeAddress(
  address: string,
  env: Env,
): Promise<{ lat: number; lng: number } | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('region', 'AU');
  url.searchParams.set('key', env.GOOGLE_MAPS_API_KEY);

  const res = await fetch(url.toString());
  const data = await res.json() as {
    status: string;
    results?: Array<{ geometry: { location: { lat: number; lng: number } } }>;
  };

  if (data.status !== 'OK' || !data.results?.length) return null;
  return data.results[0].geometry.location;
}

function corsResponse(body: unknown, status = 200): Response {
  return new Response(body !== null ? JSON.stringify(body) : null, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}
