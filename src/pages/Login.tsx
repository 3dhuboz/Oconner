import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Redirect automatically when user state is populated
  useEffect(() => {
    if (user) {
      if (user.role === 'dev') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      toast.success('Logged in successfully!');
    } catch (err: any) {
      if (err.message === 'Firebase not initialized') {
        setError('System configuration error: Firebase is not connected. Please contact support.');
      } else {
        setError(err.message || 'Failed to login. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-br from-[#F5A623] to-[#E8862A] p-6 text-center">
          <img src="/logo.png" alt="Wirez R Us" className="w-20 h-20 object-contain mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Wirez R Us</h1>
          <p className="text-[#1a1a2e]/70 font-medium">Electrical &amp; Smoke Alarms</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F5A623] focus:border-[#F5A623] transition-all"
                  placeholder="user@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F5A623] focus:border-[#F5A623] transition-all"
                  placeholder="••••••••"
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-2 text-sm text-rose-600">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-[#1a1a2e] hover:bg-[#2a2a42] text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Signing In...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" /> Secure Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">
                  New to Wirez R Us?
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/purchase')}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-[#F5A623]/40 bg-[#F5A623]/10 rounded-xl text-[#E8862A] font-bold hover:bg-[#F5A623]/20 transition-colors"
            >
              Purchase a License &amp; Get Started
            </button>
          </div>

          <div className="mt-6 text-center space-y-2">
            <a
              href="https://www.facebook.com/pennywiseitoz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-[#F5A623] transition-colors"
            >
              Need help? Contact Penny Wise I.T
            </a>
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} Wirez R Us Field Management.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
