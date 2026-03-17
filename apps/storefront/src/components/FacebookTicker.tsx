'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface TickerItem {
  text: string;
  url?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://oconner-api.steve-700.workers.dev';

export default function FacebookTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/api/ticker`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data) && data.length > 0) setItems(data); })
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;

  const doubled = [...items, ...items];
  const duration = Math.max(items.length * 8, 20);

  return (
    <div className="bg-[#1877F2] text-white overflow-hidden flex items-stretch" style={{ height: '36px' }}>
      <div className="flex-shrink-0 flex items-center gap-2 px-4 bg-[#145dbf] font-semibold text-sm tracking-wide">
        <svg className="h-4 w-4 fill-white flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
        <span className="hidden sm:inline">Updates</span>
      </div>
      <div className="flex-1 overflow-hidden relative flex items-center">
        <div
          className="flex items-center gap-0 whitespace-nowrap"
          style={{ animation: `ticker-scroll ${duration}s linear infinite` }}
        >
          {doubled.map((item, i) => (
            <span key={i} className="inline-flex items-center text-sm">
              {item.url ? (
                <Link href={item.url} className="hover:text-blue-100 transition-colors px-6">
                  {item.text}
                </Link>
              ) : (
                <span className="px-6">{item.text}</span>
              )}
              <span className="text-blue-300 select-none">•</span>
            </span>
          ))}
        </div>
        <style>{`
          @keyframes ticker-scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </div>
    </div>
  );
}
