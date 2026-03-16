import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Customer } from '@butcher/shared';
import { formatCurrency } from '@butcher/shared';
import { Search } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, 'customers'), orderBy('createdAt', 'desc'))).then((snap) => {
      setCustomers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer)));
      setLoading(false);
    });
  }, []);

  const filtered = customers.filter((c) =>
    !search ||
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand">Customers</h1>
        <span className="text-sm text-gray-500">{customers.length} total</span>
      </div>

      <div className="bg-white rounded-xl border mb-4 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            placeholder="Search by name or email…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Customer</th>
              <th className="px-4 py-3 text-left">Phone</th>
              <th className="px-4 py-3 text-right">Total Orders</th>
              <th className="px-4 py-3 text-right">Total Spent</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-10 text-gray-400">No customers found</td></tr>
            ) : filtered.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.email}</p>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.phone ?? '—'}</td>
                <td className="px-4 py-3 text-right">{c.orderCount ?? 0}</td>
                <td className="px-4 py-3 text-right font-medium">{formatCurrency(c.totalSpent ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
