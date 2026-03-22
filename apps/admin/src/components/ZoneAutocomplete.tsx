import { useState, useRef } from 'react';
import { MapPin, X } from 'lucide-react';

export function ZoneAutocomplete({ value, onChange, label, placeholder, hint }: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  placeholder?: string;
  hint?: string;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ suburb: string; postcode: string }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const zones = value ? value.split(',').map(z => z.trim()).filter(Boolean) : [];

  const searchSuburb = (q: string) => {
    if (q.length < 3) { setSuggestions([]); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}, Australia&lat=-25.27&lon=133.78&limit=8&lang=en&layer=city&layer=district`);
        const data = await res.json();
        const results = (data.features ?? [])
          .filter((f: any) => f.properties?.country === 'Australia')
          .map((f: any) => ({ suburb: f.properties.name ?? f.properties.city ?? '', postcode: f.properties.postcode ?? '' }))
          .filter((r: any) => r.suburb && !zones.some(z => z.includes(r.suburb)));
        const unique = results.filter((r: any, i: number) => results.findIndex((x: any) => x.suburb === r.suburb) === i);
        setSuggestions(unique.slice(0, 5));
        setShowSuggestions(true);
      } catch {}
    }, 300);
  };

  const addZone = (suburb: string, postcode: string) => {
    const entry = postcode ? `${suburb} (${postcode})` : suburb;
    const updated = [...zones, entry].join(', ');
    onChange(updated);
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const removeZone = (idx: number) => {
    onChange(zones.filter((_, i) => i !== idx).join(', '));
  };

  return (
    <div>
      {label && <label className="text-xs text-gray-500 mb-1 block flex items-center gap-1"><MapPin className="h-3 w-3" /> {label}</label>}
      {zones.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {zones.map((z, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-brand/10 text-brand text-xs font-medium px-2 py-1 rounded-lg">
              {z}
              <button type="button" onClick={() => removeZone(i)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); searchSuburb(e.target.value); }}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder ?? 'Type suburb name...'}
          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((s, i) => (
              <button key={i} type="button"
                onMouseDown={(e) => { e.preventDefault(); addZone(s.suburb, s.postcode); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-brand/5 flex justify-between items-center">
                <span className="font-medium">{s.suburb}</span>
                {s.postcode && <span className="text-xs text-gray-400">{s.postcode}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}
