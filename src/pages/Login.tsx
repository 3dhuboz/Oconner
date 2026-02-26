import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Mail, Lock, Loader2, AlertCircle, ShieldCheck, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const { login, register, user } = useAuth();
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
      if (isRegistering) {
        await register(email, password);
        toast.success('Account created successfully!');
      } else {
        await login(email, password);
        toast.success('Logged in successfully!');
      }
      // Navigation is now handled by the useEffect above
    } catch (err: any) {
      if (err.message === 'Firebase not initialized') {
        setError('System configuration error: Firebase is not connected. Please contact support.');
      } else {
        setError(err.message || `Failed to ${isRegistering ? 'create account' : 'login'}. Please check your credentials.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-amber-500 p-6 text-center">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Zap className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Wirez R Us</h1>
          <p className="text-slate-900/80 font-medium">Field Management System</p>
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
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
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
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
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
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {isRegistering ? 'Creating Account...' : 'Signing In...'}
                </>
              ) : (
                <>
                  {isRegistering ? <UserPlus className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />} 
                  {isRegistering ? 'Create Account' : 'Secure Sign In'}
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
                  {isRegistering ? 'Already have an account?' : 'New to Wirez R Us?'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-slate-200 rounded-xl text-slate-700 font-bold hover:bg-slate-50 transition-colors"
            >
              {isRegistering ? 'Sign In Instead' : 'Create an Account to Test'}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              &copy; 2024 Wirez R Us Field Management.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
