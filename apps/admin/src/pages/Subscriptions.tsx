import { useEffect, useState } from 'react';
import { api } from '@butcher/shared';
import { RefreshCcw, Check, X, Phone, Mail, MapPin } from 'lucide-react';

interface Subscription {
  id: string;
  boxName: string;
  frequency: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  suburb: string;
  postcode: string;
  notes?: string;
  status: 'pending' | 'active' | 'cancelled';
  createdAt?: any;
}

const STATUS_STYLE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);

  useEffect(() => {
    api.get<Subscription[]>('/api/subscriptions')
      .then((data) => setSubs(data))
      .catch(() => {});
  }, []);

  const setStatus = async (id: string, status: string) => {
    await api.patch(`/api/subscriptions/${id}`, { status });
    setSubs((prev) => prev.map((s) => s.id === id ? { ...s, status: status as Subscription['status'] } : s));
  };

  const pending = subs.filter((s) => s.status === 'pending').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand flex items-center gap-2">
            <RefreshCcw className="h-6 w-6" /> Subscriptions
          </h1>
          {pending > 0 && (
            <p className="text-sm text-amber-600 mt-0.5">{pending} pending request{pending !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {subs.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <RefreshCcw className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p>No subscriptions yet.</p>
          </div>
        ) : (
          <div className="divide-y">
            {subs.map((s) => (
              <div key={s.id} className="px-5 py-4 flex gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <div>
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-sm text-brand font-medium">{s.boxName} · {s.frequency}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${STATUS_STYLE[s.status] ?? STATUS_STYLE.pending}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-2">
                    <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{s.email}</span>
                    <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{s.phone}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{s.address}, {s.suburb} {s.postcode}</span>
                  </div>
                  {s.notes && (
                    <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-2 inline-block">⚠ {s.notes}</p>
                  )}
                </div>
                {s.status === 'pending' && (
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => setStatus(s.id, 'active')}
                      className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-700"
                    >
                      <Check className="h-3.5 w-3.5" /> Activate
                    </button>
                    <button
                      onClick={() => setStatus(s.id, 'cancelled')}
                      className="flex items-center gap-1 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200"
                    >
                      <X className="h-3.5 w-3.5" /> Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
