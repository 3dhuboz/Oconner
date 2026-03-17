import { SignIn } from '@clerk/clerk-react';

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative"
      style={{
        backgroundImage: 'url(https://butcher-storefront.pages.dev/hero-cows.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 w-full flex flex-col items-center">
        <p className="text-white/50 text-xs tracking-[0.25em] uppercase font-medium mb-6">
          O&apos;Connor Agriculture
        </p>
        <SignIn routing="hash" forceRedirectUrl="/dashboard" />
      </div>
    </div>
  );
}
