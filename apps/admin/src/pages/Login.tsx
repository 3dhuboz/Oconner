import { SignIn } from '@clerk/clerk-react';
import { API_URL, saveStaffRescuePin } from '@butcher/shared';
import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';

const socialLoginHidden = {
  elements: {
    socialButtonsBlockButton: 'hidden',
    dividerRow: 'hidden',
  },
};

type StaffSessionResponse = {
  ok: boolean;
  user?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
  error?: string;
};

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState('');
  const [showNormalSignIn, setShowNormalSignIn] = useState(false);

  const submitStaffPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pin.trim();
    if (!cleaned) return;
    setPinLoading(true);
    setPinError('');
    try {
      const res = await fetch(`${API_URL}/api/admin-rescue/session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Staff-Rescue-Pin': cleaned,
        },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({ ok: false, error: res.statusText })) as StaffSessionResponse;
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'That staff PIN did not work.');
      saveStaffRescuePin(cleaned);
      window.location.href = '/dashboard';
    } catch (err) {
      setPinError(err instanceof Error ? err.message : 'That staff PIN did not work.');
    } finally {
      setPinLoading(false);
    }
  };

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
        <form onSubmit={submitStaffPin} className="w-full max-w-sm bg-white/95 border border-white/30 rounded-2xl p-5 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-11 w-11 rounded-xl bg-brand-light flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-brand" />
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-950">Staff access</h1>
              <p className="text-xs text-gray-500">O&apos;Connor Agriculture admin</p>
            </div>
          </div>
          <label htmlFor="staff-pin" className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Staff PIN
          </label>
          <div className="flex gap-2 mt-1.5">
            <input
              id="staff-pin"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setPinError(''); }}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter PIN"
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-950 outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={pinLoading || !pin.trim()}
              className="bg-brand text-white font-bold text-sm px-4 py-2 rounded-lg disabled:opacity-50"
            >
              {pinLoading ? 'Checking...' : 'Open'}
            </button>
          </div>
          {pinError && <p className="text-red-600 text-xs mt-2">{pinError}</p>}
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
            <SignIn routing="virtual" forceRedirectUrl="/dashboard" appearance={socialLoginHidden} />
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
