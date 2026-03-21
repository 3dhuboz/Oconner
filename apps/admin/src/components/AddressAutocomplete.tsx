import { useEffect, useRef, useState } from 'react';

interface Address {
  line1: string;
  line2: string;
  suburb: string;
  state: string;
  postcode: string;
}

interface Props {
  value: Address;
  onChange: (addr: Address) => void;
}

interface PhotonFeature {
  properties: {
    housenumber?: string;
    street?: string;
    name?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
}

const AU_STATE_MAP: Record<string, string> = {
  'Queensland': 'QLD',
  'New South Wales': 'NSW',
  'Victoria': 'VIC',
  'South Australia': 'SA',
  'Western Australia': 'WA',
  'Tasmania': 'TAS',
  'Northern Territory': 'NT',
  'Australian Capital Territory': 'ACT',
};

export default function AddressAutocomplete({ value, onChange }: Props) {
  const [suggestions, setSuggestions] = useState<PhotonFeature[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
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
          q,
          limit: '5',
          lang: 'en',
          lat: '-23.8',
          lon: '151.2',
          location_bias_scale: '2',
        });
        const res = await fetch(`https://photon.komoot.io/api/?${params}`);
        const data = await res.json() as { features: PhotonFeature[] };

        // Filter to Australian results only
        const auResults = data.features.filter(
          (f) => f.properties.country === 'Australia' && f.properties.street
        );
        setSuggestions(auResults);
        setShowDropdown(auResults.length > 0);
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

  const selectSuggestion = (feature: PhotonFeature) => {
    const p = feature.properties;
    const streetNum = p.housenumber ?? '';
    const street = p.street ?? p.name ?? '';
    const stateCode = AU_STATE_MAP[p.state ?? ''] ?? value.state;

    onChange({
      line1: `${streetNum} ${street}`.trim(),
      line2: value.line2,
      suburb: p.city ?? '',
      state: stateCode,
      postcode: p.postcode ?? '',
    });
    setQuery(`${streetNum} ${street}`.trim());
    setShowDropdown(false);
    setSuggestions([]);
  };

  const formatSuggestion = (f: PhotonFeature) => {
    const p = f.properties;
    const line = `${p.housenumber ?? ''} ${p.street ?? p.name ?? ''}`.trim();
    const detail = [p.city, AU_STATE_MAP[p.state ?? ''] ?? p.state, p.postcode].filter(Boolean).join(' ');
    return { line, detail };
  };

  const cls = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand';

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <div className="relative">
        <input
          value={query || value.line1}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
          placeholder="Start typing address…"
          className={cls}
          autoComplete="off"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
          Auto
        </span>

        {showDropdown && suggestions.length > 0 && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {suggestions.map((f, i) => {
              const { line, detail } = formatSuggestion(f);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectSuggestion(f)}
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
        value={value.line2}
        onChange={(e) => onChange({ ...value, line2: e.target.value })}
        placeholder="Unit / apartment (optional)"
        className={cls}
      />
      <div className="grid grid-cols-3 gap-2">
        <input
          value={value.suburb}
          onChange={(e) => onChange({ ...value, suburb: e.target.value })}
          placeholder="Suburb *"
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <select
          value={value.state}
          onChange={(e) => onChange({ ...value, state: e.target.value })}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        >
          {['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <input
          value={value.postcode}
          onChange={(e) => onChange({ ...value, postcode: e.target.value })}
          placeholder="Postcode *"
          maxLength={4}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </div>
    </div>
  );
}
