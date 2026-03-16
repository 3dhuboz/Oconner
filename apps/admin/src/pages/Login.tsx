import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.message ?? 'Login failed. Check credentials and try again.');
    } finally {
      setLoading(false);
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
      {/* dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand header above card */}
        <div className="text-center mb-6">
          <p className="text-white/50 text-xs tracking-[0.25em] uppercase font-medium">
            O&apos;Connor Agriculture
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8">
          <h1 className="text-2xl font-bold text-brand mb-1">Admin Login</h1>
          <p className="text-gray-500 text-sm mb-6">The Butcher Online Command Centre</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email" required placeholder="Admin Email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <input
              type="password" required placeholder="Password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            {error && <p className="text-red-600 text-sm break-words">{error}</p>}
            <button
              type="submit" disabled={loading}
              className="w-full bg-brand text-white py-2.5 rounded-lg font-medium hover:bg-brand-mid transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
