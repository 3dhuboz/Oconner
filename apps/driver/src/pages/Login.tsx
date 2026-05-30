import { SignIn } from '@clerk/clerk-react';
import { Truck } from 'lucide-react';
import { useState } from 'react';
import { rescueApi, saveRescuePin } from '../lib/rescue';

const socialLoginHidden = {
  elements: {
    socialButtonsBlockButton: 'hidden',
    dividerRow: 'hidden',
  },
};

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [rescueLoading, setRescueLoading] = useState(false);
  const [rescueError, setRescueError] = useState('');
  const [showNormalSignIn, setShowNormalSignIn] = useState(false);

  const submitRescue = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pin.trim();
    if (!cleaned) return;
    setRescueLoading(true);
    setRescueError('');
    try {
      await rescueApi.today(cleaned);
      saveRescuePin(cleaned);
      window.location.href = '/';
    } catch {
      setRescueError('That driver PIN did not work. Check it and try again.');
    } finally {
      setRescueLoading(false);
    }
  };

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
        <form onSubmit={submitRescue} className="mt-4 w-full max-w-sm bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4">
          <p className="text-white font-bold text-sm">Emergency driver access</p>
          <p className="text-white/65 text-xs mt-1">Use this if Google login is down while deliveries are underway.</p>
          <div className="flex gap-2 mt-3">
            <input
              value={pin}
              onChange={(e) => { setPin(e.target.value); setRescueError(''); }}
              inputMode="numeric"
              placeholder="Driver PIN"
              className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white text-gray-900 px-3 py-2 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={rescueLoading || !pin.trim()}
              className="bg-white text-brand font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {rescueLoading ? 'Checking...' : 'Open'}
            </button>
          </div>
          {rescueError && <p className="text-red-200 text-xs mt-2">{rescueError}</p>}
        </form>
        <div className="mt-4 w-full max-w-sm text-center text-white/75">
          <button
            type="button"
            onClick={() => setShowNormalSignIn((value) => !value)}
            className="text-xs font-semibold underline decoration-white/30 underline-offset-4"
          >
            Normal sign-in
          </button>
          {showNormalSignIn && (
            <div className="mt-3 flex justify-center">
              <SignIn routing="virtual" forceRedirectUrl="/" appearance={socialLoginHidden} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
