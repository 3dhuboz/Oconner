'use client';

import { useToastStore } from '@/lib/toast';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const icons = {
  success: <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />,
  error: <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />,
  info: <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />,
};

const borders = {
  success: 'border-green-200',
  error: 'border-red-200',
  info: 'border-blue-200',
};

export default function Toaster() {
  const { toasts, removeToast } = useToastStore();

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 bg-white rounded-xl shadow-lg border ${borders[t.type]} px-4 py-3 animate-in slide-in-from-bottom-4 fade-in duration-200`}
        >
          {icons[t.type]}
          <p className="text-sm text-gray-800 flex-1 leading-snug pt-0.5">{t.message}</p>
          <button onClick={() => removeToast(t.id)} className="text-gray-300 hover:text-gray-500 flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
