import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-brand text-white py-10 px-4 mt-auto">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 text-sm">
        <div>
          <h3 className="font-bold text-lg mb-3">The Butcher Online</h3>
          <p className="text-brand-light">Premium quality meat delivered fresh across Western Australia.</p>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Quick Links</h4>
          <ul className="space-y-2 text-brand-light">
            <li><Link href="/shop" className="hover:text-white transition-colors">Shop</Link></li>
            <li><Link href="/delivery-days" className="hover:text-white transition-colors">Delivery Days</Link></li>
            <li><Link href="/account" className="hover:text-white transition-colors">My Account</Link></li>
            <li><Link href="/cart" className="hover:text-white transition-colors">Cart</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold mb-3">Contact</h4>
          <ul className="space-y-2 text-brand-light">
            <li>📧 orders@thebutcheronline.com.au</li>
            <li>📞 (08) 0000 0000</li>
            <li>📍 Perth, Western Australia</li>
          </ul>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-8 pt-6 border-t border-white/20 text-center text-xs text-brand-light">
        © {new Date().getFullYear()} The Butcher Online. All rights reserved. ABN 00 000 000 000
      </div>
    </footer>
  );
}
