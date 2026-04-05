'use client';

import { useRef, useState, useEffect } from 'react';
import { Play, X, ExternalLink } from 'lucide-react';
import { API_URL } from '@butcher/shared';

const FB_PAGE_ID = '61574996320860';
const FB_REELS = `https://www.facebook.com/profile.php?id=${FB_PAGE_ID}&sk=reels_tab`;

interface ReelItem {
  id: string;
  label: string;
  sublabel: string;
  thumbnail: string | null;
  fbUrl: string;
  featured: boolean;
}

const FALLBACK_REELS: ReelItem[] = [
  { id: 'f1', label: 'Life on the Farm', sublabel: 'Boyne Valley, QLD', thumbnail: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&q=80', fbUrl: FB_REELS, featured: false },
  { id: 'f2', label: 'From Paddock to Pack', sublabel: 'Premium Grass-Fed', thumbnail: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80', fbUrl: FB_REELS, featured: true },
  { id: 'f3', label: 'Meet the Cattle', sublabel: 'Regenerative Farming', thumbnail: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400&q=80', fbUrl: FB_REELS, featured: false },
];

function FbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function buildFbEmbedSrc(fbUrl: string) {
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(fbUrl)}&show_text=false&autoplay=1&mute=0&width=400`;
}

// ── Modal with Facebook iframe embed ────────────────────────────────────────

function ReelModal({ reel, onClose }: { reel: ReelItem; onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)' }}
    >
      <div className="relative w-full max-w-[420px]">
        {/* Close button */}
        <button onClick={onClose} className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10">
          <X className="h-5 w-5 text-white" />
        </button>

        {/* Facebook embed iframe */}
        <div className="rounded-2xl overflow-hidden bg-black" style={{ aspectRatio: '9/16' }}>
          <iframe
            src={buildFbEmbedSrc(reel.fbUrl)}
            className="w-full h-full border-0"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-sm">{reel.label}</p>
            <p className="text-white/60 text-xs">{reel.sublabel}</p>
          </div>
          <a
            href={reel.fbUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-2 rounded-full transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Facebook
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Reel Card ───────────────────────────────────────────────────────────────

function ReelCard({ reel, onSelect }: { reel: ReelItem; onSelect: (r: ReelItem) => void }) {
  const isFeatured = reel.featured;

  return (
    <button
      onClick={() => onSelect(reel)}
      className={`relative overflow-hidden rounded-2xl flex-shrink-0 group transition-all duration-300 ${
        isFeatured
          ? 'w-52 h-[400px] scale-105 ring-2 ring-brand/60 shadow-xl shadow-brand/20'
          : 'w-44 h-[340px] opacity-85 hover:opacity-100 hover:scale-105'
      }`}
    >
      {/* Thumbnail */}
      {reel.thumbnail ? (
        <img src={reel.thumbnail} alt={reel.label} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-brand to-brand-dark flex items-center justify-center">
          <FbIcon className="h-12 w-12 text-white/30" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* Featured badge */}
      {isFeatured && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2">
          <span className="bg-brand text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">
            Latest Reel
          </span>
        </div>
      )}

      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 group-hover:scale-110 transition-all">
          <Play className="h-6 w-6 text-white fill-white ml-1" />
        </div>
      </div>

      {/* Info bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex items-center gap-1.5 mb-1.5">
          <FbIcon className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-white/70 text-[11px] font-medium">O'Connor Agriculture</span>
        </div>
        <p className="text-white font-bold text-sm leading-tight">{reel.label}</p>
        <p className="text-white/60 text-xs">{reel.sublabel}</p>
      </div>
    </button>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function FacebookReels() {
  const [reels, setReels] = useState<ReelItem[]>(FALLBACK_REELS);
  const [selected, setSelected] = useState<ReelItem | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/reels`)
      .then((r) => r.json())
      .then((data: { reels: ReelItem[] }) => {
        if (data.reels?.length > 0) setReels(data.reels);
      })
      .catch(() => {});
  }, []);

  return (
    <section className="py-16 bg-gradient-to-b from-[#1B3A2E] to-[#0f2419] overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 text-center">
        <h2 className="text-3xl font-black text-white uppercase tracking-wider mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
          Life on the Farm
        </h2>
        <p className="text-white/60 text-sm mb-2 max-w-lg mx-auto">
          Behind-the-scenes footage, paddock-to-pack stories & what's happening at O'Connor Agriculture.
        </p>
        <p className="text-white/40 text-xs mb-10">Click a card to watch</p>

        {/* Reel cards */}
        <div ref={scrollRef} className="flex justify-center items-center gap-5 pb-4 overflow-x-auto scrollbar-hide">
          {reels.map((reel) => (
            <ReelCard key={reel.id} reel={reel} onSelect={setSelected} />
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap justify-center gap-4 mt-10">
          <a
            href={FB_REELS}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-brand hover:bg-brand-mid text-white px-6 py-3 rounded-full font-semibold text-sm transition-colors shadow-lg shadow-brand/30"
          >
            <Play className="h-4 w-4" /> Watch All Reels
          </a>
          <a
            href={`https://www.facebook.com/profile.php?id=${FB_PAGE_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full font-semibold text-sm transition-colors border border-white/20"
          >
            <FbIcon className="h-4 w-4" /> Follow @OConnorAgriculture
          </a>
        </div>
      </div>

      {/* Modal */}
      {selected && <ReelModal reel={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
