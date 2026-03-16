import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <section className="bg-brand text-white py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Premium Meat.<br />Delivered Fresh.
            </h1>
            <p className="text-xl text-brand-light mb-8">
              Quality butcher cuts delivered straight to your door across Western Australia.
              No preservatives. No compromises.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/shop"
                className="bg-accent hover:bg-red-700 text-white font-semibold px-8 py-4 rounded-lg transition-colors text-lg"
              >
                Shop Now
              </Link>
              <Link
                href="/delivery-days"
                className="bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-lg transition-colors text-lg border border-white/30"
              >
                View Delivery Days
              </Link>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-gray-50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12 text-brand">Why Choose Us?</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: '🥩', title: 'Premium Cuts', desc: 'Hand-selected by our master butchers for quality and freshness.' },
                { icon: '🚚', title: 'Fresh Delivery', desc: 'Temperature-controlled delivery straight to your door.' },
                { icon: '📅', title: 'Scheduled Drops', desc: 'Choose your delivery day and we\'ll take care of the rest.' },
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
            <h2 className="text-3xl font-bold mb-4 text-brand">Ready to Order?</h2>
            <p className="text-gray-600 mb-8 text-lg">Browse our full range of premium cuts and seasonal specials.</p>
            <Link
              href="/shop"
              className="bg-brand hover:bg-brand-mid text-white font-semibold px-10 py-4 rounded-lg transition-colors text-lg inline-block"
            >
              Browse Products
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
