import React, { useState } from 'react';
import { Zap, CheckCircle2, Shield, Users, CreditCard, ArrowRight, Loader2, ExternalLink, Headphones } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../services/firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
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
  const [step, setStep] = useState<'plan' | 'details' | 'confirm'>('plan');
  const [isProcessing, setIsProcessing] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    password: '',
  });
  const { register, user } = useAuth();
  const navigate = useNavigate();

  const plan = PLANS.find(p => p.id === selectedPlan)!;
  const totalMonthly = plan.price + (extraTechs * EXTRA_TECH_PRICE);

  const handlePurchase = async () => {
    if (!form.companyName || !form.contactEmail || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Create Firebase auth account
      await register(form.contactEmail, form.password);

      // 2. Create tenant in Firestore
      if (db) {
        const tenantRef = await addDoc(collection(db, 'tenants'), {
          companyName: form.companyName,
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          plan: selectedPlan,
          status: 'active',
          adminLicenses: 1,
          techLicenses: 1 + extraTechs,
          maxTechLicenses: plan.maxTech,
          createdAt: new Date().toISOString(),
        });

        // 3. Create included licenses
        await addDoc(collection(db, 'licenses'), {
          tenantId: tenantRef.id,
          type: 'admin',
          status: 'active',
          createdAt: new Date().toISOString(),
          isIncluded: true,
          assignedEmail: form.contactEmail,
        });
        await addDoc(collection(db, 'licenses'), {
          tenantId: tenantRef.id,
          type: 'technician',
          status: 'active',
          createdAt: new Date().toISOString(),
          isIncluded: true,
        });

        // Create extra tech licenses
        for (let i = 0; i < extraTechs; i++) {
          await addDoc(collection(db, 'licenses'), {
            tenantId: tenantRef.id,
            type: 'technician',
            status: 'active',
            createdAt: new Date().toISOString(),
            isIncluded: false,
          });
        }

        // 4. The auth listener in AuthContext will create the userProfile,
        //    but we need to update it with the correct role and tenantId
        // Small delay to let auth state propagate
        setTimeout(async () => {
          try {
            const authUser = (await import('firebase/auth')).getAuth().currentUser;
            if (authUser && db) {
              await setDoc(doc(db, 'userProfiles', authUser.uid), {
                uid: authUser.uid,
                email: form.contactEmail,
                displayName: form.contactName || form.companyName,
                role: 'admin',
                tenantId: tenantRef.id,
                createdAt: new Date().toISOString(),
                isActive: true,
              });
            }
          } catch (e) {
            console.warn('Profile update will happen on next login', e);
          }
        }, 1500);
      }

      toast.success('Account created! Welcome to Wirez R Us!');
      // Navigate to dashboard after a brief delay
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create account');
    } finally {
      setIsProcessing(false);
    }
  };

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
            <img src="/logo.png" alt="Wirez R Us" className="w-10 h-10 object-contain" />
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
          {['Choose Plan', 'Your Details', 'Confirm'].map((label, i) => {
            const stepMap = ['plan', 'details', 'confirm'];
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
                onClick={() => setStep('details')}
                className="inline-flex items-center gap-2 px-8 py-3 bg-[#F5A623] text-slate-900 rounded-xl font-bold text-lg hover:bg-[#F5A623] transition-colors"
              >
                Continue <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Customer Details */}
        {step === 'details' && (
          <div className="max-w-xl mx-auto space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-900">Your Details</h1>
              <p className="text-slate-500 mt-2">This creates your admin account and company profile.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Company Name *</label>
                <input
                  type="text"
                  required
                  value={form.companyName}
                  onChange={e => setForm(p => ({ ...p, companyName: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F5A623] focus:border-[#F5A623]"
                  placeholder="e.g. Spark Electrical"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Your Name</label>
                <input
                  type="text"
                  value={form.contactName}
                  onChange={e => setForm(p => ({ ...p, contactName: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F5A623] focus:border-[#F5A623]"
                  placeholder="e.g. John Smith"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Email Address * (this will be your login)</label>
                <input
                  type="email"
                  required
                  value={form.contactEmail}
                  onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F5A623] focus:border-[#F5A623]"
                  placeholder="you@company.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Phone</label>
                <input
                  type="tel"
                  value={form.contactPhone}
                  onChange={e => setForm(p => ({ ...p, contactPhone: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F5A623] focus:border-[#F5A623]"
                  placeholder="04XX XXX XXX"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700">Create Password * (min 6 characters)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#F5A623] focus:border-[#F5A623]"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep('plan')} className="text-sm text-slate-500 hover:text-slate-700">&larr; Back to plans</button>
              <button
                onClick={() => {
                  if (!form.companyName || !form.contactEmail || !form.password) {
                    toast.error('Please fill in all required fields');
                    return;
                  }
                  setStep('confirm');
                }}
                className="inline-flex items-center gap-2 px-8 py-3 bg-[#F5A623] text-slate-900 rounded-xl font-bold hover:bg-[#F5A623] transition-colors"
              >
                Review Order <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirm */}
        {step === 'confirm' && (
          <div className="max-w-xl mx-auto space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-slate-900">Confirm Your Order</h1>
              <p className="text-slate-500 mt-2">Review your plan and details before activating.</p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <p className="font-bold text-slate-900 text-lg">{plan.name} Plan</p>
                  <p className="text-sm text-slate-500">1 Admin + 1 Tech license included</p>
                </div>
                <p className="font-bold text-slate-900 text-xl">${plan.price}/mo</p>
              </div>

              {extraTechs > 0 && (
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <p className="font-medium text-slate-900">{extraTechs} Extra Technician License{extraTechs > 1 ? 's' : ''}</p>
                    <p className="text-sm text-slate-500">${EXTRA_TECH_PRICE}/mo each</p>
                  </div>
                  <p className="font-bold text-slate-900">${extraTechs * EXTRA_TECH_PRICE}/mo</p>
                </div>
              )}

              <div className="flex items-center justify-between text-lg">
                <p className="font-bold text-slate-900">Total</p>
                <p className="font-bold text-[#E8862A] text-2xl">${totalMonthly}/mo</p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Company</span><span className="font-medium">{form.companyName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Admin</span><span className="font-medium">{form.contactName || form.contactEmail}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium">{form.contactEmail}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-medium">{form.contactPhone || 'Not provided'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Total Licenses</span><span className="font-medium">1 Admin + {1 + extraTechs} Tech</span></div>
              </div>

              <button
                onClick={handlePurchase}
                disabled={isProcessing}
                className="w-full py-4 bg-[#F5A623] text-slate-900 rounded-xl font-bold text-lg hover:bg-[#F5A623] transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Creating your account...</>
                ) : (
                  <><CreditCard className="w-5 h-5" /> Activate Account &mdash; ${totalMonthly}/mo</>
                )}
              </button>

              <p className="text-xs text-slate-400 text-center">
                By continuing, you agree to the Wirez R Us Terms of Service. Need help?{' '}
                <a href="https://www.facebook.com/pennywiseitoz" target="_blank" rel="noopener noreferrer" className="text-[#E8862A] hover:underline">
                  Contact Penny Wise I.T
                </a>
              </p>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep('details')} className="text-sm text-slate-500 hover:text-slate-700">&larr; Back to details</button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 px-4 mt-16">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Wirez R Us" className="w-8 h-8 object-contain" />
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
