'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { api, API_URL, formatCurrency } from '@butcher/shared';
import type { Product } from '@butcher/shared';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CutAdvisor from '@/components/CutAdvisor';
import FacebookTicker from '@/components/FacebookTicker';
import FacebookReels from '@/components/FacebookReels';
import { Settings, ChevronDown, Star, ArrowRight, ShoppingCart } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useCountUp } from '@/hooks/useCountUp';

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://butcher-admin.pages.dev';
const DRIVER_URL = process.env.NEXT_PUBLIC_DRIVER_URL ?? 'https://butcher-driver.pages.dev';

interface Feature { icon: string; title: string; description: string }
interface Config {
  hero: { badge: string; headline: string; headlineLine2: string; body: string; tagline: string; primaryCta: string; secondaryCta: string; heroImageUrl: string };
  features: Feature[];
  cta: { headline: string; subtext: string; note: string; buttonText: string };
  contact: { email: string; social: string; location: string };
}
interface RewardsConfig {
  enabled: boolean;
  stampsRequired: number;
  prize: string;
  programName: string;
}

const DEFAULTS: Config = {
  hero: {
    badge: 'Locally Raised • Grass Fed • Naturally Healthy',
    headline: 'Local Grass Fed Beef.',
    headlineLine2: 'Delivered to Your Door.',
    body: "First generation family farm from the Boyne Valley, QLD. We use regenerative management practices to produce quality beef that's good for the land and good for you.",
    tagline: '"Good for the land. Good for the community. Good for you."',
    primaryCta: 'Order Now',
    secondaryCta: 'Delivery Schedule',
    heroImageUrl: '/hero-cows.jpg',
  },
  features: [
    { icon: '🌿', title: 'Regenerative Farming', description: 'We focus on soil health and animal welfare, producing beef you can feel good about eating.' },
    { icon: '🚚', title: 'Free Delivery', description: 'Temperature-controlled delivery straight to your door. All prices include delivery.' },
    { icon: '👨‍👩‍👧', title: 'Family Owned', description: 'First generation family farm from Calliope and the Boyne Valley, QLD.' },
  ],
  cta: { headline: "Ready to Order?", subtext: 'Browse our beef boxes — BBQ Box, Family Box, Double, and Value Box.', note: 'All prices include free delivery to your door.', buttonText: 'View Beef Boxes' },
  contact: { email: 'orders@oconnoragriculture.com.au', social: 'https://www.facebook.com/profile.php?id=655149441012938', location: 'Calliope & Boyne Valley, QLD' },
};

const TESTIMONIALS = [
  { name: 'Sarah M.', location: 'Gladstone, QLD', text: 'The best beef we have ever had. You can taste the difference with grass-fed. Our family orders the BBQ Box every month now.', rating: 5 },
  { name: 'David K.', location: 'Tannum Sands, QLD', text: 'The Family Box is incredible value. Premium quality cuts, perfectly packed, and delivered right to our door. Cannot go back to supermarket beef.', rating: 5 },
  { name: 'Michelle R.', location: 'Boyne Island, QLD', text: 'Love supporting a local farm family. The meat is always fresh, the delivery is reliable, and Seamus genuinely cares about quality.', rating: 5 },
];

const HOW_IT_WORKS = [
  { step: '01', icon: '🛒', title: 'Choose Your Box', description: 'Pick from our range of beef boxes or select individual cuts. All prices include free delivery.' },
  { step: '02', icon: '🥩', title: 'We Pack It Fresh', description: 'Butchered and vacuum-sealed in temperature-controlled packaging within 24 hours of your order.' },
  { step: '03', icon: '🚚', title: 'Delivered to You', description: 'Delivered on the next scheduled run straight to your door. Track your order in real time.' },
];

