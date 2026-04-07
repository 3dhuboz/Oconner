import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { api } from '@butcher/shared';

export const metadata: Metadata = {
  title: 'About Us',
  description: "Meet the O'Connor family — first generation farmers from the Boyne Valley, QLD, raising grass fed beef that's good for the land, the community, and you.",
};

export const runtime = 'edge';

const DEFAULTS = {
  heroTagline: 'Locally Raised · Grass Fed · Naturally Healthy',
  heroTitle: "About O'Connor Agriculture",
  heroBody: "First generation family farmers from Calliope and the Boyne Valley, QLD — raising grass fed beef the right way, delivering it straight to your door.",
  heroImage: '/649363139_122169276728833210_2969468506503855850_n.jpg',
  storyTitle: 'Good for the land. Good for the community. Good for you.',
  storyP1: "We're a first generation farming family from the Boyne Valley, Queensland. Like many farmers, we started with a simple idea: raise cattle the right way — on grass, on open land, without shortcuts.",
  storyP2: 'What began as a passion for regenerative agriculture grew into something we\'re incredibly proud of. Our cattle roam freely across the Calliope region, grazing on natural pastures the way nature intended. No feedlots. No unnecessary additives. Just honest, hard work and healthy animals.',
  storyP3: 'We cut out the middleman so you get farm-fresh, grass fed beef at a fair price — delivered straight to your door in temperature-controlled comfort.',
  storyImage: '/649363139_122169276728833210_2969468506503855850_n.jpg',
  cattleTitle: 'Raised on grass. Born on country.',
  cattleBody: "Our cattle are raised entirely on natural pasture in the Boyne Valley region — some of the most fertile and beautiful grazing country in Queensland.\n\nWe use regenerative grazing management to look after the land while producing premium quality beef. Healthy soil grows healthy grass, which grows healthy cattle — and that shows in the flavour.\n\nOur grass fed cattle typically dress between 215–225 kg, giving you a generous amount of quality meat whether you're ordering a quarter share, half share, or individual cuts.",
  cattleImage1: '/648756608_122169276602833210_2007100768441221733_n.jpg',
  cattleImage2: '/605527026_122159273378833210_2192412403070503185_n.jpg',
  teamTitle: 'Faces behind your delivery',
  teamBody: 'From paddock to your front door — our small, dedicated team handles every step with the care and pride of true family farmers.',
  teamImage1: '/649233392_122169276668833210_2761320253198269250_n.jpg',
  teamImage2: '/627050601_122164946600833210_6379541527443613506_n.jpg',
  teamImage3: '/637918980_122167024448833210_227926334031877108_n.jpg',
  processTitle: 'Expertly butchered, carefully packed',
  processBody: "Every animal is processed at a local, licensed abattoir and butchered by experienced tradespeople who take pride in every cut. Quality is non-negotiable.\n\nBulk orders (quarter and half shares) are carefully packed in freezer bags and boxed, ready for your freezer. Individual cuts and sausages are vacuum-sealed for maximum freshness and freezer life.\n\nDelivered in a refrigerated vehicle straight to your door — so your beef arrives in perfect condition, every time.",
  processImage: '/633837159_122166552518833210_2828990505487028501_n.jpg',
  value1: 'Regenerative Farming',
  value1Body: 'We focus on soil health and animal welfare. Healthy land grows healthy cattle, and healthy cattle produces better beef.',
  value2: 'Community First',
  value2Body: "Supporting local jobs, local land, and local families. When you buy from us, you're investing in the Boyne Valley community.",
  value3: 'Farm to Door',
  value3Body: 'No supermarket markups. No middlemen. Just farm-fresh beef delivered directly to your home at honest prices.',
};

async function getAboutConfig() {
  try {
    const raw = await api.config.get('about') as any;
    const data = raw?.value ?? raw;
    return { ...DEFAULTS, ...(data ?? {}) };
  } catch {
    return DEFAULTS;
  }
}

