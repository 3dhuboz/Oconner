import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'About Us',
  description: "Meet the O'Connor family — first generation farmers from the Boyne Valley, QLD, raising grass fed beef that's good for the land, the community, and you.",
};

export const runtime = 'edge';

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="relative bg-brand text-white overflow-hidden">
          <div className="absolute inset-0 opacity-30">
            <img src="/hero-cows.jpg" alt="O'Connor cattle" className="w-full h-full object-cover" />
          </div>
          <div className="relative max-w-4xl mx-auto px-4 py-24 text-center">
            <p className="text-brand-light text-sm font-semibold uppercase tracking-widest mb-3">
              Locally Raised · Grass Fed · Naturally Healthy
            </p>
            <h1 className="text-5xl font-black mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
              About O'Connor Agriculture
            </h1>
            <p className="text-brand-light text-lg max-w-2xl mx-auto leading-relaxed">
              First generation family farmers from Calliope and the Boyne Valley, QLD —
              raising grass fed beef the right way, delivering it straight to your door.
            </p>
          </div>
        </section>

        {/* ── Our Story ── */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-brand text-sm font-semibold uppercase tracking-widest mb-3">Our Story</p>
              <h2 className="text-3xl font-black text-gray-900 mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
                Good for the land. Good for the community. Good for you.
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  We're a first generation farming family from the Boyne Valley, Queensland. Like many farmers,
                  we started with a simple idea: raise cattle the right way — on grass, on open land, without shortcuts.
                </p>
                <p>
                  What began as a passion for regenerative agriculture grew into something we're incredibly proud of.
                  Our cattle roam freely across the Calliope region, grazing on natural pastures the way nature intended.
                  No feedlots. No unnecessary additives. Just honest, hard work and healthy animals.
                </p>
                <p>
                  We cut out the middleman so you get farm-fresh, grass fed beef at a fair price — delivered straight
                  to your door in temperature-controlled comfort.
                </p>
              </div>
            </div>
            <div className="relative">
              <img
                src="/about-family.jpg"
                alt="The O'Connor family"
                className="w-full rounded-2xl object-cover aspect-[3/4] shadow-xl"
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  el.style.display = 'none';
                  (el.nextSibling as HTMLElement)?.style?.setProperty('display', 'flex');
                }}
              />
              <div
                className="hidden w-full rounded-2xl aspect-[3/4] bg-brand/10 items-center justify-center text-brand/40 text-sm"
                style={{ display: 'none' }}
              >
                Family photo
              </div>
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
            <div className="order-2 md:order-1">
              <img
                src="/about-cattle.jpg"
                alt="O'Connor grass fed cattle"
                className="w-full rounded-2xl object-cover shadow-xl"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/hero-cows.jpg'; }}
              />
            </div>
            <div className="order-1 md:order-2">
              <p className="text-brand text-sm font-semibold uppercase tracking-widest mb-3">Our Cattle</p>
              <h2 className="text-3xl font-black text-gray-900 mb-5" style={{ fontFamily: 'var(--font-heading)' }}>
                Raised on grass. Born on country.
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Our cattle are raised entirely on natural pasture in the Boyne Valley region — some of the most
                  fertile and beautiful grazing country in Queensland.
                </p>
                <p>
                  We use regenerative grazing management to look after the land while producing premium quality beef.
                  Healthy soil grows healthy grass, which grows healthy cattle — and that shows in the flavour.
                </p>
                <p>
                  Our grass fed cattle typically dress between 215–225 kg, giving you a generous amount of quality
                  meat whether you're ordering a quarter share, half share, or individual cuts.
                </p>
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
                Faces behind your delivery
              </h2>
              <p className="text-gray-500 mt-3 max-w-xl mx-auto">
                From paddock to your front door — our small, dedicated team handles every step
                with the care and pride of true family farmers.
              </p>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="/about-team.jpg"
                alt="O'Connor Agriculture team"
                className="w-full object-cover max-h-96"
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  el.style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand/80 to-transparent flex items-end p-8">
                <div className="text-white">
                  <p className="font-black text-xl">O'Connor Agriculture</p>
                  <p className="text-brand-light text-sm mt-1">Fresh From the Farm · To Your Door</p>
                </div>
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
                Expertly butchered, carefully packed
              </h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  Every animal is processed at a local, licensed abattoir and butchered by experienced tradespeople
                  who take pride in every cut. Quality is non-negotiable.
                </p>
                <p>
                  Bulk orders (quarter and half shares) are carefully packed in freezer bags and boxed, ready for your
                  freezer. Individual cuts and sausages are vacuum-sealed for maximum freshness and freezer life.
                </p>
                <p>
                  Delivered in a refrigerated vehicle straight to your door — so your beef arrives in perfect condition,
                  every time.
                </p>
              </div>
              <div className="flex gap-3 mt-8">
                <Link
                  href="/shop"
                  className="bg-brand text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-brand-mid transition-colors"
                >
                  Shop Now
                </Link>
                <Link
                  href="/contact"
                  className="border border-brand text-brand px-6 py-3 rounded-xl font-semibold text-sm hover:bg-brand/5 transition-colors"
                >
                  Get in Touch
                </Link>
              </div>
            </div>
            <div>
              <img
                src="/about-butcher.jpg"
                alt="Our butcher at work"
                className="w-full rounded-2xl object-cover shadow-xl aspect-square"
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  el.style.display = 'none';
                }}
              />
            </div>
          </div>
        </section>

        {/* ── Values ── */}
        <section className="py-20 px-4 bg-brand text-white">
          <div className="max-w-4xl mx-auto text-center">
            <p className="italic text-brand-light text-xl mb-4">
              "Good for the land. Good for the community. Good for you."
            </p>
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              {[
                { icon: '🌿', title: 'Regenerative Farming', body: 'We focus on soil health and animal welfare. Healthy land grows healthy cattle, and healthy cattle produces better beef.' },
                { icon: '🤝', title: 'Community First', body: 'Supporting local jobs, local land, and local families. When you buy from us, you\'re investing in the Boyne Valley community.' },
                { icon: '🚚', title: 'Farm to Door', body: 'No supermarket markups. No middlemen. Just farm-fresh beef delivered directly to your home at honest prices.' },
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
