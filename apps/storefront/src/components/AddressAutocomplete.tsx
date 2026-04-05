'use client';

import { useEffect, useRef, useState } from 'react';

interface Address {
  line1: string;
  line2?: string;
  suburb: string;
  state: string;
  postcode: string;
}

interface Props {
  value: Address;
  onChange: (addr: Address) => void;
  className?: string;
}

interface Suggestion {
  line1: string;
  suburb: string;
  state: string;
  postcode: string;
  detail: string;
}

const AU_STATE_MAP: Record<string, string> = {
  Queensland: 'QLD', 'New South Wales': 'NSW', Victoria: 'VIC',
  'South Australia': 'SA', 'Western Australia': 'WA', Tasmania: 'TAS',
  'Northern Territory': 'NT', 'Australian Capital Territory': 'ACT',
};

// Photon geocoder — better AU data than Nominatim, biased to central QLD
const PHOTON_URL = 'https://photon.komoot.io/api/';
const QLD_LAT = -23.85; // Gladstone area
const QLD_LON = 151.27;

export default function AddressAutocomplete({ value, onChange, className }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = (q: string) => {
    if (q.length < 3) { setSuggestions([]); setShowDropdown(false); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: q + ' QLD Australia',
          lat: String(QLD_LAT),
          lon: String(QLD_LON),
          limit: '8',
          lang: 'en',
        });
        const res = await fetch(`${PHOTON_URL}?${params}`);
        const data = await res.json() as {
          features: Array<{
            properties: {
              housenumber?: string;
              street?: string;
              name?: string;
              city?: string;
              district?: string;
              county?: string;
              state?: string;
              postcode?: string;
              country?: string;
            };
          }>;
        };

        const results: Suggestion[] = data.features
          .filter((f) => f.properties.country === 'Australia' && (f.properties.street || f.properties.name))
          .map((f) => {
            const p = f.properties;
            const streetNum = p.housenumber ?? '';
            const street = p.street ?? p.name ?? '';
            const line1 = `${streetNum} ${street}`.trim();
            const suburb = p.city ?? p.district ?? p.county ?? '';
            const stateCode = AU_STATE_MAP[p.state ?? ''] ?? p.state ?? '';
            const postcode = p.postcode ?? '';
            const detail = [suburb, stateCode, postcode].filter(Boolean).join(' ');
            return { line1, suburb, state: stateCode, postcode, detail };
          })
          .filter((s) => s.line1.length > 0)
          .filter((s, i, arr) => arr.findIndex((x) => x.line1 === s.line1 && x.suburb === s.suburb) === i);

        setSuggestions(results);
        setShowDropdown(results.length > 0);
      } catch {
        setSuggestions([]);
        setShowDropdown(false);
      }
    }, 300);
  };

  const handleInputChange = (val: string) => {
    setQuery(val);
    onChange({ ...value, line1: val });
    search(val);
  };

  const selectSuggestion = (s: Suggestion) => {
    onChange({
      line1: s.line1,
      line2: value.line2,
      suburb: s.suburb,
      state: s.state || value.state,
      postcode: s.postcode,
    });
    setQuery(s.line1);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const cls = className ?? 'w-full border rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand text-sm';

  return (
    <div className="space-y-3" ref={wrapperRef}>
      <div className="relative">
        <input
          value={query || value.line1}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          placeholder="Start typing your address..."
          className={cls}
          autoComplete="one-time-code"
          data-1p-ignore
          data-lpignore="true"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
          Auto
        </span>

        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectSuggestion(s)}
                className="w-full text-left px-3 py-2.5 hover:bg-brand/5 transition-colors border-b border-gray-50 last:border-0"
              >
                <p className="text-sm font-medium text-gray-800">{s.line1}</p>
                <p className="text-xs text-gray-400">{s.detail}</p>
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        value={value.line2 ?? ''}
        onChange={(e) => onChange({ ...value, line2: e.target.value })}
        placeholder="Apt / Unit (optional)"
        className={cls}
      />
      <div className="grid grid-cols-3 gap-3">
        <input
          value={value.suburb}
          onChange={(e) => onChange({ ...value, suburb: e.target.value })}
          placeholder="Suburb *"
          required
          className={cls}
          autoComplete="one-time-code"
        />
        <select
          value={value.state}
          onChange={(e) => onChange({ ...value, state: e.target.value })}
          className={cls}
        >
          {['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input
          value={value.postcode}
          onChange={(e) => onChange({ ...value, postcode: e.target.value })}
          placeholder="Postcode *"
          required
          maxLength={4}
          pattern="[0-9]{4}"
          className={cls}
        />
      </div>
    </div>
  );
}
