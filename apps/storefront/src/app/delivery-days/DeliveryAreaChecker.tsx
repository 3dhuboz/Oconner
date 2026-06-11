'use client';

import { useMemo, useState } from 'react';
import type { DeliveryDay } from '@butcher/shared';
import { Search, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';

type DeliveryDayWithZones = DeliveryDay & {
  zones?: string | null;
  type?: string | null;
  deliveryWindowStart?: string | null;
};

function splitRegions(zones?: string | null): string[] {
  if (!zones) return [];
  return zones
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function regionMatches(region: string, query: string): boolean {
  const normalizedRegion = region.toLowerCase();
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return false;

  const postcodeMatch = region.match(/\b\d{4}\b/g)?.includes(normalizedQuery);
  const suburb = normalizedRegion.replace(/\([^)]*\)/g, '').trim();
  return Boolean(postcodeMatch || suburb.includes(normalizedQuery) || normalizedRegion.includes(normalizedQuery));
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatTime(hhmm?: string | null): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return hhmm;
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, '0')}${suffix}`;
}

export default function DeliveryAreaChecker({ days }: { days: DeliveryDayWithZones[] }) {
  const [query, setQuery] = useState('');
  const deliveryDays = useMemo(
    () => days.filter((day) => day.type !== 'pickup' && day.date >= Date.now()).sort((a, b) => a.date - b.date),
    [days],
  );

  const regions = useMemo(() => {
    const map = new Map<string, { label: string; postcodes: Set<string> }>();
    for (const day of deliveryDays) {
      for (const region of splitRegions(day.zones)) {
        const label = region.replace(/\([^)]*\)/g, '').trim();
        if (!label) continue;
        const key = label.toLowerCase();
        const entry = map.get(key) ?? { label, postcodes: new Set<string>() };
        for (const postcode of region.match(/\b\d{4}\b/g) ?? []) entry.postcodes.add(postcode);
        map.set(key, entry);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [deliveryDays]);

  const matches = useMemo(() => {
    const term = query.trim();
    if (term.length < 2) return [];
    return deliveryDays
      .map((day) => {
        const matchedRegions = splitRegions(day.zones).filter((region) => regionMatches(region, term));
        return { day, matchedRegions };
      })
      .filter((item) => item.matchedRegions.length > 0);
  }, [deliveryDays, query]);

  const hasQuery = query.trim().length >= 2;
  const covered = hasQuery && matches.length > 0;

  return (
    <section className="mb-8 grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
            <Search className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-brand">Check Your Delivery Area</h2>
            <p className="text-sm text-gray-500 mt-0.5">Enter a suburb or postcode to see if an upcoming run covers you.</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="e.g. Tannum Sands or 4680"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          />
          <a
            href="/contact"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-brand hover:bg-brand/5"
          >
            Ask us
          </a>
        </div>

        {hasQuery && (
          <div className={`mt-4 rounded-lg border p-4 ${covered ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-start gap-2">
              {covered ? <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />}
              <div>
                <p className={`text-sm font-semibold ${covered ? 'text-green-800' : 'text-amber-800'}`}>
                  {covered ? 'Yes, this area is covered.' : 'No matching delivery run found yet.'}
                </p>
                {covered ? (
                  <div className="mt-2 space-y-2">
                    {matches.slice(0, 3).map(({ day, matchedRegions }) => (
                      <div key={day.id} className="text-sm text-green-800">
                        <span className="font-medium">{formatDate(day.date)}</span>
                        {day.deliveryWindowStart ? ` from ${formatTime(day.deliveryWindowStart)}` : ''}
                        <span className="block text-xs text-green-700">Covers: {matchedRegions.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-amber-700 mt-1">Message us if you are nearby. Some runs can change as delivery days are added.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-brand/5 border border-brand/15 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="h-5 w-5 text-brand" />
          <h2 className="text-lg font-bold text-brand">Current Delivery Regions</h2>
        </div>
        {regions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {regions.map((region) => (
              <span key={region.label} className="bg-white border border-brand/10 text-sm text-gray-700 rounded-full px-3 py-1.5">
                {region.label}{region.postcodes.size > 0 ? ` ${Array.from(region.postcodes).join('/')}` : ''}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Delivery regions will appear here when the next run is added.</p>
        )}
      </div>
    </section>
  );
}
