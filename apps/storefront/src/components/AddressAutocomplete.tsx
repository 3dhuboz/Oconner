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

interface Prediction {
  placeId: string;
  description: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

export default function AddressAutocomplete({ value, onChange, className }: Props) {
  const [suggestions, setSuggestions] = useState<Prediction[]>([]);
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
        const res = await fetch(`${API_URL}/api/address/autocomplete?input=${encodeURIComponent(q)}`);
        const data = await res.json() as { predictions: Prediction[] };
        setSuggestions(data.predictions ?? []);
        setShowDropdown((data.predictions ?? []).length > 0);
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

  const selectSuggestion = async (prediction: Prediction) => {
    setShowDropdown(false);
    setSuggestions([]);
    try {
      const res = await fetch(`${API_URL}/api/address/details?placeId=${encodeURIComponent(prediction.placeId)}`);
      const data = await res.json() as {
        streetNumber: string; street: string; suburb: string; state: string; postcode: string;
      };
      const line1 = `${data.streetNumber} ${data.street}`.trim();
      onChange({
        line1: line1 || prediction.description.split(',')[0],
        line2: value.line2,
        suburb: data.suburb,
        state: data.state || value.state,
        postcode: data.postcode,
      });
      setQuery(line1 || prediction.description.split(',')[0]);
    } catch {
      // Fallback: just use description
      onChange({ ...value, line1: prediction.description.split(',')[0] });
      setQuery(prediction.description.split(',')[0]);
    }
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
            {suggestions.map((p) => {
              const parts = p.description.split(',');
              const line = parts[0]?.trim() ?? '';
              const detail = parts.slice(1).join(',').trim();
              return (
                <button
                  key={p.placeId}
                  type="button"
                  onClick={() => selectSuggestion(p)}
                  className="w-full text-left px-3 py-2.5 hover:bg-brand/5 transition-colors border-b border-gray-50 last:border-0"
                >
                  <p className="text-sm font-medium text-gray-800">{line}</p>
                  <p className="text-xs text-gray-400">{detail}</p>
                </button>
              );
            })}
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
