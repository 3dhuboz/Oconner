declare const process: { env: Record<string, string | undefined> } | undefined;
export const API_URL = typeof process !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_URL ?? process.env.VITE_API_URL ?? 'https://oconner-api.steve-700.workers.dev')
  : 'https://oconner-api.steve-700.workers.dev';

let _getToken: (() => Promise<string | null>) | null = null;

export function setTokenProvider(fn: () => Promise<string | null>) {
  _getToken = fn;
}

async function authHeaders(): Promise<Record<string, string>> {
  if (!_getToken) return {};
  const token = await _getToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(await authHeaders()),
  };
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText })) as { error: string };
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),

  products: {
    list: (activeOnly = false) => api.get(`/api/products${activeOnly ? '?activeOnly=true' : ''}`),
    get: (id: string) => api.get(`/api/products/${id}`),
    create: (data: unknown) => api.post('/api/products', data),
    update: (id: string, data: unknown) => api.patch(`/api/products/${id}`, data),
    updateStock: (id: string, delta: number, reason?: string, type?: string) =>
      api.patch(`/api/products/${id}/stock`, { delta, reason, type }),
    remove: (id: string) => api.delete(`/api/products/${id}`),
  },

  orders: {
    list: (status?: string) => api.get(`/api/orders${status ? `?status=${status}` : ''}`),
    today: () => api.get('/api/orders/today'),
    get: (id: string) => api.get(`/api/orders/${id}`),
    create: (data: unknown) => api.post('/api/orders', data),
    updateStatus: (id: string, status: string, extra?: { packedBy?: string; internalNotes?: string }) =>
      api.patch(`/api/orders/${id}/status`, { status, ...extra }),
    update: (id: string, data: unknown) => api.patch(`/api/orders/${id}`, data),
    remove: (id: string) => api.delete(`/api/orders/${id}`),
  },

  deliveryDays: {
    list: (upcoming = false) => api.get(`/api/delivery-days${upcoming ? '?upcoming=true' : ''}`),
    today: () => api.get('/api/delivery-days/today'),
    get: (id: string) => api.get(`/api/delivery-days/${id}`),
    create: (data: unknown) => api.post('/api/delivery-days', data),
    update: (id: string, data: unknown) => api.patch(`/api/delivery-days/${id}`, data),
    delete: (id: string) => api.delete(`/api/delivery-days/${id}`),
    sendReminders: (id: string) => api.post(`/api/delivery-days/${id}/send-reminders`, {}),
    generateStops: (id: string) => api.post<{ created: number; total: number }>(`/api/delivery-days/${id}/generate-stops`, {}),
    geocodeStops: (id: string) => api.post<{ updated: number; total: number }>(`/api/delivery-days/${id}/geocode-stops`, {}),
    getStock: (id: string) => api.get(`/api/delivery-days/${id}/stock`),
    setStock: (id: string, allocations: { productId: string; productName: string; allocated: number }[]) =>
      api.put(`/api/delivery-days/${id}/stock`, { allocations }),
    copyStock: (id: string, sourceId: string) => api.post(`/api/delivery-days/${id}/stock/copy-from/${sourceId}`, {}),
    generatePost: (id: string) => api.post(`/api/delivery-days/${id}/generate-post`, {}),
  },

  stops: {
    list: (deliveryDayId: string) => api.get(`/api/stops?deliveryDayId=${deliveryDayId}`),
    listByRun: (runId: string) => api.get(`/api/stops?runId=${runId}`),
    listUnassigned: (deliveryDayId: string) => api.get(`/api/stops?deliveryDayId=${deliveryDayId}&unassigned=true`),
    create: (data: unknown) => api.post('/api/stops', data),
    updateStatus: (id: string, data: { status: string; driverNote?: string; flagReason?: string; proofUrl?: string }) =>
      api.patch(`/api/stops/${id}/status`, data),
    updateSequence: (id: string, sequence: number) => api.patch(`/api/stops/${id}/sequence`, { sequence }),
    assignRun: (id: string, runId: string | null) => api.patch(`/api/stops/${id}/run`, { runId }),
  },

  deliveryRuns: {
    list: (deliveryDayId: string) => api.get(`/api/delivery-runs?deliveryDayId=${deliveryDayId}`),
    myRun: (deliveryDayId: string) => api.get(`/api/delivery-runs/my-run?deliveryDayId=${deliveryDayId}`),
    create: (data: { deliveryDayId: string; name: string; zone?: string; color?: string; driverUid?: string; notes?: string }) =>
      api.post('/api/delivery-runs', data),
    update: (id: string, data: Partial<{ name: string; zone: string; color: string; driverUid: string | null; status: string; notes: string; sequence: number }>) =>
      api.patch(`/api/delivery-runs/${id}`, data),
    remove: (id: string) => api.delete(`/api/delivery-runs/${id}`),
    assignStop: (runId: string, stopId: string) => api.patch(`/api/delivery-runs/${runId}/assign-stop`, { stopId }),
    autoAssign: (runId: string, postcodes: string[]) => api.post(`/api/delivery-runs/${runId}/auto-assign`, { postcodes }),
  },

  customers: {
    list: () => api.get('/api/customers'),
    get: (id: string) => api.get(`/api/customers/${id}`),
    orders: (id: string) => api.get(`/api/customers/${id}/orders`),
    create: (data: unknown) => api.post('/api/customers', data),
    update: (id: string, data: unknown) => api.patch(`/api/customers/${id}`, data),
    me: () => api.get('/api/customers/me'),
    updateMe: (data: unknown) => api.patch('/api/customers/me', data),
  },

  subscriptions: {
    mine: () => api.get('/api/subscriptions/mine'),
    list: () => api.get('/api/subscriptions'),
    create: (data: unknown) => api.post('/api/subscriptions', data),
    update: (id: string, data: unknown) => api.patch(`/api/subscriptions/${id}`, data),
  },

  users: {
    me: () => api.get('/api/users/me'),
    list: () => api.get('/api/users'),
    drivers: () => api.get('/api/users/drivers'),
    create: (data: unknown) => api.post('/api/users', data),
    update: (id: string, data: unknown) => api.patch(`/api/users/${id}`, data),
    findByEmail: (email: string) => api.post('/api/users/lookup', { email }),
  },

  drivers: {
    activeSessions: () => api.get('/api/drivers/active'),
    startSession: (data: { deliveryDayId: string; driverName?: string; totalStops?: number }) =>
      api.post('/api/drivers/session', data),
    ping: (sessionId: string, lat: number, lng: number) =>
      api.patch(`/api/drivers/session/${sessionId}/ping`, { lat, lng }),
    endSession: (sessionId: string) =>
      api.patch(`/api/drivers/session/${sessionId}/complete`, {}),
    invite: (name: string, email: string) =>
      api.post('/api/drivers/invite', { name, email }),
  },

  config: {
    get: (key?: string) => api.get(key ? `/api/config/${key}` : '/api/config'),
    set: (key: string, value: unknown) => api.put(`/api/config/${key}`, value),
    update: (data: unknown) => api.put('/api/config', data),
  },

  reports: {
    revenue: (period: string, from?: number, to?: number) => {
      const params = new URLSearchParams({ period });
      if (from) params.set('from', String(from));
      if (to) params.set('to', String(to));
      return api.get(`/api/reports/revenue?${params}`);
    },
  },

  images: {
    upload: async (file: File, folder?: string): Promise<string> => {
      const headers = await authHeaders();
      const formData = new FormData();
      formData.append('file', file);
      if (folder) formData.append('folder', folder);
      const res = await fetch(`${API_URL}/api/images/upload`, {
        method: 'POST',
        headers: { Authorization: headers.Authorization ?? '' },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json() as { url: string; key: string };
      return data.url;
    },
    generate: async (prompt: string): Promise<string> => {
      const data = await request<{ url: string }>('POST', '/api/images/generate', { prompt });
      return data.url;
    },
  },
};