export default async function AboutPage() {
  const a = await getAboutConfig();

  return (
    <>
      <Navbar />
      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="relative bg-brand text-white overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <img src={a.heroImage} alt="O'Connor family" className="w-full h-full object-cover" />
          </div>
          <div className="relative max-w-4xl mx-auto px-4 py-24 text-center">
            <p className="text-brand-light text-sm font-semibold uppercase tracking-widest mb-3">
              {a.heroTagline}
            </p>
            <h1 className="text-5xl font-black mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
              {a.heroTitle}
            </h1>
            <p className="text-brand-light text-lg max-w-2xl mx-auto leading-relaxed">
              {a.heroBody}
            </p>
          </div>
        </section>

        {/* ── Our Story ── */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-brand text-sm font-semibold uppercase tracking-widest mb-3">Our Story</p>
              <h2 className="text-3xl font-black text-gray-900 mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
                {a.storyTitle}
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>{a.storyP1}</p>
                <p>{a.storyP2}</p>
                <p>{a.storyP3}</p>
              </div>
            </div>
            <div className="relative">
              <img src={a.storyImage} alt="The O'Connor family" className="w-full rounded-2xl object-cover aspect-[3/4] shadow-xl" />
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg px-5 py-3">
                <p className="text-xs text-gray-500">Est.</p>
                <p className="text-2xl font-black text-brand">2020</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── The Cattle ── */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 grid grid-cols-1 gap-4">
              <img src={a.cattleImage1} alt="O'Connor grass fed cattle" className="w-full rounded-2xl object-cover shadow-xl" />
              <img src={a.cattleImage2} alt="Cattle grazing" className="w-full rounded-2xl object-cover shadow-xl max-h-48" />
            </div>
            <div className="order-1 md:order-2">
              <p className="text-brand text-sm font-semibold uppercase tracking-widest mb-3">Our Cattle</p>
              <h2 className="text-3xl font-black text-gray-900 mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
                {a.cattleTitle}
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                {a.cattleBody.split('\n\n').map((p: string, i: number) => <p key={i}>{p}</p>)}
              </div>
              <div className="grid grid-cols-3 gap-4 mt-8">
                {[
                  { label: '100%', sub: 'Grass Fed' },
                  { label: 'Free', sub: 'Delivery' },
                  { label: 'QLD', sub: 'Grown' },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl p-4 text-center shadow-sm border">
                    <p className="text-2xl font-black text-brand">{s.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── The Team ── */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-brand text-sm font-semibold uppercase tracking-widest mb-3">The Team</p>
              <h2 className="text-3xl font-black text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>
                {a.teamTitle}
              </h2>
              <p className="text-gray-500 mt-3 max-w-xl mx-auto">{a.teamBody}</p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl md:col-span-2">
                <img src={a.teamImage1} alt="O'Connor Agriculture team" className="w-full object-cover max-h-96" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand/80 to-transparent flex items-end p-8">
                  <div className="text-white">
                    <p className="font-black text-xl">O'Connor Agriculture</p>
                    <p className="text-brand-light text-sm mt-1">Fresh From the Farm · To Your Door</p>
                  </div>
                </div>
              </div>
              <div className="relative rounded-2xl overflow-hidden shadow-lg">
                <img src={a.teamImage2} alt="O'Connor delivery" className="w-full object-cover h-48" />
              </div>
              <div className="relative rounded-2xl overflow-hidden shadow-lg">
                <img src={a.teamImage3} alt="Grass fed beef" className="w-full object-cover h-48" />
              </div>
            </div>
          </div>
        </section>

        {/* ── The Process ── */}
        <section className="py-20 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-brand text-sm font-semibold uppercase tracking-widest mb-3">Our Process</p>
              <h2 className="text-3xl font-black text-gray-900 mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
                {a.processTitle}
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                {a.processBody.split('\n\n').map((p: string, i: number) => <p key={i}>{p}</p>)}
              </div>
              <div className="flex gap-3 mt-8">
                <Link href="/shop" className="bg-brand text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-brand-mid transition-colors">
                  Shop Now
                </Link>
                <Link href="/contact" className="border border-brand text-brand px-6 py-3 rounded-xl font-semibold text-sm hover:bg-brand/5 transition-colors">
                  Get in Touch
                </Link>
              </div>
            </div>
            <div>
              <img src={a.processImage} alt="Our butcher at work" className="w-full rounded-2xl object-cover shadow-xl aspect-square" />
            </div>
          </div>
        </section>

        {/* ── Values ── */}
        <section className="py-20 px-4 bg-brand text-white">
          <div className="max-w-4xl mx-auto text-center">
            <p className="italic text-brand-light text-xl mb-4">
              &ldquo;Good for the land. Good for the community. Good for you.&rdquo;
            </p>
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              {[
                { icon: '🌿', title: a.value1, body: a.value1Body },
                { icon: '🤝', title: a.value2, body: a.value2Body },
                { icon: '🚚', title: a.value3, body: a.value3Body },
              ].map((v) => (
                <div key={v.title} className="bg-white/10 rounded-2xl p-6">
                  <div className="text-4xl mb-4">{v.icon}</div>
                  <h3 className="font-bold text-lg mb-2">{v.title}</h3>
                  <p className="text-brand-light text-sm leading-relaxed">{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
