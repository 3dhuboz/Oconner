/**
 * Cloudflare-backed REST API client.
 * Replaces the Firebase SDK — all reads/writes go through /api/data/* endpoints.
 * Works identically in dev (Express + SQLite) and prod (CF Workers + D1).
 */

const BASE = '/api/data';

async function req<T>(method: string, path: string, body?: any): Promise<T> {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error || res.statusText);
  }
  return res.json() as Promise<T>;
}

// ─── Jobs ──────────────────────────────────────────────────────────────────

export const jobsApi = {
  list: ()                        => req<any[]>('GET', `${BASE}/jobs`),
  get:  (id: string)              => req<any>('GET', `${BASE}/jobs?id=${id}`),
  create: (data: any)             => req<any>('POST', `${BASE}/jobs`, data),
  update: (id: string, data: any) => req<any>('PUT', `${BASE}/jobs?id=${id}`, data),
  delete: (id: string)            => req<any>('DELETE', `${BASE}/jobs?id=${id}`),
};

// ─── Electricians ──────────────────────────────────────────────────────────

export const electriciansApi = {
  list: ()                        => req<any[]>('GET', `${BASE}/electricians`),
  get:  (id: string)              => req<any>('GET', `${BASE}/electricians?id=${id}`),
  create: (data: any)             => req<any>('POST', `${BASE}/electricians`, data),
  update: (id: string, data: any) => req<any>('PUT', `${BASE}/electricians?id=${id}`, data),
  delete: (id: string)            => req<any>('DELETE', `${BASE}/electricians?id=${id}`),
};

// ─── Parts catalog ────────────────────────────────────────────────────────

export const partsApi = {
  list: ()                        => req<any[]>('GET', `${BASE}/parts`),
  get:  (id: string)              => req<any>('GET', `${BASE}/parts?id=${id}`),
  upsert: (data: any)             => req<any>('PUT', `${BASE}/parts?id=${data.id}`, data),
  delete: (id: string)            => req<any>('DELETE', `${BASE}/parts?id=${id}`),
};

// ─── User profiles ────────────────────────────────────────────────────────

export const profilesApi = {
  get:    (id: string)            => req<any>('GET', `${BASE}/profiles?id=${id}`),
  upsert: (id: string, data: any) => req<any>('PUT', `${BASE}/profiles?id=${id}`, data),
};

// ─── Tenants ──────────────────────────────────────────────────────────────

export const tenantsApi = {
  list: ()                        => req<any[]>('GET', `${BASE}/tenants`),
  get:  (id: string)              => req<any>('GET', `${BASE}/tenants?id=${id}`),
  create: (data: any)             => req<any>('POST', `${BASE}/tenants`, data),
  update: (id: string, data: any) => req<any>('PUT', `${BASE}/tenants?id=${id}`, data),
  delete: (id: string)            => req<any>('DELETE', `${BASE}/tenants?id=${id}`),
};

// ─── Tech locations ───────────────────────────────────────────────────────

export const locationsApi = {
  list: ()                                           => req<any[]>('GET', `${BASE}/locations`),
  upsert: (uid: string, lat: number, lng: number, accuracy: number) =>
    req<any>('PUT', `${BASE}/locations?uid=${uid}`, { uid, lat, lng, accuracy }),
};

// ─── Settings (integration config) ───────────────────────────────────────

export const settingsApi = {
  get:   (key: string)              => req<any>('GET', `${BASE}/settings?key=${key}`).catch(() => null),
  save:  (key: string, data: any)   => req<any>('PUT', `${BASE}/settings?key=${key}`, data),
};

// ─── Stock management ─────────────────────────────────────────────────────

export const stockApi = {
  listItems:     ()                              => req<any[]>('GET', `${BASE}/stock?resource=items`),
  upsertItem:    (id: string, data: any)         => req<any>('PUT', `${BASE}/stock?resource=items&id=${id}`, data),
  listMovements: ()                              => req<any[]>('GET', `${BASE}/stock?resource=movements`),
  addMovement:   (data: any)                     => req<any>('POST', `${BASE}/stock?resource=movements`, data),
};

// ─── User profiles (list all — for SuperAdmin) ────────────────────────────

export const usersApi = {
  list: () => req<any[]>('GET', `${BASE}/profiles`),
};

// ─── File storage (R2) ────────────────────────────────────────────────────

export const storageApi = {
  /** Upload a file as base64 and get back a public URL */
  upload: (fileName: string, contentType: string, base64: string) =>
    req<{ url: string; key: string }>('POST', '/api/storage/upload', { fileName, contentType, base64 }),

  /** Convert a File/Blob to base64 string */
  toBase64: (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }),
};
