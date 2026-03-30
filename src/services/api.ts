// Base URL: explicit env var → production domain detection → dev proxy fallback
function resolveApiBase(): string {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname === 'wirezapp.au') {
    return 'https://api.wirezapp.au';
  }
  return '/api'; // Dev: Vite proxies to localhost:8787
}
const API_BASE = resolveApiBase();

// All fetch calls include Clerk session token
export async function apiFetch(path: string, options: RequestInit = {}) {
  // Get Clerk session token — registered via setAuthTokenGetter() in AuthContext
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// Raw fetch with auth (for non-JSON responses like PDF blobs)
export async function apiRawFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res;
}

// Token getter — set by AuthContext when Clerk initializes
let _getToken: (() => Promise<string | null>) | null = null;
export function setAuthTokenGetter(fn: () => Promise<string | null>) {
  _getToken = fn;
}
async function getAuthToken(): Promise<string | null> {
  return _getToken ? _getToken() : null;
}

// ─── Jobs ─────────────────────────────
export const jobsApi = {
  list: () => apiFetch('/jobs'),
  get: (id: string) => apiFetch(`/jobs/${id}`),
  create: (data: any) => apiFetch('/jobs', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch(`/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(`/jobs/${id}`, { method: 'DELETE' }),
};

// ─── Electricians ─────────────────────
export const electriciansApi = {
  list: () => apiFetch('/electricians'),
  create: (data: any) => apiFetch('/electricians', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch(`/electricians/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(`/electricians/${id}`, { method: 'DELETE' }),
};

// ─── Parts Catalog ────────────────────
export const partsCatalogApi = {
  list: () => apiFetch('/parts-catalog'),
  upsert: (data: any) => apiFetch('/parts-catalog', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(`/parts-catalog/${id}`, { method: 'DELETE' }),
};

// ─── Tech Stock ───────────────────────
export const techStockApi = {
  list: (technicianId?: string) => apiFetch(`/tech-stock${technicianId ? `?technicianId=${technicianId}` : ''}`),
  upsert: (data: any) => apiFetch('/tech-stock', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch(`/tech-stock/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// ─── Stock Movements ──────────────────
export const stockMovementsApi = {
  create: (data: any) => apiFetch('/stock-movements', { method: 'POST', body: JSON.stringify(data) }),
  list: () => apiFetch('/stock-movements'),
};

// ─── Tech Locations ───────────────────
export const techLocationsApi = {
  list: () => apiFetch('/tech-locations'),
  upsert: (data: any) => apiFetch('/tech-locations', { method: 'POST', body: JSON.stringify(data) }),
};

// ─── Settings ─────────────────────────
export const settingsApi = {
  get: (key: string) => apiFetch(`/settings/${key}`),
  set: (key: string, value: any) => apiFetch(`/settings/${key}`, { method: 'POST', body: JSON.stringify(value) }),
};

// ─── Tenants ──────────────────────────
export const tenantsApi = {
  list: () => apiFetch('/tenants'),
  create: (data: any) => apiFetch('/tenants', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch(`/tenants/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(`/tenants/${id}`, { method: 'DELETE' }),
};

// ─── User Profiles ────────────────────
export const userProfilesApi = {
  list: () => apiFetch('/user-profiles'),
  get: (uid: string) => apiFetch(`/user-profiles/${uid}`),
  upsert: (data: any) => apiFetch('/user-profiles', { method: 'POST', body: JSON.stringify(data) }),
  update: (uid: string, data: any) => apiFetch(`/user-profiles/${uid}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (uid: string) => apiFetch(`/user-profiles/${uid}`, { method: 'DELETE' }),
};

// ─── Licenses ─────────────────────────
export const licensesApi = {
  list: (tenantId?: string) => apiFetch(`/licenses${tenantId ? `?tenantId=${tenantId}` : ''}`),
  create: (data: any) => apiFetch('/licenses', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiFetch(`/licenses/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => apiFetch(`/licenses/${id}`, { method: 'DELETE' }),
};

// ─── Integrations ─────────────────────
export const smsApi = {
  send: (data: any) => apiFetch('/sms/send', { method: 'POST', body: JSON.stringify(data) }),
  test: (data: any) => apiFetch('/sms/test', { method: 'POST', body: JSON.stringify(data) }),
};

export const stripeApi = {
  plans: () => apiFetch('/stripe/plans'),
  createCheckout: (data: any) => apiFetch('/stripe/create-checkout-session', { method: 'POST', body: JSON.stringify(data) }),
  createPaymentLink: (data: any) => apiFetch('/stripe/create-payment-link', { method: 'POST', body: JSON.stringify(data) }),
};

export const xeroApi = {
  status: () => apiFetch('/xero/status'),
  createInvoice: (data: any) => apiFetch('/xero/invoice', { method: 'POST', body: JSON.stringify(data) }),
};

export const form9Api = {
  generate: async (data: any) => {
    const token = await getAuthToken();
    const res = await fetch(`${API_BASE}/form9/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to generate Form 9');
    return res.blob();
  },
};

export const uploadsApi = {
  getPresignedUrl: (filename: string, contentType: string) =>
    apiFetch('/uploads/presign', { method: 'POST', body: JSON.stringify({ filename, contentType }) }),
  getUrl: (key: string) => `${API_BASE}/uploads/${key}`,
};
