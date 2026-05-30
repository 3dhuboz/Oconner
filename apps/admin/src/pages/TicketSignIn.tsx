import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSignIn } from '@clerk/clerk-react';

export default function TicketSignInPage() {
  const navigate = useNavigate();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [message, setMessage] = useState('Signing you in...');

  useEffect(() => {
    if (!isLoaded || !signIn) return;
    const tokenParam = new URLSearchParams(window.location.search).get('token');
    if (!tokenParam) {
      setMessage('This sign-in link is missing its token.');
      return;
    }
    if (!setActive) {
      setMessage('Sign-in is still loading. Please refresh this link.');
      return;
    }
    const token = tokenParam;
    const activateSession = setActive;

    let cancelled = false;
    async function run() {
      try {
        const result = await signIn!.create({ strategy: 'ticket', ticket: token });
        if (cancelled) return;
        if (result.status === 'complete' && result.createdSessionId) {
          await activateSession({ session: result.createdSessionId });
          navigate('/dashboard', { replace: true });
          return;
        }
        setMessage('This sign-in link could not be completed. Please request a fresh link.');
      } catch {
        if (!cancelled) setMessage('This sign-in link has expired or has already been used.');
      }
    }
    run();
    return () => { cancelled = true; };
  }, [isLoaded, navigate, setActive, signIn]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
        <p className="text-sm font-semibold text-gray-900">{message}</p>
      </div>
    </div>
  );
}
