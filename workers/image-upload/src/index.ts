export interface Env {
  IMAGES: R2Bucket;
  UPLOAD_SECRET: string;
}

const CORS: HeadersInit = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function cors(body: BodyInit | null = null, init: ResponseInit = {}): Response {
  return new Response(body, { ...init, headers: { ...CORS, ...(init.headers ?? {}) } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return cors(null, { status: 204 });

    const url = new URL(request.url);

    // ── Serve stored image ──────────────────────────────────────────────────
    if (request.method === 'GET') {
      const key = url.pathname.replace(/^\//, '');
      if (!key) return cors('Not Found', { status: 404 });

      const obj = await env.IMAGES.get(key);
      if (!obj) return cors('Not Found', { status: 404 });

      const headers = new Headers(CORS);
      headers.set('Content-Type', obj.httpMetadata?.contentType ?? 'image/jpeg');
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      return new Response(obj.body, { headers });
    }

    // ── Upload image ────────────────────────────────────────────────────────
    if (request.method === 'POST' && url.pathname === '/upload') {
      const auth = request.headers.get('Authorization') ?? '';
      if (env.UPLOAD_SECRET && auth !== `Bearer ${env.UPLOAD_SECRET}`) {
        return cors('Unauthorized', { status: 401 });
      }

      let formData: FormData;
      try {
        formData = await request.formData();
      } catch {
        return cors('Bad Request: expected multipart/form-data', { status: 400 });
      }

      const file = formData.get('file') as File | null;
      if (!file) return cors('Bad Request: no file field', { status: 400 });

      const folder = (formData.get('folder') as string | null) ?? 'uploads';
      const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      await env.IMAGES.put(key, file.stream(), {
        httpMetadata: { contentType: file.type || 'image/jpeg' },
      });

      const publicUrl = `${url.origin}/${key}`;
      return cors(JSON.stringify({ url: publicUrl, key }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return cors('Not Found', { status: 404 });
  },
};
