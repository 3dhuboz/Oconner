/**
 * Neutral HTTP handler types — compatible with Cloudflare Workers (prod) and Express (local dev).
 * All API route handlers use these instead of VercelRequest / VercelResponse.
 */

export interface AppEnv {
  DB?: any;        // D1Database (prod) | BetterSqlite3.Database wrapper (dev)
  R2?: any;        // R2Bucket (prod) | local-fs mock (dev)
  [key: string]: any;
}

export interface AppRequest {
  method: string;
  headers: { get(name: string): string | null; [key: string]: any };
  body: any;
  query: Record<string, string | string[]>;
  url: string;
  env: AppEnv;
}

export interface AppResponse {
  status(code: number): AppResponse;
  json(data: any): void;
  send(data: any): void;
  setHeader(name: string, value: string): void;
  end(): void;
}

export type AppHandler = (req: AppRequest, res: AppResponse) => Promise<void> | void;

/**
 * Wraps a Cloudflare Workers Request into an AppRequest.
 * Used in _worker.ts (production entry point).
 */
export async function fromCfRequest(request: Request, parsedBody?: any): Promise<AppRequest> {
  const url = new URL(request.url);
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { query[k] = v; });

  let body = parsedBody;
  if (body === undefined) {
    const ct = request.headers.get('content-type') || '';
    try {
      if (ct.includes('application/json')) {
        body = await request.json();
      } else if (ct.includes('application/x-www-form-urlencoded') || ct.includes('multipart/form-data')) {
        const fd = await request.formData();
        body = Object.fromEntries(fd.entries());
      } else {
        body = await request.text();
      }
    } catch {
      body = {};
    }
  }

  return {
    method: request.method,
    headers: request.headers as any,
    body,
    query,
    url: request.url,
    env: (parsedBody as any)?._env || {},
  };
}

/**
 * Creates a deferred AppResponse that, once resolved, returns a standard Response.
 * Used in _worker.ts (production entry point).
 */
export function makeCfResponse(): { res: AppResponse; getResponse(): Response } {
  let statusCode = 200;
  const responseHeaders = new Headers({ 'Content-Type': 'application/json' });
  let responseBody: any = null;
  let resolved = false;

  const res: AppResponse = {
    status(code) { statusCode = code; return res; },
    json(data) { responseBody = JSON.stringify(data); resolved = true; },
    send(data) {
      responseBody = typeof data === 'string' ? data : JSON.stringify(data);
      resolved = true;
    },
    setHeader(name, value) { responseHeaders.set(name, value); },
    end() { resolved = true; },
  };

  return {
    res,
    getResponse() {
      return new Response(responseBody, { status: statusCode, headers: responseHeaders });
    },
  };
}
