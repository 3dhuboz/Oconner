import React, { useState } from 'react';
import { Zap, CheckCircle2, Shield, Users, CreditCard, ArrowRight, Loader2, ExternalLink, Headphones } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tenantsApi, licensesApi, userProfilesApi } from '../services/api';
import { SignUp } from '@clerk/react';
import toast from 'react-hot-toast';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    description: 'Perfect for small electrical businesses',
    features: [
      '1 Admin License (included)',
      '1 Technician License (included)',
      'Job Board & Scheduling',
      'Form 9 Generation',
      'Mobile Tech Portal',
      'Email Support',
    ],
    maxTech: 3,
    recommended: false,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 99,
    description: 'For growing teams that need more power',
    features: [
      '1 Admin License (included)',
      '1 Technician License (included)',
      'Up to 10 Technician Licenses',
      'Xero Integration',
      'SMS Dispatch',
      'Priority Support',
    ],
    maxTech: 10,
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 249,
    description: 'Unlimited scale for large operations',
    features: [
      '1 Admin License (included)',
      '1 Technician License (included)',
      'Unlimited Technician Licenses',
      'All Integrations',
      'Custom API Access',
      'Dedicated Account Manager',
    ],
    maxTech: 999,
    recommended: false,
  },
];

const EXTRA_TECH_PRICE = 29;

export function Purchase() {
  const [selectedPlan, setSelectedPlan] = useState('professional');
  const [extraTechs, setExtraTechs] = useState(0);
  const [step, setStep] = useState<'plan' | 'signup'>('plan');
  const { user } = useAuth();
  const navigate = useNavigate();

  const plan = PLANS.find(p => p.id === selectedPlan)!;
  const totalMonthly = plan.price + (extraTechs * EXTRA_TECH_PRICE);

  // If already logged in, redirect
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

      <div className="max-w-6xl mx-auto py-12 px-4">
        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {['Choose Plan', 'Create Account'].map((label, i) => {
            const stepMap = ['plan', 'signup'];
            const isActive = stepMap.indexOf(step) >= i;
            return (
              <React.Fragment key={label}>
                {i > 0 && <div className={`w-12 h-0.5 ${isActive ? 'bg-[#F5A623]' : 'bg-slate-200'}`} />}
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isActive ? 'bg-[#F5A623] text-slate-900' : 'bg-slate-200 text-slate-500'}`}>
                    {i + 1}
                  </div>
                  <span className={`text-sm font-medium ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* STEP 1: Choose Plan */}
        {step === 'plan' && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-900">Choose Your Plan</h1>
              <p className="text-slate-500 mt-2">Every plan includes 1 Admin + 1 Technician license. Add more technicians as needed.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PLANS.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`relative p-6 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedPlan === p.id
                      ? 'border-[#F5A623] bg-amber-50 shadow-lg'
                      : 'border-slate-200 bg-white hover:border-amber-200'
                  }`}
                >
                  {p.recommended && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#F5A623] text-slate-900 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-slate-900">{p.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{p.description}</p>
                  <div className="text-3xl font-bold text-slate-900 mt-4">
                    ${p.price}<span className="text-sm font-normal text-slate-500">/mo</span>
                  </div>
                  <ul className="mt-4 space-y-2">
                    {p.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Extra Tech Licenses */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 max-w-lg mx-auto">
              <h3 className="font-bold text-slate-900 mb-2">Extra Technician Licenses</h3>
              <p className="text-sm text-slate-500 mb-4">1 tech license is included free. Additional licenses are ${EXTRA_TECH_PRICE}/mo each.</p>
              <div className="flex items-center gap-4">
                <button onClick={() => setExtraTechs(Math.max(0, extraTechs - 1))} className="w-10 h-10 border border-slate-200 rounded-lg flex items-center justify-center text-lg font-bold hover:bg-slate-50">-</button>
                <span className="text-2xl font-bold text-slate-900 w-12 text-center">{extraTechs}</span>
                <button onClick={() => setExtraTechs(extraTechs + 1)} className="w-10 h-10 border border-slate-200 rounded-lg flex items-center justify-center text-lg font-bold hover:bg-slate-50">+</button>
                <span className="text-sm text-slate-500 ml-4">
                  {extraTechs > 0 ? `+$${extraTechs * EXTRA_TECH_PRICE}/mo` : 'None added'}
                </span>
              </div>
            </div>

            {/* Total & Continue */}
            <div className="text-center space-y-4">
              <div className="text-2xl font-bold text-slate-900">
                Total: ${totalMonthly}<span className="text-sm font-normal text-slate-500">/month</span>
              </div>
              <button
                onClick={() => setStep('signup')}
                className="inline-flex items-center gap-2 px-8 py-3 bg-[#F5A623] text-slate-900 rounded-xl font-bold text-lg hover:bg-[#F5A623] transition-colors"
              >
                Continue <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Clerk Sign Up */}
        {step === 'signup' && (
          <div className="max-w-xl mx-auto space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-900">Create Your Account</h1>
              <p className="text-slate-500 mt-2">
                {plan.name} Plan &mdash; ${totalMonthly}/mo ({1 + extraTechs} tech license{1 + extraTechs > 1 ? 's' : ''})
              </p>
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
              routing="virtual"
              signInUrl="/login"
              forceRedirectUrl="/"
            />

            <div className="flex items-center justify-between">
              <button onClick={() => setStep('plan')} className="text-sm text-slate-500 hover:text-slate-700">&larr; Back to plans</button>
            </div>
          </div>
        )}
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
