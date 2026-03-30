import React from 'react';
import { Shield, ExternalLink, Headphones } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SignUp } from '@clerk/react';

export function Purchase() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <Shield className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Already Logged In</h2>
          <p className="text-slate-500 mb-6">You're already signed in as {user.email}</p>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-slate-900 text-white py-6 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-icon.png" alt="Wirez R Us" className="w-10 h-10 object-contain" />
            <span className="text-xl font-bold tracking-tight">Wirez R Us</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://www.facebook.com/pennywiseitoz" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors">
              <Headphones className="w-4 h-4" /> Support by Penny Wise I.T
              <ExternalLink className="w-3 h-3" />
            </a>
            <button onClick={() => navigate('/login')} className="text-sm text-slate-300 hover:text-white">
              Existing Customer? Sign In
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Create Your Account</h1>
          <p className="text-slate-500 mt-2">Wirez R Us Field Management System</p>
        </div>

        <SignUp
          appearance={{
            elements: {
              rootBox: 'w-full mx-auto',
              card: 'bg-white border border-slate-200 shadow-lg',
              headerTitle: 'text-slate-900',
              headerSubtitle: 'text-slate-500',
              formFieldLabel: 'text-slate-700',
              formFieldInput: 'border-slate-200 focus:ring-[#F5A623] focus:border-[#F5A623]',
              formButtonPrimary: 'bg-[#F5A623] hover:bg-[#E8862A] text-slate-900 font-bold',
              footerActionLink: 'text-[#E8862A] hover:text-[#F5A623]',
            },
          }}
          routing="path"
          path="/purchase"
          signInUrl="/login"
          forceRedirectUrl="/"
        />
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 mt-16">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo-icon.png" alt="Wirez R Us" className="w-8 h-8 object-contain" />
            <span className="font-bold text-white">Wirez R Us</span>
            <span className="text-sm">Field Management System</span>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <a href="https://www.facebook.com/pennywiseitoz" target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center gap-1">
              <Headphones className="w-3.5 h-3.5" /> Support by Penny Wise I.T
            </a>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