function StatCounter({ target, suffix, label }: { target: number; suffix: string; label: string }) {
  const { count, ref } = useCountUp(target);
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-black text-white" style={{ fontFamily: 'var(--font-heading)' }}>
        {count}{suffix}
      </div>
      <div className="text-white/60 text-sm mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}

export default function HomePage() {
  const [cfg, setCfg] = useState<Config>(DEFAULTS);
  const [rewards, setRewards] = useState<RewardsConfig | null>(null);
  const [staffRole, setStaffRole] = useState<'admin' | 'driver' | null>(null);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const { getToken, isSignedIn } = useAuth();

  useScrollReveal();

  useEffect(() => {
    api.config.get('storefront')
      .then((data) => { if (data) setCfg({ ...DEFAULTS, ...(data as Partial<Config>) }); })
      .catch(() => {});
    api.config.get('rewards')
      .then((data) => { const r = (data as any)?.value ?? data; if (r?.enabled) setRewards(r as RewardsConfig); })
      .catch(() => {});
    api.products.list(true)
      .then((data) => {
        const prods = (data as Product[]).filter(p => p.category === 'packs' && p.imageUrl);
        setFeaturedProducts(prods.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSignedIn) { setStaffRole(null); return; }
    getToken()
      .then(t => t ? fetch(`${API_URL}/api/users/me`, { headers: { Authorization: `Bearer ${t}` } }) : null)
      .then(r => (r?.ok ? r.json() : null))
      .then((u: { role?: string } | null) => setStaffRole(u?.role === 'admin' ? 'admin' : u?.role === 'driver' ? 'driver' : null))
      .catch(() => setStaffRole(null));
  }, [isSignedIn]);

  const { hero, features, cta } = cfg;

  return (
    <>
      <Navbar />
      <FacebookTicker />

      {/* Staff/Driver bars — unchanged */}
      {staffRole === 'admin' && (
        <div className="bg-brand-dark text-white text-sm px-4 py-2 flex items-center justify-between gap-4">
          <span className="text-white/70">Staff view</span>
          <div className="flex items-center gap-4">
            <a href={`${ADMIN_URL}/delivery-days`} target="_blank" rel="noopener noreferrer" className="hover:text-brand-light transition-colors">Delivery Days</a>
            <a href={`${ADMIN_URL}/orders`} target="_blank" rel="noopener noreferrer" className="hover:text-brand-light transition-colors">Orders</a>
            <a href={`${ADMIN_URL}/products`} target="_blank" rel="noopener noreferrer" className="hover:text-brand-light transition-colors">Products</a>
            <a href={ADMIN_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 px-3 py-1 rounded-md font-medium transition-colors">
              <Settings className="h-3.5 w-3.5" /> Admin Panel
            </a>
          </div>
        </div>
      )}
      {staffRole === 'driver' && (
        <div className="bg-gray-800 text-white text-sm px-4 py-2 flex items-center justify-end gap-4">
          <span className="text-white/50 text-xs">Driver</span>
          <a href={DRIVER_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-md font-medium transition-colors">
            🚚 Open Driver App
          </a>
        </div>
      )}

      <main className="flex-1">

        {/* ═══ HERO — Full viewport parallax ═══ */}
        <section
          className="parallax-hero min-h-screen flex items-center justify-center relative overflow-hidden"
          style={{ backgroundImage: `url(${hero.heroImageUrl})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-brand/80 via-brand/60 to-brand-dark/90" />
          <div className="max-w-4xl mx-auto text-center relative z-10 px-4 py-20">
            <div className="hero-text-reveal">
              <span className="inline-block bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 text-brand-light text-xs font-semibold tracking-[0.2em] uppercase mb-6">
                {hero.badge}
              </span>
            </div>
            <h1 className="hero-text-reveal hero-delay-1 text-5xl md:text-7xl font-black tracking-wide uppercase mb-6 leading-[0.95] text-white" style={{ fontFamily: 'var(--font-heading)' }}>
              {hero.headline}<br />{hero.headlineLine2}
            </h1>
            <p className="hero-text-reveal hero-delay-2 text-lg md:text-xl text-white/80 mb-3 max-w-2xl mx-auto leading-relaxed">{hero.body}</p>
            <p className="hero-text-reveal hero-delay-2 text-white/50 text-sm italic mb-10">{hero.tagline}</p>
            <div className="hero-text-reveal hero-delay-3 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/shop" className="bg-accent hover:bg-red-700 text-white font-bold px-10 py-4 rounded-xl transition-all text-lg uppercase tracking-wide shadow-lg shadow-accent/30 animate-pulse-glow">
                {hero.primaryCta}
              </Link>
              <Link href="/delivery-days" className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold px-10 py-4 rounded-xl transition-all text-lg border border-white/30 uppercase tracking-wide">
                {hero.secondaryCta}
              </Link>
            </div>
          </div>
          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 hero-text-reveal hero-delay-4">
            <ChevronDown className="h-8 w-8 text-white/40 animate-bounce" />
          </div>
        </section>

        {/* ═══ TRUST BAR — Animated stat counters ═══ */}
        <section className="bg-brand-dark py-10 px-4">
          <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatCounter target={500} suffix="+" label="Families Served" />
            <StatCounter target={100} suffix="%" label="Grass Fed" />
            <StatCounter target={15000} suffix="+" label="kg Delivered" />
            <StatCounter target={5} suffix="★" label="Customer Rating" />
          </div>
        </section>

        {/* ═══ FEATURED PRODUCTS — 3D tilt cards ═══ */}
        {featuredProducts.length > 0 && (
          <section className="py-20 px-4 bg-white">
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-14">
                <p className="reveal text-brand text-sm font-semibold tracking-[0.15em] uppercase mb-2">Most Popular</p>
                <h2 className="reveal stagger-1 text-4xl md:text-5xl font-black uppercase tracking-wide text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                  Our Bestselling Boxes
                </h2>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {featuredProducts.map((product, i) => (
                  <Link href="/shop" key={product.id} className={`card-3d reveal stagger-${i + 1}`}>
                    <div className="card-3d-inner bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-md">
                      {i === 0 && (
                        <div className="absolute top-4 left-4 z-10 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                          Best Seller
                        </div>
                      )}
                      <div className="relative overflow-hidden">
                        <img src={product.imageUrl} alt={product.name} className="w-full h-56 object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{product.name}</h3>
                        {product.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description}</p>}
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-black text-brand">{formatCurrency(product.fixedPrice ?? 0)}</span>
                          <span className="flex items-center gap-1.5 text-brand text-sm font-semibold">
                            View <ArrowRight className="h-4 w-4" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ═══ WHY O'CONNOR — Enhanced features ═══ */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="reveal text-4xl md:text-5xl font-black uppercase tracking-wide text-center mb-14 text-brand" style={{ fontFamily: 'var(--font-heading)' }}>
              Why O&apos;Connor?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((item, i) => (
                <div key={item.title} className={`reveal stagger-${i + 1} bg-white rounded-2xl p-8 shadow-sm text-center hover:shadow-lg transition-shadow`}>
                  <div className="text-5xl mb-4 animate-float" style={{ animationDelay: `${i * 0.5}s` }}>{item.icon}</div>
                  <h3 className="text-xl font-bold mb-2 text-brand">{item.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ FARM STORY — Split layout ═══ */}
        <section className="py-20 px-4 bg-white overflow-hidden">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div className="reveal-left">
              <p className="text-brand text-sm font-semibold tracking-[0.15em] uppercase mb-3">Our Story</p>
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-wide text-gray-900 mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
                From Paddock<br />to Your Plate
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                O&apos;Connor Agriculture is a first-generation family farm nestled in the Boyne Valley, QLD. We practice regenerative farming — focusing on soil health, biodiversity, and animal welfare to produce beef that&apos;s better for the land and better for you.
              </p>
              <p className="text-gray-600 leading-relaxed mb-6">
                Every cut is grass-fed, free-range, and delivered fresh to your door. No feedlots, no hormones, no shortcuts — just honest farming done right.
              </p>
              <Link href="/about" className="inline-flex items-center gap-2 text-brand font-semibold hover:text-brand-mid transition-colors">
                Read Our Full Story <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="reveal-right relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img src={hero.heroImageUrl} alt="O'Connor Agriculture Farm" className="w-full h-[400px] object-cover" loading="lazy" />
              </div>
              <div className="absolute -bottom-4 -left-4 bg-brand text-white rounded-xl px-5 py-3 shadow-lg animate-float">
                <p className="text-xs uppercase tracking-wider text-brand-light">Established</p>
                <p className="text-2xl font-black" style={{ fontFamily: 'var(--font-heading)' }}>2020</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ HOW IT WORKS — 3-step process ═══ */}
        <section className="py-20 px-4 bg-brand-dark text-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="reveal text-brand-light/70 text-sm font-semibold tracking-[0.15em] uppercase mb-2">Simple & Easy</p>
              <h2 className="reveal stagger-1 text-4xl md:text-5xl font-black uppercase tracking-wide" style={{ fontFamily: 'var(--font-heading)' }}>
                How It Works
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8 relative">
              {/* Connecting line (desktop only) */}
              <div className="hidden md:block absolute top-16 left-[16%] right-[16%] h-0.5 bg-white/10" />
              {HOW_IT_WORKS.map((step, i) => (
                <div key={step.step} className={`reveal stagger-${i + 1} text-center relative`}>
                  <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-5 text-3xl relative z-10">
                    {step.icon}
                  </div>
                  <div className="text-brand-light/40 text-xs font-bold tracking-widest uppercase mb-2">{step.step}</div>
                  <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ TESTIMONIALS — Customer reviews ═══ */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <p className="reveal text-brand text-sm font-semibold tracking-[0.15em] uppercase mb-2">What Our Customers Say</p>
              <h2 className="reveal stagger-1 text-4xl md:text-5xl font-black uppercase tracking-wide text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                Real Reviews
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {TESTIMONIALS.map((review, i) => (
                <div key={review.name} className={`reveal stagger-${i + 1} bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow`}>
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: review.rating }).map((_, j) => (
                      <Star key={j} className="h-5 w-5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-6 italic">&ldquo;{review.text}&rdquo;</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center font-bold text-sm">
                      {review.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{review.name}</p>
                      <p className="text-xs text-gray-400">{review.location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ LOYALTY — Existing, unchanged ═══ */}
        {rewards && (
          <section className="reveal py-12 px-4 bg-brand text-white">
            <div className="max-w-4xl mx-auto text-center">
              <p className="text-brand-light text-sm font-semibold tracking-[0.15em] uppercase mb-2">Loyalty Program</p>
              <h2 className="text-3xl md:text-4xl font-black uppercase tracking-wide mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                {rewards.programName}
              </h2>
              <p className="text-lg text-brand-light mb-2">
                Place <span className="text-white font-bold">{rewards.stampsRequired} orders</span> and earn a <span className="text-white font-bold">{rewards.prize}</span>
              </p>
              <p className="text-brand-light/70 text-sm mb-6">Every order gets you one step closer to your reward.</p>
              <Link href="/shop" className="bg-white text-brand font-bold px-8 py-3 rounded-lg hover:bg-brand-light transition-colors inline-block uppercase tracking-wide">
                Start Earning
              </Link>
            </div>
          </section>
        )}

        {/* ═══ FACEBOOK REELS — Existing ═══ */}
        <FacebookReels />

        {/* ═══ CUT ADVISOR — Existing ═══ */}
        <CutAdvisor />

        {/* ═══ FINAL CTA — Enhanced ═══ */}
        <section className="py-20 px-4 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `url(${hero.heroImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          <div className="max-w-6xl mx-auto text-center relative z-10">
            <h2 className="reveal text-4xl md:text-5xl font-black uppercase tracking-wide mb-4 text-brand" style={{ fontFamily: 'var(--font-heading)' }}>
              {cta.headline}
            </h2>
            <p className="reveal stagger-1 text-gray-600 mb-2 text-lg">{cta.subtext}</p>
            <p className="reveal stagger-2 text-gray-500 text-sm mb-10">{cta.note}</p>
            <Link href="/shop" className="reveal stagger-3 bg-brand hover:bg-brand-mid text-white font-bold px-12 py-4 rounded-xl transition-all text-lg inline-flex items-center gap-2 uppercase tracking-wide shadow-lg hover:shadow-xl hover:-translate-y-0.5">
              <ShoppingCart className="h-5 w-5" /> {cta.buttonText}
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
