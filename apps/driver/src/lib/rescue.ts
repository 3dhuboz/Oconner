import { API_URL } from '@butcher/shared';
import type { DeliveryDay, Stop } from '@butcher/shared';

const RESCUE_STORAGE_KEY = 'ocn-driver-rescue-pin';

export function getRescuePin(): string {
  try {
    return localStorage.getItem(RESCUE_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function hasRescueAccess(): boolean {
  return getRescuePin().length > 0;
}

export function saveRescuePin(pin: string): void {
  try {
    localStorage.setItem(RESCUE_STORAGE_KEY, pin.trim());
  } catch {}
}

export function clearRescuePin(): void {
  try {
    localStorage.removeItem(RESCUE_STORAGE_KEY);
  } catch {}
}

async function rescueRequest<T>(path: string, options: RequestInit = {}, overridePin?: string): Promise<T> {
  const pin = overridePin ?? getRescuePin();
  const headers = {
    'Content-Type': 'application/json',
    'X-Driver-Rescue-Pin': pin,
    ...(options.headers ?? {}),
  } as Record<string, string>;
  const res = await fetch(`${API_URL}/api/driver-rescue${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const rescueApi = {
  today: (pin?: string) => rescueRequest<{ deliveryDay: DeliveryDay | null; stops: Stop[] }>('/today', {}, pin),
  stop: (id: string) => rescueRequest<Stop>(`/stops/${id}`),
  updateStatus: (id: string, data: { status: string; driverNote?: string; flagReason?: string; proofUrl?: string }) =>
    rescueRequest<{ ok: true }>(`/stops/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};
