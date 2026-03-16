import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="bg-brand text-white py-20 px-4 relative overflow-hidden">
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <p className="text-brand-light text-sm font-semibold tracking-[0.2em] uppercase mb-4">
              Locally Raised &bull; Grass Fed &bull; Naturally Healthy
            </p>
            <h1 className="text-5xl md:text-7xl font-black tracking-wide uppercase mb-4 leading-none" style={{fontFamily:'var(--font-heading)'}}>
              Local Grass Fed Beef.<br />Delivered to Your Door.
            </h1>
            <p className="text-lg text-brand-light mb-2 max-w-2xl mx-auto">
              First generation family farm from the Boyne Valley, QLD. We use regenerative management practices
              to produce quality beef that's good for the land and good for you.
            </p>
            <p className="text-brand-light/70 text-sm italic mb-8">
              "Good for the land. Good for the community. Good for you."
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/shop"
                className="bg-accent hover:bg-red-700 text-white font-bold px-8 py-4 rounded-lg transition-colors text-lg uppercase tracking-wide"
              >
                Order Now
              </Link>
              <Link
                href="/delivery-days"
                className="bg-white/10 hover:bg-white/20 text-white font-bold px-8 py-4 rounded-lg transition-colors text-lg border border-white/30 uppercase tracking-wide"
              >
                Delivery Schedule
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-black uppercase tracking-wide text-center mb-12 text-brand" style={{fontFamily:'var(--font-heading)'}}>Why O'Connor?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: '🌿', title: 'Regenerative Farming', desc: 'We focus on soil health and animal welfare, producing beef you can feel good about eating.' },
                { icon: '🚚', title: 'Free Delivery', desc: 'Temperature-controlled delivery straight to your door. All prices include delivery.' },
                { icon: '�‍👩‍👧', title: 'Family Owned', desc: 'First generation family farm from Calliope and the Boyne Valley, QLD.' },
              ].map((item) => (
                <div key={item.title} className="bg-white rounded-xl p-8 shadow-sm text-center">
                  <div className="text-5xl mb-4">{item.icon}</div>
                  <h3 className="text-xl font-semibold mb-2 text-brand">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <h2 className="text-3xl font-black uppercase tracking-wide mb-4 text-brand" style={{fontFamily:'var(--font-heading)'}}>Ready to Order?</h2>
            <p className="text-gray-600 mb-2 text-lg">Browse our beef boxes — BBQ Box, Family Box, Double, and Value Box.</p>
            <p className="text-gray-500 text-sm mb-8">All prices include free delivery to your door.</p>
            <Link
              href="/shop"
              className="bg-brand hover:bg-brand-mid text-white font-bold px-10 py-4 rounded-lg transition-colors text-lg inline-block uppercase tracking-wide"
            >
              View Beef Boxes
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
