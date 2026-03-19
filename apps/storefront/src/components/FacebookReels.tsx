'use client';

import { useRef, useState } from 'react';
import { Play, X, ExternalLink, Volume2, VolumeX } from 'lucide-react';

const FB_PAGE_ID = '61574996320860';
const FB_PAGE = `https://www.facebook.com/profile.php?id=${FB_PAGE_ID}`;
const FB_REELS = `https://www.facebook.com/profile.php?id=${FB_PAGE_ID}&sk=reels_tab`;

// ─── Configure your reels here ────────────────────────────────────────────────
// videoUrl: direct MP4 URL (R2 or CDN) — plays on hover inside the card
// fbVideoUrl: a specific Facebook reel/video URL — shown in the in-page modal
// Leave both null to use the Facebook page videos tab in the modal instead
const REELS = [
  {
    id: 1,
    label: 'Life on the Farm',
    sublabel: 'Boyne Valley, QLD',
    bg: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&q=80',
    views: null as string | null,
    videoUrl: null as string | null,   // e.g. 'https://pub-xxx.r2.dev/reel1.mp4'
    fbVideoUrl: null as string | null, // e.g. 'https://www.facebook.com/reel/123456'
    featured: false,
  },
  {
    id: 2,
    label: 'From Paddock to Pack',
    sublabel: 'Premium Grass-Fed',
    bg: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80',
    views: null as string | null,
    videoUrl: null as string | null,
    fbVideoUrl: null as string | null,
    featured: true,
  },
  {
    id: 3,
    label: 'Meet the Cattle',
    sublabel: 'Regenerative Farming',
    bg: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400&q=80',
    views: null as string | null,
    videoUrl: null as string | null,
    fbVideoUrl: null as string | null,
    featured: false,
  },
];

function FbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function ReelCard({
  reel,
  index,
  onOpenModal,
}: {
  reel: (typeof REELS)[number];
  index: number;
  onOpenModal: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  const handleEnter = () => {
    if (reel.videoUrl && videoRef.current) {
      videoRef.current.play().catch(() => {});
      setPlaying(true);
    }
  };

  const handleLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  return (
    <button
      type="button"
      onClick={onOpenModal}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={`relative flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 text-left group ${
        reel.featured
          ? 'w-44 md:w-52 h-[340px] md:h-[400px] shadow-2xl shadow-brand/30 ring-2 ring-brand/50 scale-105'
          : 'w-36 md:w-44 h-[280px] md:h-[340px] opacity-85 hover:opacity-100 hover:scale-[1.03]'
      }`}
    >
      {/* Thumbnail */}
      <img
        src={reel.bg}
        alt={reel.label}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${playing ? 'opacity-0' : 'opacity-100'}`}
        style={{ transform: playing ? 'scale(1.08)' : 'scale(1)' }}
      />

      {/* Hover video */}
      {reel.videoUrl && (
        <video
          ref={videoRef}
          src={reel.videoUrl}
          muted
          loop
          playsInline
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${playing ? 'opacity-100' : 'opacity-0'}`}
        />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.25) 40%, rgba(0,0,0,0.88) 100%)' }}
      />

      {/* Featured badge */}
      {reel.featured && (
        <div className="absolute top-3 left-0 right-0 flex justify-center">
          <span className="bg-brand text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg">
            Latest Reel
          </span>
        </div>
      )}

      {/* Play / watching indicator */}
      <div className={`absolute inset-0 flex items-center justify-center transition-all duration-200 pointer-events-none ${playing ? 'opacity-0' : 'opacity-100'}`}>
        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
          <Play className="h-5 w-5 text-white fill-white ml-0.5" />
        </div>
      </div>

      {/* Tap to watch hint on hover (no video) */}
      {!reel.videoUrl && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full border border-white/20 mt-16">
            Click to watch
          </div>
        </div>
      )}

      {/* Mute toggle (only when playing) */}
      {playing && (
        <button
          type="button"
          onClick={toggleMute}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center z-10"
        >
          {muted
            ? <VolumeX className="h-3.5 w-3.5 text-white" />
            : <Volume2 className="h-3.5 w-3.5 text-white" />
          }
        </button>
      )}

      {/* Reel info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
        <div className="flex items-center gap-1.5 mb-1">
          <FbIcon className="h-3 w-3 text-[#4fa3ff]" />
          <span className="text-[10px] text-blue-300 font-semibold">O'Connor Agriculture</span>
        </div>
        <p className="text-white font-bold text-sm leading-tight line-clamp-2">{reel.label}</p>
        <p className="text-gray-300 text-xs mt-0.5">{reel.sublabel}</p>
      </div>

      {/* Side dots */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 pointer-events-none">
        {[0, 1, 2].map((d) => (
          <div key={d} className={`w-1 h-1 rounded-full ${d === index ? 'bg-white' : 'bg-white/30'}`} />
        ))}
      </div>
    </button>
  );
}

