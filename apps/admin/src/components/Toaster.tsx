import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useToasts, toast as dismissToast } from '../lib/toast';

export default function Toaster() {
  const toasts = useToasts();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium min-w-[260px] max-w-sm animate-slide-up ${
            t.type === 'success' ? 'bg-white border-green-200 text-green-800' :
            t.type === 'error'   ? 'bg-white border-red-200 text-red-800' :
                                   'bg-white border-blue-200 text-blue-800'
          }`}
        >
          {t.type === 'success' && <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />}
          {t.type === 'error'   && <XCircle     className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />}
          {t.type === 'info'    && <Info        className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />}
          <span className="flex-1">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
