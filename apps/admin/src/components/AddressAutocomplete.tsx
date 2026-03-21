/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from 'react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

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

let scriptLoaded = false;
let scriptLoading = false;
const callbacks: (() => void)[] = [];

function loadGooglePlaces() {
  return new Promise<void>((resolve) => {
    if (scriptLoaded) { resolve(); return; }
    callbacks.push(resolve);
    if (scriptLoading) return;
    scriptLoading = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places`;
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      callbacks.forEach((cb) => cb());
      callbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

export default function AddressAutocomplete({ value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!API_KEY || !inputRef.current) return;
    loadGooglePlaces().then(() => {
      if (!inputRef.current || autocompleteRef.current) return;
      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'au' },
        types: ['address'],
        fields: ['address_components', 'formatted_address'],
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (!place.address_components) return;

        let streetNumber = '';
        let streetName = '';
        let suburb = '';
        let state = '';
        let postcode = '';

        for (const comp of place.address_components) {
          const t = comp.types[0];
          if (t === 'street_number') streetNumber = comp.long_name;
          if (t === 'route') streetName = comp.long_name;
          if (t === 'locality') suburb = comp.long_name;
          if (t === 'administrative_area_level_1') state = comp.short_name;
          if (t === 'postal_code') postcode = comp.long_name;
        }

        onChange({
          line1: `${streetNumber} ${streetName}`.trim(),
          line2: value.line2,
          suburb,
          state: state || value.state,
          postcode,
        });
      });
      autocompleteRef.current = ac;
      setEnabled(true);
    });
  }, []);

  const cls = 'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand';

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          ref={inputRef}
          value={value.line1}
          onChange={(e) => onChange({ ...value, line1: e.target.value })}
          placeholder={enabled ? 'Start typing address…' : 'Street address *'}
          className={cls}
          autoComplete="off"
        />
        {enabled && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
            Auto
          </span>
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
          className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand`}
        />
        <select
          value={value.state}
          onChange={(e) => onChange({ ...value, state: e.target.value })}
          className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand`}
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
          className={`border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand`}
        />
      </div>
    </div>
  );
}
