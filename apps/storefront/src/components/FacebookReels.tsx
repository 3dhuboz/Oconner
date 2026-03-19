'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

const FB_PAGE = 'https://www.facebook.com/profile.php?id=61574996320860';
const FB_REELS = 'https://www.facebook.com/profile.php?id=61574996320860&sk=reels_tab';
const FB_FOLLOW = 'https://www.facebook.com/profile.php?id=61574996320860';

const REELS = [
  {
    id: 1,
    label: 'Life on the Farm',
    sublabel: 'Boyne Valley, QLD',
    bg: 'https://images.unsplash.com/photo-1516467508483-a7212febe31a?w=400&q=80',
    views: '12.4K',
  },
  {
    id: 2,
    label: 'From Paddock to Pack',
    sublabel: 'Premium Grass-Fed',
    bg: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&q=80',
    views: '8.1K',
    featured: true,
  },
  {
    id: 3,
    label: 'Meet the Cattle',
    sublabel: 'Regenerative Farming',
    bg: 'https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=400&q=80',
    views: '6.7K',
  },
];

export default function FacebookReels() {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section
      className="relative overflow-hidden py-20 px-4"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f1f0f 100%)',
      }}
    >
      {/* Subtle grain texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundSize: '200px 200px',
        }}
      />

      {/* Green glow accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-10 blur-[80px]"
        style={{ background: 'radial-gradient(circle, #2d6a2d 0%, transparent 70%)' }}
      />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2.5 bg-[#1877F2]/20 border border-[#1877F2]/30 backdrop-blur-sm px-4 py-2 rounded-full text-[#4fa3ff] text-sm font-semibold mb-5">
            <svg className="h-4 w-4 fill-[#4fa3ff]" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Follow us on Facebook
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white uppercase tracking-wide leading-tight mb-3"
            style={{ fontFamily: 'var(--font-heading)' }}>
            Life on the Farm
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Behind-the-scenes footage, paddock-to-pack stories & what's happening at O'Connor Agriculture.
          </p>
        </div>

        {/* Reel Cards */}
        <div className="flex items-center justify-center gap-4 md:gap-6 mb-12">
          {REELS.map((reel, i) => (
            <a
              key={reel.id}
              href={FB_REELS}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setHovered(reel.id)}
              onMouseLeave={() => setHovered(null)}
              className={`relative flex-shrink-0 rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ${
                reel.featured
                  ? 'w-44 md:w-52 h-[340px] md:h-[400px] shadow-2xl shadow-brand/30 ring-2 ring-brand/50 scale-105'
                  : 'w-36 md:w-44 h-[280px] md:h-[340px] opacity-85 hover:opacity-100'
              } ${hovered === reel.id ? 'scale-[1.03]' : ''}`}
            >
              {/* Background image */}
              <img
                src={reel.bg}
                alt={reel.label}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700"
                style={{ transform: hovered === reel.id ? 'scale(1.08)' : 'scale(1)' }}
              />

              {/* Dark overlay gradient */}
              <div className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.85) 100%)' }}
              />

              {/* Featured badge */}
              {reel.featured && (
                <div className="absolute top-3 left-0 right-0 flex justify-center">
                  <span className="bg-brand text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-lg">
                    Latest Reel
                  </span>
                </div>
              )}

              {/* Play button */}
              <div className={`absolute inset-0 flex items-center justify-center transition-all duration-200 ${hovered === reel.id ? 'opacity-100 scale-110' : 'opacity-80'}`}>
                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/40 flex items-center justify-center shadow-xl">
                  <Play className="h-5 w-5 text-white fill-white ml-0.5" />
                </div>
              </div>

              {/* Reel info */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <svg className="h-3 w-3 fill-[#4fa3ff] flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span className="text-[10px] text-blue-300 font-semibold">{reel.views} views</span>
                </div>
                <p className="text-white font-bold text-sm leading-tight line-clamp-2">{reel.label}</p>
                <p className="text-gray-300 text-xs mt-0.5">{reel.sublabel}</p>
              </div>

              {/* Vertical reel indicator dots */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1">
                {[0, 1, 2].map((d) => (
                  <div key={d} className={`w-1 h-1 rounded-full ${d === i ? 'bg-white' : 'bg-white/30'}`} />
                ))}
              </div>
            </a>
          ))}
        </div>

        {/* CTA Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={FB_REELS}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-[#1877F2] hover:bg-[#145dbf] text-white font-bold px-7 py-3.5 rounded-xl transition-all duration-200 shadow-lg shadow-[#1877F2]/30 text-base hover:scale-105"
          >
            <Play className="h-5 w-5 fill-white" />
            Watch Our Reels
          </a>
          <a
            href={FB_FOLLOW}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 border border-white/20 text-base hover:scale-105"
          >
            <svg className="h-5 w-5 fill-white" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Follow @OConnorAgriculture
          </a>
        </div>

        {/* Engagement note */}
        <p className="text-center text-gray-600 text-xs mt-6">
          🎬 New reels every week — behind the scenes, farm life & beef pack reveals
        </p>
      </div>
    </section>
  );
}
