import { SignIn } from '@clerk/clerk-react';
import { Truck } from 'lucide-react';

export default function LoginPage() {
  return (
    <div
      className="min-h-full flex flex-col items-center justify-center px-6 relative"
      style={{
        backgroundImage: 'url(https://butcher-storefront.pages.dev/hero-cows.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/65" />
      <div className="relative z-10 w-full flex flex-col items-center">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white/15 backdrop-blur-sm border border-white/20 rounded-2xl flex items-center justify-center mb-4">
            <Truck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Driver Login</h1>
          <p className="text-white/50 text-sm mt-1">O&apos;Connor Agriculture</p>
        </div>
        <SignIn routing="hash" forceRedirectUrl="/" />
      </div>
    </div>
  );
}
