/**
 * D1-compatible database abstraction.
 * - Production (CF Workers): uses Cloudflare D1 (env.DB)
 * - Development (Express):   uses better-sqlite3 via a D1-shaped wrapper
 *
 * All queries use D1's positional-parameter API: stmt.bind(...params).all() / .first() / .run()
 */

export interface D1Like {
  prepare(sql: string): D1StmtLike;
}

export interface D1StmtLike {
  bind(...params: any[]): {
    all<T = any>(): Promise<{ results: T[] }>;
    first<T = any>(): Promise<T | null>;
    run(): Promise<{ success: boolean; meta: { last_row_id: number | bigint; changes: number } }>;
  };
}

/** Retrieve the DB from a request's env (injected by server.ts in dev or _worker.ts in prod). */
export function getDb(env: any): D1Like {
  if (!env?.DB) throw new Error('Database not configured. Set DB binding in wrangler.toml or server.ts.');
  return env.DB as D1Like;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Generate a UUID-like ID (no crypto.randomUUID dep issues in older Node) */
export function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/** Safely parse a JSON string; return fallback on error */
export function safeJson(str: string | null | undefined, fallback: any = {}): any {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

/** Encode a record to the JSON `data` column + any indexed columns */
export function encodeRow(id: string, record: Record<string, any>): { id: string; data: string; [k: string]: any } {
  return { id, data: JSON.stringify(record) };
}

/** Decode a DB row back to a plain object */
export function decodeRow(row: { id: string; data: string; [k: string]: any }): Record<string, any> {
  return { id: row.id, ...safeJson(row.data) };
}