export default function FacebookReels() {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalReel, setModalReel] = useState<(typeof REELS)[number] | null>(null);

  const openModal = (reel: (typeof REELS)[number]) => {
    setModalReel(reel);
    setModalOpen(true);
  };

  const fbEmbedSrc = modalReel?.fbVideoUrl
    ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(modalReel.fbVideoUrl)}&show_text=false&autoplay=1&mute=0&width=400`
    : `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(FB_PAGE)}&tabs=videos&width=500&height=600&small_header=true&adapt_container_width=false&hide_cover=false&show_facepile=false`;

  return (
    <section
      className="relative overflow-hidden py-20 px-4"
      style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f1f0f 100%)' }}
    >
      {/* Grain texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundSize: '200px 200px' }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-10 blur-[80px]" style={{ background: 'radial-gradient(circle, #2d6a2d 0%, transparent 70%)' }} />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2.5 bg-[#1877F2]/20 border border-[#1877F2]/30 backdrop-blur-sm px-4 py-2 rounded-full text-[#4fa3ff] text-sm font-semibold mb-5">
            <FbIcon className="h-4 w-4" />
            Follow us on Facebook
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-wide leading-tight mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
            Life on the Farm
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Behind-the-scenes footage, paddock-to-pack stories & what's happening at O'Connor Agriculture.
          </p>
          <p className="text-gray-600 text-sm mt-2">Hover a card to preview · click to watch in full</p>
        </div>

        {/* Reel Cards */}
        <div className="flex items-center justify-center gap-4 md:gap-6 mb-12">
          {REELS.map((reel, i) => (
            <ReelCard key={reel.id} reel={reel} index={i} onOpenModal={() => openModal(reel)} />
          ))}
        </div>

        {/* CTA Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => openModal(REELS[1])}
            className="flex items-center gap-3 bg-[#1877F2] hover:bg-[#145dbf] text-white font-bold px-7 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-[#1877F2]/30 text-base hover:scale-105"
          >
            <Play className="h-5 w-5 fill-white" />
            Watch Our Reels
          </button>
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

        {/* Engagement note */}
        <p className="text-center text-gray-600 text-xs mt-6">
          🎬 New reels every week — behind the scenes, farm life &amp; beef pack reveals
        </p>
      </div>

      {/* ── In-page video modal ───────────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl"
            style={{
              background: 'rgba(20,20,20,0.95)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <FbIcon className="h-5 w-5 text-[#4fa3ff]" />
                <div>
                  <p className="text-white font-bold text-sm leading-tight">{modalReel?.label}</p>
                  <p className="text-gray-500 text-xs">O'Connor Agriculture · Facebook</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={modalReel?.fbVideoUrl ?? FB_REELS}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[#4fa3ff] text-xs font-semibold hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open on Facebook
                </a>
                <button
                  onClick={() => setModalOpen(false)}
                  className="ml-2 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>

            {/* Embedded Facebook videos / reel */}
            <div className="flex items-center justify-center bg-black" style={{ minHeight: 420 }}>
              <iframe
                src={fbEmbedSrc}
                width="100%"
                height="500"
                style={{ border: 'none', display: 'block', maxWidth: 500 }}
                scrolling="no"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                allowFullScreen
                title="O'Connor Agriculture Facebook Videos"
              />
            </div>

            {/* Modal footer */}
            <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
              <p className="text-gray-600 text-xs">Videos stream directly from Facebook</p>
              <a
                href={FB_PAGE}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-[#1877F2] hover:bg-[#145dbf] text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
              >
                <FbIcon className="h-3.5 w-3.5" /> Follow Page
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
