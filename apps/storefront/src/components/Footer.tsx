import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-brand text-white py-10 px-4 mt-auto">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-white rounded px-1.5 py-0.5">
              <span className="text-brand font-black text-xs tracking-widest">OC.</span>
            </span>
            <h3 className="font-black text-lg tracking-wider uppercase">O'Connor Agriculture</h3>
          </div>
          <p className="text-brand-light text-sm">Locally raised, grass fed, naturally healthy beef from the Boyne Valley, QLD.</p>
          <p className="text-brand-light/70 text-xs mt-2 italic">"Good for the land. Good for the community. Good for you."</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Quick Links</h4>
          <ul className="space-y-2 text-brand-light">
            <li><Link href="/shop" className="hover:text-white transition-colors">Shop</Link></li>
            <li><Link href="/delivery-days" className="hover:text-white transition-colors">Delivery Days</Link></li>
            <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
            <li><Link href="/account" className="hover:text-white transition-colors">My Account</Link></li>
            <li><Link href="/cart" className="hover:text-white transition-colors">Cart</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Contact</h4>
          <ul className="space-y-2 text-brand-light">
            <li><a href="mailto:orders@oconnoragriculture.com.au" className="hover:text-white transition-colors">📧 orders@oconnoragriculture.com.au</a></li>
            <li><a href="https://www.facebook.com/profile.php?id=61574996320860" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">👍 Facebook — @OConnorAgriculture</a></li>
            <li>📍 Calliope &amp; Boyne Valley, QLD</li>
            <li><Link href="/contact" className="hover:text-white transition-colors">✉️ Send us a message</Link></li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-brand-light">
        <p>© {new Date().getFullYear()} O'Connor Agriculture. All rights reserved.</p>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
