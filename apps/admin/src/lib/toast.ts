import { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';
export interface Toast { id: string; message: string; type: ToastType; }

let _toasts: Toast[] = [];
const _listeners = new Set<(t: Toast[]) => void>();

function _notify() { _listeners.forEach((l) => l([..._toasts])); }

export function toast(message: string, type: ToastType = 'success') {
  const id = Math.random().toString(36).slice(2);
  _toasts = [..._toasts, { id, message, type }];
  _notify();
  setTimeout(() => {
    _toasts = _toasts.filter((t) => t.id !== id);
    _notify();
  }, 3500);
}

export function useToasts() {
  const [state, setState] = useState<Toast[]>([..._toasts]);
  useEffect(() => {
    _listeners.add(setState);
    return () => { _listeners.delete(setState); };
  }, []);
  return state;
}
