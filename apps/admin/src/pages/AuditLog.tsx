import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { AuditEntry } from '@butcher/shared';
import { FileText } from 'lucide-react';

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'auditLog'), orderBy('timestamp', 'desc'), limit(100)),
      (snap) => {
        setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditEntry)));
        setLoading(false);
      },
    );
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FileText className="h-6 w-6 text-brand" />
        <h1 className="text-2xl font-bold text-brand">Audit Log</h1>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Entity</th>
              <th className="px-4 py-3 text-left">Admin</th>
              <th className="px-4 py-3 text-left">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y font-mono text-xs">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400 font-sans">Loading…</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400 font-sans">No audit entries yet.</td></tr>
            ) : entries.map((entry) => {
              const ts = (entry.timestamp as unknown as { toDate: () => Date })?.toDate?.();
              return (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-sans font-medium ${
                      entry.action.includes('delete') ? 'bg-red-100 text-red-700' :
                      entry.action.includes('create') ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{entry.action}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-600">{entry.entity}/{entry.entityId?.slice(-8)}</td>
                  <td className="px-4 py-2 text-gray-500 font-sans">{entry.adminEmail ?? entry.adminUid ?? 'system'}</td>
                  <td className="px-4 py-2 text-gray-400 font-sans">
                    {ts ? ts.toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
