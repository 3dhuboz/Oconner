'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { api } from '@butcher/shared';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CutAdvisor from '@/components/CutAdvisor';
import FacebookTicker from '@/components/FacebookTicker';
import { Settings } from 'lucide-react';

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://butcher-admin.pages.dev';
const DRIVER_URL = process.env.NEXT_PUBLIC_DRIVER_URL ?? 'https://butcher-driver.pages.dev';

interface Feature { icon: string; title: string; description: string }
interface Config {
  hero: { badge: string; headline: string; headlineLine2: string; body: string; tagline: string; primaryCta: string; secondaryCta: string; heroImageUrl: string };
  features: Feature[];
  cta: { headline: string; subtext: string; note: string; buttonText: string };
  contact: { email: string; social: string; location: string };
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
  contact: { email: 'orders@oconnoragriculture.com.au', social: 'https://www.facebook.com/profile.php?id=61574996320860', location: 'Calliope & Boyne Valley, QLD' },
};

export default function HomePage() {
  const [cfg, setCfg] = useState<Config>(DEFAULTS);
  const [staffRole, setStaffRole] = useState<'admin' | 'driver' | null>(null);
  const { getToken, isSignedIn } = useAuth();

  useEffect(() => {
    api.config.get('storefront')
      .then((data: any) => { if (data) setCfg({ ...DEFAULTS, ...data }); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!isSignedIn) { setStaffRole(null); return; }
    getToken()
      .then(t => t ? fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787'}/api/users/me`, { headers: { Authorization: `Bearer ${t}` } }) : null)
      .then(r => (r?.ok ? r.json() : null))
      .then((u: any) => setStaffRole(u?.role === 'admin' ? 'admin' : u?.role === 'driver' ? 'driver' : null))
      .catch(() => setStaffRole(null));
  }, [isSignedIn]);

  const { hero, features, cta } = cfg;

  return (
    <>
      <Navbar />
      <FacebookTicker />
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
        <section
          className="bg-brand text-white py-20 px-4 relative overflow-hidden"
          style={hero.heroImageUrl ? { backgroundImage: `url(${hero.heroImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
        >
          {hero.heroImageUrl && <div className="absolute inset-0 bg-brand/70" />}
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <p className="text-brand-light text-sm font-semibold tracking-[0.2em] uppercase mb-4">
              {hero.badge}
            </p>
            <h1 className="text-5xl md:text-7xl font-black tracking-wide uppercase mb-4 leading-none" style={{ fontFamily: 'var(--font-heading)' }}>
              {hero.headline}<br />{hero.headlineLine2}
            </h1>
            <p className="text-lg text-brand-light mb-2 max-w-2xl mx-auto">{hero.body}</p>
            <p className="text-brand-light/70 text-sm italic mb-8">{hero.tagline}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/shop" className="bg-accent hover:bg-red-700 text-white font-bold px-8 py-4 rounded-lg transition-colors text-lg uppercase tracking-wide">
                {hero.primaryCta}
              </Link>
              <Link href="/delivery-days" className="bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-lg transition-colors text-lg border border-white/30 uppercase tracking-wide">
                {hero.secondaryCta}
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-black uppercase tracking-wide text-center mb-12 text-brand" style={{ fontFamily: 'var(--font-heading)' }}>
              Why O&apos;Connor?
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((item) => (
                <div key={item.title} className="bg-white rounded-xl p-8 shadow-sm text-center">
                  <div className="text-5xl mb-4">{item.icon}</div>
                  <h3 className="text-xl font-semibold mb-2 text-brand">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <CutAdvisor />

        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-3xl font-black uppercase tracking-wide mb-4 text-brand" style={{ fontFamily: 'var(--font-heading)' }}>
              {cta.headline}
            </h2>
            <p className="text-gray-600 mb-2 text-lg">{cta.subtext}</p>
            <p className="text-gray-500 text-sm mb-8">{cta.note}</p>
            <Link href="/shop" className="bg-brand hover:bg-brand-mid text-white font-bold px-10 py-4 rounded-lg transition-colors text-lg inline-block uppercase tracking-wide">
              {cta.buttonText}
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
