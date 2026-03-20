'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { Play, X, ExternalLink, Loader2 } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://oconner-api.steve-700.workers.dev';

const FB_PAGE_ID = '61574996320860';
const FB_PAGE = `https://www.facebook.com/profile.php?id=${FB_PAGE_ID}`;
const FB_REELS = `https://www.facebook.com/profile.php?id=${FB_PAGE_ID}&sk=reels_tab`;

interface ReelItem {
  id: string;
  label: string;
  sublabel: string;
  thumbnail: string | null;
  videoUrl: string | null;
  fbUrl: string;
  featured: boolean;
}

const FALLBACK_REELS: ReelItem[] = [
  { id: 'f1', label: 'Life on the Farm', sublabel: 'Boyne Valley, QLD', thumbnail: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&q=80', videoUrl: null, fbUrl: FB_REELS, featured: false },
  { id: 'f2', label: 'From Paddock to Pack', sublabel: 'Premium Grass-Fed', thumbnail: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80', videoUrl: null, fbUrl: FB_REELS, featured: true },
  { id: 'f3', label: 'Meet the Cattle', sublabel: 'Regenerative Farming', thumbnail: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400&q=80', videoUrl: null, fbUrl: FB_REELS, featured: false },
];

function FbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function isReelUrl(url: string | null): boolean {
  return !!url && (
    url.includes('/reel/') ||
    url.includes('/videos/') ||
    url.includes('/watch/')
  );
}

function buildFbVideoSrc(fbUrl: string) {
  return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(fbUrl)}&show_text=false&autoplay=1&mute=0&width=400`;
}

// ── Crystal Popout Modal ──────────────────────────────────────────────────────

function ReelModal({ reel, onClose }: { reel: ReelItem; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canEmbed = !!reel.videoUrl || isReelUrl(reel.fbUrl);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    // Autoplay direct video
    if (reel.videoUrl && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose, reel.videoUrl]);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      {/* Crystal popout shell */}
      <div
        className="relative flex flex-col rounded-3xl overflow-hidden shadow-2xl"
        style={{
          width: 'min(380px, 90vw)',
          maxHeight: '90vh',
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow: '0 8px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle inner glow */}
        <div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.1) 0%, transparent 60%)' }}
        />

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110"
          style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
        >
          <X className="h-4 w-4 text-white" />
        </button>

        {/* Video area — 9:16 portrait */}
        <div className="relative w-full" style={{ aspectRatio: '9/16' }}>
          {reel.videoUrl ? (
            <video
              ref={videoRef}
              src={reel.videoUrl}
              controls
              autoPlay
              playsInline
              loop
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : isReelUrl(reel.fbUrl) ? (
            <iframe
              src={buildFbVideoSrc(reel.fbUrl)}
              className="absolute inset-0 w-full h-full border-0"
              scrolling="no"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              title={reel.label}
            />
          ) : (
            /* Fallback: thumbnail + open-on-Facebook CTA */
            <>
              {reel.thumbnail && (
                <img src={reel.thumbnail} alt={reel.label} className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
                <a
                  href={reel.fbUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#1877F2] hover:bg-[#145dbf] text-white font-bold px-5 py-3 rounded-xl transition-all hover:scale-105 text-sm shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Play className="h-4 w-4 fill-white" /> Watch on Facebook
                </a>
              </div>
            </>
          )}

          {/* Bottom gradient scrim over video */}
          <div
            className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)' }}
          />
        </div>

        {/* Footer info bar */}
        <div
          className="relative z-10 px-4 py-3 flex items-center justify-between gap-3"
          style={{ background: 'rgba(255,255,255,0.05)', borderTop: '1px solid rgba(255,255,255,0.1)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <FbIcon className="h-4 w-4 text-[#4fa3ff] flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight truncate">{reel.label}</p>
              <p className="text-gray-400 text-xs truncate">{reel.sublabel}</p>
            </div>
          </div>
          <a
            href={reel.fbUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 flex items-center gap-1.5 text-[#4fa3ff] hover:text-blue-300 text-xs font-semibold transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Facebook
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Reel Card ─────────────────────────────────────────────────────────────────

function ReelCard({ reel, index, total, onSelect }: { reel: ReelItem; index: number; total: number; onSelect: (r: ReelItem) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);

  const cardH = reel.featured ? 400 : 340;

  const handleEnter = () => {
    setHovered(true);
    if (reel.videoUrl && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  };

  const handleLeave = () => {
    setHovered(false);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const showVideo = hovered && !!reel.videoUrl;

  return (
    <div
      className={`relative flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 group ${
        reel.featured
          ? 'w-44 md:w-52 shadow-2xl shadow-brand/30 ring-2 ring-brand/50 scale-105'
          : 'w-36 md:w-44 opacity-85 hover:opacity-100 hover:scale-[1.03]'
      }`}
      style={{ height: cardH }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onClick={() => onSelect(reel)}
    >
      {/* Thumbnail */}
      {reel.thumbnail ? (
        <img
          src={reel.thumbnail}
          alt={reel.label}
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${showVideo ? 'opacity-0 scale-110' : 'opacity-100 scale-100'}`}
        />
      ) : (
        <div className={`absolute inset-0 bg-gray-800 transition-opacity duration-500 ${showVideo ? 'opacity-0' : 'opacity-100'}`} />
      )}

      {/* Hover snippet */}
      {reel.videoUrl && (
        <video
          ref={videoRef}
          src={reel.videoUrl}
          muted
          loop
          playsInline
          preload="metadata"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${showVideo ? 'opacity-100' : 'opacity-0'}`}
        />
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.9) 100%)' }}
      />

      {/* Featured badge */}
      {reel.featured && (
        <div className="absolute top-3 left-0 right-0 flex justify-center pointer-events-none">
          <span className="bg-brand text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg">
            Latest Reel
          </span>
        </div>
      )}

      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className={`w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center shadow-xl transition-transform duration-200 ${hovered ? 'scale-110' : 'scale-100'}`}>
          <Play className="h-5 w-5 text-white fill-white ml-0.5" />
        </div>
      </div>

      {/* Card footer */}
      <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
        <div className="flex items-center gap-1.5 mb-0.5">
          <FbIcon className="h-3 w-3 text-[#4fa3ff]" />
          <span className="text-[10px] text-blue-300 font-semibold">O'Connor Agriculture</span>
        </div>
        <p className="text-white font-bold text-sm leading-tight line-clamp-2">{reel.label}</p>
        <p className="text-gray-300 text-[11px] mt-0.5">{reel.sublabel}</p>
      </div>

      {/* Side dots */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 pointer-events-none">
        {Array.from({ length: total }).map((_, d) => (
          <div key={d} className={`w-1 h-1 rounded-full ${d === index ? 'bg-white' : 'bg-white/30'}`} />
        ))}
      </div>
    </div>
  );
}

function SkeletonCard({ featured }: { featured: boolean }) {
  return (
    <div
      className={`relative flex-shrink-0 rounded-2xl overflow-hidden animate-pulse bg-white/5 ${
        featured ? 'w-44 md:w-52 scale-105' : 'w-36 md:w-44 opacity-70'
      }`}
      style={{ height: featured ? 400 : 340 }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-white/10" />
      <div className="absolute bottom-3 left-3 right-3 space-y-1.5">
        <div className="h-3 bg-white/10 rounded w-2/3" />
        <div className="h-2 bg-white/10 rounded w-1/2" />
      </div>
    </div>
  );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function FacebookReels() {
  const [reels, setReels] = useState<ReelItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ReelItem | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/reels`)
      .then((r) => r.json() as Promise<{ reels: ReelItem[] }>)
      .then((data) => {
        const items = data?.reels ?? [];
        setReels(items.length > 0 ? items : FALLBACK_REELS);
      })
      .catch(() => setReels(FALLBACK_REELS))
      .finally(() => setLoading(false));
  }, []);

  const handleClose = useCallback(() => setSelected(null), []);

  const displayReels = loading ? [] : reels;

  return (
    <>
      <section
        className="relative overflow-hidden py-20 px-4"
        style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f1f0f 100%)' }}
      >
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundSize: '200px 200px' }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-10 blur-[80px]" style={{ background: 'radial-gradient(circle, #2d6a2d 0%, transparent 70%)' }} />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2.5 bg-[#1877F2]/20 border border-[#1877F2]/30 backdrop-blur-sm px-4 py-2 rounded-full text-[#4fa3ff] text-sm font-semibold mb-5">
              <FbIcon className="h-4 w-4" />
              Follow us on Facebook
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-wide leading-tight mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              Life on the Farm
            </h2>
            <p className="text-gray-400 text-lg max-w-xl mx-auto">
              Behind-the-scenes footage, paddock-to-pack stories &amp; what's happening at O'Connor Agriculture.
            </p>
            <p className="text-gray-600 text-sm mt-2">
              {loading
                ? <span className="inline-flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Loading latest reels…</span>
                : 'Click a card to watch'
              }
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 md:gap-6 mb-12">
            {loading ? (
              <>
                <SkeletonCard featured={false} />
                <SkeletonCard featured={true} />
                <SkeletonCard featured={false} />
              </>
            ) : (
              displayReels.map((reel, i) => (
                <ReelCard key={reel.id} reel={reel} index={i} total={displayReels.length} onSelect={setSelected} />
              ))
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={FB_REELS}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-[#1877F2] hover:bg-[#145dbf] text-white font-bold px-7 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-[#1877F2]/30 text-base hover:scale-105"
            >
              <Play className="h-5 w-5 fill-white" />
              Watch All Reels
            </a>
            <a
              href={FB_PAGE}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 border border-white/20 text-base hover:scale-105"
            >
              <FbIcon className="h-5 w-5" />
              Follow @OConnorAgriculture
            </a>
          </div>

          <p className="text-center text-gray-600 text-xs mt-6">
            🎬 New reels every week — behind the scenes, farm life &amp; beef pack reveals
          </p>
        </div>
      </section>

      {selected && <ReelModal reel={selected} onClose={handleClose} />}
    </>
  );
}
